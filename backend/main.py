from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from services.akt_model_service import get_akt_service
from api import import_routes, teacher_class_routes, recommendation_routes, auth_routes, student_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan Context Manager für Startup/Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    
    logger.info("Starting Knowledge Tracing System API...")
    
    try:
        logger.info("Loading AKT Model Service...")
        akt_service = get_akt_service()  
        logger.info("✅ AKT Model Service loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load AKT Model Service: {e}")
        logger.warning("Recommendation endpoints will not work!")
    
    yield
    
    logger.info("Shutting down...")

app = FastAPI(
    title="Knowledge Tracing System API",
    description="Backend für AKT-basiertes Empfehlungssystem für Lehrkräfte",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
from config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Endpoint
@app.get("/")
async def root():
    return {
        "message": "Knowledge Tracing System API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "api": "/api/*"
        }
    }

# Health Check
@app.get("/health")
async def health_check():
    from database.db_setup import SessionLocal
    from database import crud
    
    try:
        db = SessionLocal()
        skills_count = len(crud.get_skills(db, limit=1))
        
        # Test Model Service
        model_status = "not_loaded"
        try:
            from services.akt_model_service import get_akt_service
            akt = get_akt_service()
            model_status = "ready"
        except:
            model_status = "error"
        
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "model": model_status,
            "skills_in_db": skills_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# API Stats
@app.get("/api/stats")
async def get_system_stats():
    from database.db_setup import SessionLocal
    from database import crud
    from sqlalchemy import func
    
    db = SessionLocal()
    
    stats = {
        "skills": db.query(func.count(crud.models.Skill.id)).scalar(),
        "problems": db.query(func.count(crud.models.Problem.id)).scalar(),
        "students": db.query(func.count(crud.models.Student.id)).scalar(),
        "teachers": db.query(func.count(crud.models.Teacher.id)).scalar(),
        "classes": db.query(func.count(crud.models.Class.id)).scalar(),
        "interactions": db.query(func.count(crud.models.Interaction.id)).scalar(),
    }
    
    db.close()
    
    return stats

# Auth Routes (ungeschützt)
try:
    app.include_router(auth_routes.router, prefix="/api/auth", tags=["authentication"])
    logger.info("Auth routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load auth routes: {e}")

# Student Routes (geschützt)
try:
    app.include_router(student_routes.router, prefix="/api", tags=["students"])
    logger.info("Student routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load student routes: {e}")

# Recommendation Routes (geschützt)
try:
    app.include_router(recommendation_routes.router, prefix="/api/recommendations", tags=["recommendations"])
    logger.info("Recommendation routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load recommendation routes: {e}")

# Teacher & Class Management Routes (geschützt)
try:
    app.include_router(teacher_class_routes.router, prefix="/api", tags=["teacher", "classes"])
    logger.info("Teacher & Class management routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load teacher/class routes: {e}")

# Import Routes (geschützt)
try:
    app.include_router(import_routes.router, prefix="/api/import", tags=["import"])
    logger.info("Import routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load import routes: {e}")

# Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path),
            "method": request.method
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint nicht gefunden",
            "path": str(request.url.path),
            "method": request.method,
            "detail": "Der angeforderte Endpoint existiert nicht"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)