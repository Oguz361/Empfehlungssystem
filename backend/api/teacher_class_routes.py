from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import crud
from database.models import Teacher
from api.auth_dependencies import get_db, get_current_teacher, verify_class_ownership
from schemas.class_schemas import ClassRead, ClassCreate
from schemas.teacher_schemas import TeacherRead
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/classes", response_model=List[ClassRead])
async def get_my_classes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Listet alle Klassen des aktuellen Teachers auf.
    """
    classes = crud.get_classes_by_teacher(
        db, 
        teacher_id=current_teacher.id, 
        skip=skip, 
        limit=limit
    )
    return classes

@router.get("/classes/{class_id}", response_model=ClassRead)
async def get_class_details(
    class_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_class_ownership)
):
    """
    Ruft Details einer spezifischen Klasse ab.
    Nur der Eigentümer kann darauf zugreifen.
    """
    class_obj = crud.get_class(db, class_id)
    return class_obj

@router.post("/classes", response_model=ClassRead)
async def create_class(
    class_data: ClassCreate,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Erstellt eine neue Klasse für den aktuellen Teacher.
    """
    new_class = crud.create_class_for_teacher(
        db, 
        class_data, 
        teacher_id=current_teacher.id
    )
    
    logger.info(f"Teacher {current_teacher.username} created class: {new_class.name}")
    
    return new_class

@router.put("/classes/{class_id}", response_model=ClassRead)
async def update_class(
    class_id: int,
    class_update: ClassCreate,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_class_ownership)
):
    """
    Aktualisiert eine Klasse.
    """
    updated_class = crud.update_class(db, class_id, class_update)
    if not updated_class:
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    
    logger.info(f"Teacher {current_teacher.username} updated class: {updated_class.name}")
    
    return updated_class

@router.delete("/classes/{class_id}")
async def delete_class(
    class_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_class_ownership)
):
    """
    Löscht eine Klasse (nur wenn keine Schüler vorhanden).
    """
    try:
        deleted_class = crud.delete_class(db, class_id)
        if not deleted_class:
            raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
        
        logger.info(f"Teacher {current_teacher.username} deleted class: {deleted_class.name}")
        
        return {"message": f"Klasse '{deleted_class.name}' erfolgreich gelöscht"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/teacher/profile", response_model=TeacherRead)
async def get_teacher_profile(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Gibt das Profil des aktuellen Teachers zurück.
    """
    return current_teacher

@router.get("/teacher/statistics")
async def get_teacher_statistics(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Gibt Statistiken über alle Klassen und Schüler des Teachers zurück.
    """
    from sqlalchemy import func
    
    # Anzahl Klassen
    class_count = db.query(func.count(crud.models.Class.id))\
        .filter(crud.models.Class.teacher_id == current_teacher.id).scalar()
    
    # Anzahl Schüler (über alle Klassen)
    student_count = db.query(func.count(crud.models.Student.id))\
        .join(crud.models.Class)\
        .filter(crud.models.Class.teacher_id == current_teacher.id)\
        .filter(crud.models.Student.is_deleted == False).scalar()
    
    # Gesamte Interaktionen
    interaction_count = db.query(func.count(crud.models.Interaction.id))\
        .join(crud.models.Student)\
        .join(crud.models.Class)\
        .filter(crud.models.Class.teacher_id == current_teacher.id).scalar()
    
    # Letzte Aktivität
    last_interaction = db.query(func.max(crud.models.Interaction.timestamp))\
        .join(crud.models.Student)\
        .join(crud.models.Class)\
        .filter(crud.models.Class.teacher_id == current_teacher.id).scalar()
    
    return {
        "teacher_id": current_teacher.id,
        "username": current_teacher.username,
        "statistics": {
            "total_classes": class_count,
            "total_students": student_count,
            "total_interactions": interaction_count,
            "last_activity": last_interaction.isoformat() if last_interaction else None,
            "member_since": current_teacher.created_at.isoformat()
        }
    }