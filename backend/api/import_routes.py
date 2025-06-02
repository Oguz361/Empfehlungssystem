from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime
import logging
from database import crud
from database.models import Teacher
from api.auth_dependencies import get_db, get_current_teacher, verify_class_ownership
from schemas.interaction_schemas import InteractionCreate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["import"])

# Response Models
from pydantic import BaseModel

class ImportResult(BaseModel):
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[dict]
    warnings: List[str]
    processing_time_seconds: float

class CSVValidationError(BaseModel):
    row: int
    column: str
    value: str
    error: str

# Helper function to parse timestamp
def parse_timestamp(timestamp_str: str) -> datetime:
    """Parse verschiedene Timestamp-Formate."""
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%d.%m.%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(timestamp_str, fmt)
        except ValueError:
            continue
    
    raise ValueError(f"Konnte Timestamp '{timestamp_str}' nicht parsen")

@router.post("/interactions", response_model=ImportResult)
async def import_interactions(
    file: UploadFile = File(...),
    class_id: int = Form(...),
    student_id: Optional[int] = Form(None),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Importiert Schüler-Interaktionen aus einer CSV-Datei.
    
    CSV Format:
    - student_id (oder student_original_id)
    - problem_id (original ID aus dem Trainingsdatensatz)
    - skill_id (original ID aus dem Trainingsdatensatz)
    - correct (0 oder 1)
    - timestamp
    
    Args:
        file: CSV-Datei
        class_id: Klasse für die importiert werden soll
        student_id: Optional - spezifischer Schüler (überschreibt student_id in CSV)
    """
    
    # Verify class ownership
    await verify_class_ownership(class_id, current_teacher, db)
    
    # Check file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Nur CSV-Dateien werden unterstützt"
        )
    
    start_time = datetime.now()
    errors = []
    warnings = []
    successful_imports = 0
    
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        logger.info(f"CSV geladen: {len(df)} Zeilen, Spalten: {list(df.columns)}")
        
        # Validate required columns
        required_columns = {'problem_id', 'skill_id', 'correct', 'timestamp'}
        if student_id is None:
            required_columns.add('student_id')
        
        missing_columns = required_columns - set(df.columns)
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Fehlende Spalten: {missing_columns}"
            )
        
        # Clean data
        df = df.dropna(subset=list(required_columns))
        total_rows = len(df)
        
        # If specific student_id provided, verify they belong to the class
        if student_id:
            student = crud.get_student(db, student_id)
            if not student or student.class_id != class_id:
                raise HTTPException(
                    status_code=404,
                    detail="Schüler nicht in dieser Klasse gefunden"
                )
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                # Get student
                if student_id:
                    target_student_id = student_id
                else:
                    # Try to find student by ID in the class
                    student_id_from_csv = int(row['student_id'])
                    student = crud.get_student(db, student_id_from_csv)
                    
                    if not student or student.class_id != class_id:
                        errors.append({
                            "row": idx + 2,  # +2 wegen Header und 0-Index
                            "error": f"Schüler {student_id_from_csv} nicht in Klasse {class_id} gefunden"
                        })
                        continue
                    
                    target_student_id = student.id
                
                # Convert problem and skill IDs to strings
                problem_original_id = str(row['problem_id'])
                skill_original_id = str(row['skill_id'])
                
                # Find problem and skill in DB
                problem = crud.get_problem_by_original_id(db, problem_original_id)
                if not problem:
                    errors.append({
                        "row": idx + 2,
                        "error": f"Problem '{problem_original_id}' nicht in Datenbank gefunden"
                    })
                    continue
                
                skill = crud.get_skill_by_original_id(db, skill_original_id)
                if not skill:
                    errors.append({
                        "row": idx + 2,
                        "error": f"Skill '{skill_original_id}' nicht in Datenbank gefunden"
                    })
                    continue
                
                # Verify problem belongs to skill
                if problem.skill_id != skill.id:
                    warnings.append(
                        f"Zeile {idx + 2}: Problem {problem_original_id} gehört nicht zu Skill {skill_original_id}"
                    )
                
                # Parse timestamp
                try:
                    timestamp = parse_timestamp(str(row['timestamp']))
                except ValueError as e:
                    errors.append({
                        "row": idx + 2,
                        "error": f"Ungültiger Timestamp: {e}"
                    })
                    continue
                
                # Create interaction
                interaction = InteractionCreate(
                    problem_db_id=problem.id,
                    skill_db_id=skill.id,
                    is_correct=bool(int(row['correct'])),
                    timestamp=timestamp
                )
                
                # Check for duplicate
                existing = db.query(crud.models.Interaction).filter(
                    crud.models.Interaction.student_id == target_student_id,
                    crud.models.Interaction.problem_id == problem.id,
                    crud.models.Interaction.timestamp == timestamp
                ).first()
                
                if existing:
                    warnings.append(
                        f"Zeile {idx + 2}: Interaktion bereits vorhanden, übersprungen"
                    )
                    continue
                
                # Create interaction
                crud.create_interaction(db, interaction, target_student_id)
                successful_imports += 1
                
            except Exception as e:
                errors.append({
                    "row": idx + 2,
                    "error": str(e)
                })
                logger.error(f"Fehler bei Zeile {idx + 2}: {e}")
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Import abgeschlossen: {successful_imports}/{total_rows} erfolgreich")
        
        return ImportResult(
            total_rows=total_rows,
            successful_imports=successful_imports,
            failed_imports=len(errors),
            errors=errors,
            warnings=warnings,
            processing_time_seconds=processing_time
        )
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV-Datei ist leer")
    except Exception as e:
        logger.error(f"Import fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=f"Import fehlgeschlagen: {str(e)}")

@router.get("/template/interactions")
async def download_interaction_template(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Gibt eine CSV-Vorlage für den Interaction Import zurück.
    """
    
    template_data = {
        "student_id": [1, 1, 2, 2],
        "problem_id": ["64525", "64525", "70363", "70363"],
        "skill_id": ["Circle Graph", "Circle Graph", "Area Irregular Figure", "Area Irregular Figure"],
        "correct": [1, 0, 1, 1],
        "timestamp": [
            "2023-09-15 10:30:00",
            "2023-09-15 10:31:00", 
            "2023-09-15 10:32:00",
            "2023-09-15 10:33:00"
        ]
    }
    
    df = pd.DataFrame(template_data)
    
    # Return as CSV
    from fastapi.responses import StreamingResponse
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=interaction_import_template.csv"
        }
    )

@router.get("/preview-skills-problems")
async def preview_available_skills_and_problems(
    limit: int = 10,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Zeigt verfügbare Skills und Problems für den Import.
    Hilfreich um zu wissen, welche IDs in der CSV verwendet werden können.
    """
    
    skills = crud.get_skills(db, limit=limit)
    
    result = {
        "total_skills": db.query(crud.models.Skill).count(),
        "total_problems": db.query(crud.models.Problem).count(),
        "sample_skills": [
            {
                "original_skill_id": skill.original_skill_id,
                "name": skill.name,
                "internal_idx": skill.internal_idx
            }
            for skill in skills
        ],
        "sample_problems": []
    }
    
    # Get sample problems for first few skills
    for skill in skills[:3]:
        problems = crud.get_problems_by_skill_id(db, skill.id, limit=3)
        for problem in problems:
            result["sample_problems"].append({
                "original_problem_id": problem.original_problem_id,
                "skill_name": skill.name,
                "skill_original_id": skill.original_skill_id
            })
    
    return result