from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from fastapi.responses import JSONResponse
from api import student_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan Context Manager für Startup/Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting Knowledge Tracing System API...")
    
    # from services.akt_model_service import get_akt_service
    # akt_service = get_akt_service()  
    
    yield
    
    logger.info("Shutting down...")

app = FastAPI(
    title="Knowledge Tracing System API",
    description="Backend für AKT-basiertes Empfehlungssystem für Lehrkräfte",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite Dev Server
        "http://localhost:3000",  # Alternative
        "http://localhost:8080",  # Production
    ],
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
        # Test DB Connection
        db = SessionLocal()
        skills_count = len(crud.get_skills(db, limit=1))
        
        # Test Model Service (wenn implementiert)
        model_status = "not_loaded"
        # try:
        #     from services.akt_model_service import get_akt_service
        #     akt = get_akt_service()
        #     model_status = "ready"
        # except:
        #     model_status = "error"
        
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
    
    # Zählt Entitäten
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

# Include Routers 
# app.include_router(auth_routes.router, prefix="/api/auth", tags=["authentication"])
app.include_router(student_routes.router, prefix="/api/students", tags=["students"])
# app.include_router(skill_routes.router, prefix="/api/skills", tags=["skills"])
# app.include_router(recommendation_routes.router, prefix="/api/recommendations", tags=["recommendations"])

# Beispiel API Endpoints (entferne diese, wenn du echte Router hast)

@app.get("/api/skills")
async def get_skills(skip: int = 0, limit: int = 10):
    """Listet alle Skills auf."""
    from database.db_setup import SessionLocal
    from database import crud
    
    db = SessionLocal()
    skills = crud.get_skills(db, skip=skip, limit=limit)
    
    result = [
        {
            "id": skill.id,
            "internal_idx": skill.internal_idx,
            "name": skill.name,
            "original_skill_id": skill.original_skill_id
        }
        for skill in skills
    ]
    
    db.close()
    return result

@app.get("/api/students/{student_id}")
async def get_student(student_id: int):
    """Ruft einen Schüler ab."""
    from database.db_setup import SessionLocal
    from database import crud
    from fastapi import HTTPException
    
    db = SessionLocal()
    student = crud.get_student(db, student_id)
    
    if not student:
        db.close()
        raise HTTPException(status_code=404, detail="Student nicht gefunden")
    
    result = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "class_id": student.class_id,
        "created_at": student.created_at.isoformat() if student.created_at else None
    }
    
    db.close()
    return result

# Error Handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse( 
        status_code=404,
        content={"error": "Ressource nicht gefunden", "detail": str(exc)} 
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse( 
        status_code=500,
        content={"error": "Interner Serverfehler", "detail": str(exc)} 
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)