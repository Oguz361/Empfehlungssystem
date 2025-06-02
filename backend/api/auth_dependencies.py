from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from database.db_setup import SessionLocal
from database import crud
from database.models import Teacher
from services.auth_service import auth_service
import logging

logger = logging.getLogger(__name__)

# Bearer Token Schema
security = HTTPBearer()

def get_db():
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Teacher:
    """
    Dependency die den aktuellen authentifizierten Teacher zurückgibt.
    
    Raises:
        HTTPException: 401 wenn Token ungültig oder Teacher nicht gefunden
    """
    token = credentials.credentials
    
    # Verifiziere Token
    payload = auth_service.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ist ungültig oder abgelaufen",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extrahiere Teacher ID
    teacher_id = payload.get("sub")
    if teacher_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token enthält keine gültige Teacher ID",
        )
    
    # Hole Teacher aus DB
    teacher = crud.get_teacher(db, int(teacher_id))
    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher nicht gefunden",
        )
    
    return teacher

async def get_current_teacher_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[Teacher]:
    """
    Optionale Authentifizierung - gibt None zurück wenn kein Token vorhanden.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_teacher(credentials, db)
    except HTTPException:
        return None

class TeacherChecker:
    """
    Dependency Klasse um zu prüfen ob Teacher Zugriff auf bestimmte Ressourcen hat.
    """
    
    def __init__(self, allow_own_resources_only: bool = True):
        self.allow_own_resources_only = allow_own_resources_only
    
    async def __call__(
        self,
        teacher: Teacher = Depends(get_current_teacher),
        db: Session = Depends(get_db)
    ) -> Teacher:
        """
        Kann erweitert werden um spezifische Berechtigungen zu prüfen.
        """
        # Hier könnten weitere Checks implementiert werden
        # z.B. Admin-Rechte, Zugriff auf spezifische Klassen etc.
        return teacher

# Vordefinierte Checker
require_teacher = TeacherChecker(allow_own_resources_only=True)

async def verify_class_ownership(
    class_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
) -> bool:
    """
    Prüft ob der Teacher Eigentümer der Klasse ist.
    
    Raises:
        HTTPException: 403 wenn Teacher nicht der Eigentümer ist
    """
    class_obj = crud.get_class(db, class_id)
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Klasse nicht gefunden"
        )
    
    if class_obj.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keine Berechtigung für diese Klasse"
        )
    
    return True

# Utility function um Student-Zugriff zu prüfen
async def verify_student_access(
    student_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
) -> bool:
    """
    Prüft ob Teacher Zugriff auf einen Schüler hat (über die Klasse).
    """
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schüler nicht gefunden"
        )
    
    # Prüfe ob die Klasse des Schülers dem Teacher gehört
    class_obj = crud.get_class(db, student.class_id)
    if not class_obj or class_obj.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keine Berechtigung für diesen Schüler"
        )
    
    return True