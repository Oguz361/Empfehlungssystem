from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database.db_setup import SessionLocal
from database import crud
import schemas

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Get all students in a class
@router.get("/classes/{class_id}/students", response_model=List[schemas.StudentRead])
async def get_students_in_class(
    class_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Listet alle Schüler einer Klasse auf."""
    class_obj = crud.get_class(db, class_id)
    if not class_obj:
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    
    if search:
        students = crud.search_students_in_class(db, class_id, search, skip, limit)
    else:
        students = crud.get_students_by_class(db, class_id, skip, limit)
    
    return students

# Get single student
@router.get("/students/{student_id}", response_model=schemas.StudentRead)
async def get_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Ruft einen einzelnen Schüler ab."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return student

# Create student
@router.post("/classes/{class_id}/students", response_model=schemas.StudentRead)
async def create_student(
    class_id: int,
    student: schemas.StudentCreate,
    db: Session = Depends(get_db)
):
    """Erstellt einen neuen Schüler in einer Klasse."""
    # Prüfe ob Klasse existiert
    class_obj = crud.get_class(db, class_id)
    if not class_obj:
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    
    return crud.create_student_in_class(db, student, class_id)

# Update student
@router.put("/students/{student_id}", response_model=schemas.StudentRead)
async def update_student(
    student_id: int,
    student_update: schemas.StudentCreate,
    db: Session = Depends(get_db)
):
    """Aktualisiert einen Schüler."""
    updated_student = crud.update_student(db, student_id, student_update)
    if not updated_student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return updated_student

# Delete student
@router.delete("/students/{student_id}")
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Löscht einen Schüler."""
    deleted = crud.delete_student(db, student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return {"message": "Schüler erfolgreich gelöscht"}

# Get student interactions
@router.get("/students/{student_id}/interactions")
async def get_student_interactions(
    student_id: int,
    limit: Optional[int] = Query(100, ge=1, le=1000),
    skill_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Ruft die Interaktionen eines Schülers ab."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    
    interactions = crud.get_student_interactions(
        db, 
        student_id, 
        limit=limit,
        skill_id=skill_id
    )
    
    # Formatiere für API Response
    result = []
    for interaction in interactions:
        result.append({
            "id": interaction.id,
            "timestamp": interaction.timestamp.isoformat(),
            "problem": {
                "id": interaction.problem.id,
                "original_id": interaction.problem.original_problem_id,
                "description": interaction.problem.description_placeholder
            },
            "skill": {
                "id": interaction.skill.id,
                "name": interaction.skill.name
            },
            "is_correct": interaction.is_correct
        })
    
    return {
        "student_id": student_id,
        "total_interactions": len(result),
        "interactions": result
    }

# Get student statistics
@router.get("/students/{student_id}/statistics")
async def get_student_statistics(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Berechnet Statistiken für einen Schüler."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    
    stats = crud.get_student_statistics(db, student_id)
    
    return {
        "student_id": student_id,
        "name": f"{student.first_name} {student.last_name}",
        "statistics": stats
    }