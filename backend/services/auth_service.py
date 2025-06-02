from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Service für Authentication und JWT Token Management."""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Erstellt einen JWT Access Token.
        
        Args:
            data: Dictionary mit Daten die im Token gespeichert werden
            expires_delta: Optionale Gültigkeitsdauer
            
        Returns:
            Encoded JWT Token als String
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.secret_key, 
            algorithm=settings.algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """
        Verifiziert und dekodiert einen JWT Token.
        
        Args:
            token: JWT Token String
            
        Returns:
            Dekodierte Token Daten oder None bei Fehler
        """
        try:
            payload = jwt.decode(
                token, 
                settings.secret_key, 
                algorithms=[settings.algorithm]
            )
            return payload
        except JWTError as e:
            logger.warning(f"JWT Verification failed: {e}")
            return None
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifiziert ein Passwort gegen seinen Hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Erstellt einen Passwort Hash."""
        return pwd_context.hash(password)

# Singleton Instance
auth_service = AuthService()