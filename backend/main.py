from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from api import student_routes

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan Context Manager für Startup/Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Knowledge Tracing System API...")
    
    # Hier kannst du das AKT Model laden
    # from services.akt_model_service import get_akt_service
    # akt_service = get_akt_service()  # Lädt Model einmal beim Start
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

# Create FastAPI App
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
    
    # Zähle Entitäten
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

# Debug Endpoint - zeigt alle registrierten Routes
@app.get("/debug/routes")
async def debug_routes():
    """Zeigt alle registrierten API Routes."""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": route.name
            })
    return {"total_routes": len(routes), "routes": sorted(routes, key=lambda x: x["path"])}

@app.get("/debug/database")
async def debug_database():
    """Debug-Endpoint zum Prüfen der Datenbankdaten."""
    from database.db_setup import SessionLocal
    from database import crud
    
    db = SessionLocal()
    
    # Teste get_class
    class_1 = crud.get_class(db, 1)
    
    # Teste get_student
    student_1 = crud.get_student(db, 1)
    
    # Teste get_students_by_class
    students_in_class_1 = crud.get_students_by_class(db, 1)
    
    result = {
        "class_1_exists": class_1 is not None,
        "class_1_data": {
            "id": class_1.id,
            "name": class_1.name,
            "teacher_id": class_1.teacher_id
        } if class_1 else None,
        "student_1_exists": student_1 is not None,
        "student_1_data": {
            "id": student_1.id,
            "name": f"{student_1.first_name} {student_1.last_name}",
            "class_id": student_1.class_id
        } if student_1 else None,
        "students_in_class_1": len(students_in_class_1),
        "students_list": [
            {"id": s.id, "name": f"{s.first_name} {s.last_name}"}
            for s in students_in_class_1
        ]
    }
    
    db.close()
    return result

# Include Routers
try:
    from api import student_routes
    app.include_router(student_routes.router, prefix="/api", tags=["students"])
    logger.info("Student routes loaded successfully")
except ImportError as e:
    logger.error(f"Could not load student routes: {e}")

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
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)