from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from database import crud
from services.auth_service import auth_service
from config import settings
from api.auth_dependencies import get_db, get_current_teacher
from schemas.teacher_schemas import TeacherRead
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["authentication"])

# Request/Response Models
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    teacher: TeacherRead

class TokenVerifyResponse(BaseModel):
    valid: bool
    teacher: Optional[TeacherRead] = None

# Login Endpoint
@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authentifiziert einen Teacher und gibt einen JWT Token zurück.
    """
    # Suche Teacher
    teacher = crud.get_teacher_by_username(db, login_data.username)
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verifiziere Passwort
    if not auth_service.verify_password(login_data.password, teacher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Erstelle Token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth_service.create_access_token(
        data={
            "sub": str(teacher.id),
            "username": teacher.username
        },
        expires_delta=access_token_expires
    )
    
    logger.info(f"Teacher {teacher.username} logged in successfully")
    
    return LoginResponse(
        access_token=access_token,
        teacher=TeacherRead.from_orm(teacher)
    )

# Verify Token / Get Current User
@router.get("/me", response_model=TeacherRead)
async def get_current_user(
    current_teacher: crud.models.Teacher = Depends(get_current_teacher)
):
    """
    Gibt den aktuell authentifizierten Teacher zurück.
    """
    return current_teacher

# Verify Token Endpoint
@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_token(
    current_teacher: Optional[crud.models.Teacher] = Depends(get_current_teacher)
):
    """
    Verifiziert ob der Token gültig ist.
    """
    if current_teacher:
        return TokenVerifyResponse(
            valid=True,
            teacher=TeacherRead.from_orm(current_teacher)
        )
    
    return TokenVerifyResponse(valid=False)

# Logout (Optional - bei JWT meist clientseitig)
@router.post("/logout")
async def logout(
    current_teacher: crud.models.Teacher = Depends(get_current_teacher)
):
    """
    Logout - Bei JWT wird der Token clientseitig gelöscht.
    Server-seitig könnten wir eine Blacklist führen (optional).
    """
    logger.info(f"Teacher {current_teacher.username} logged out")
    
    return {
        "message": "Erfolgreich ausgeloggt",
        "detail": "Bitte löschen Sie den Token auf Client-Seite"
    }

# Change Password (Optional)
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_teacher: crud.models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Ändert das Passwort des aktuellen Teachers.
    """
    # Verifiziere aktuelles Passwort
    if not auth_service.verify_password(
        password_data.current_password, 
        current_teacher.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktuelles Passwort ist falsch"
        )
    
    # Update Passwort
    new_hash = auth_service.get_password_hash(password_data.new_password)
    current_teacher.hashed_password = new_hash
    db.commit()
    
    logger.info(f"Teacher {current_teacher.username} changed password")
    
    return {"message": "Passwort erfolgreich geändert"}