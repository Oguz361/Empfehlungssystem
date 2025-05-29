from sqlalchemy.orm import Session
from sqlalchemy import desc 
from typing import List, Optional, Dict, Any 
from datetime import datetime 
from . import models
from passlib.context import CryptContext
import schemas
from schemas.teacher_schemas import TeacherCreate
from schemas.class_schemas import ClassCreate
from schemas.student_schemas import StudentCreate
from schemas.skill_schemas import SkillCreate
from schemas.problem_schemas import ProblemCreate
from schemas.interaction_schemas import InteractionCreate, InteractionCSVRow
from schemas.probe_question_schemas import ProbeQuestionEntryCreate
from schemas.report_schemas import RecommendationReportCreate, ReportCommentCreate

# Passwort-Hashing-Kontext für Teacher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# CRUD Operationen für Teacher
def get_teacher(db: Session, teacher_id: int) -> Optional[models.Teacher]:
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()

def get_teacher_by_username(db: Session, username: str) -> Optional[models.Teacher]:
    return db.query(models.Teacher).filter(models.Teacher.username == username).first()

def get_teachers(db: Session, skip: int = 0, limit: int = 100) -> List[models.Teacher]:
    return db.query(models.Teacher).offset(skip).limit(limit).all()

def create_teacher(db: Session, teacher: schemas.TeacherCreate) -> models.Teacher:
    hashed_password = get_password_hash(teacher.password)
    db_teacher = models.Teacher(username=teacher.username, hashed_password=hashed_password)
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

# CRUD Operationen für Class
def get_class(db: Session, class_id: int) -> Optional[models.Class]:
    return db.query(models.Class).filter(models.Class.id == class_id).first()

def get_classes_by_teacher(db: Session, teacher_id: int, skip: int = 0, limit: int = 100) -> List[models.Class]:
    return db.query(models.Class).filter(models.Class.teacher_id == teacher_id).offset(skip).limit(limit).all()

def create_class_for_teacher(db: Session, class_data: schemas.ClassCreate, teacher_id: int) -> models.Class:
    db_class = models.Class(**class_data.model_dump(), teacher_id=teacher_id)
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_class(db: Session, class_id: int, class_update_data: schemas.ClassCreate) -> Optional[models.Class]:
    db_class = get_class(db, class_id)
    if db_class:
        db_class.name = class_update_data.name
        db_class.description = class_update_data.description
        db.commit()
        db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int) -> Optional[models.Class]:
    db_class = get_class(db, class_id)
    if not db_class:
        return None
    
    student_count = db.query(models.Student).filter(models.Student.class_id == class_id).count()
    if student_count > 0:
        raise ValueError(f"Klasse kann nicht gelöscht werden. Bitte erst die {student_count} löschen.")
    
    db.delete(db_class)
    db.commit()
    return db_class

# CRUD Operationen für Student
def get_student(db: Session, student_id: int) -> Optional[models.Student]:
    return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_students_by_class(db: Session, class_id: int, skip: int = 0, limit: int = 100) -> List[models.Student]:
    query = db.query(models.Student).filter(models.Student.class_id == class_id)
    
    # Wenn is_deleted existiert filtert gelöschte Schüler aus
    if hasattr(models.Student, 'is_deleted'):
        query = query.filter(models.Student.is_deleted == False)
    
    return query.offset(skip).limit(limit).all()

def search_students_in_class(db: Session, class_id: int, query: str, skip: int = 0, limit: int = 100) -> List[models.Student]:
    search_query = f"%{query}%"
    return db.query(models.Student).filter(
        models.Student.class_id == class_id,
        (models.Student.first_name.ilike(search_query) | models.Student.last_name.ilike(search_query))
    ).offset(skip).limit(limit).all()

def create_student_in_class(db: Session, student: schemas.StudentCreate, class_id: int) -> models.Student:
    db_student = models.Student(**student.model_dump(), class_id=class_id, last_interaction_update_timestamp=datetime.utcnow())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def update_student(db: Session, student_id: int, student_update_data: schemas.StudentCreate) -> Optional[models.Student]:
    db_student = get_student(db, student_id)
    if db_student:
        db_student.first_name = student_update_data.first_name
        db_student.last_name = student_update_data.last_name
        db.commit()
        db.refresh(db_student)
    return db_student
    
def update_student_last_interaction_timestamp(db: Session, student_id: int, timestamp: datetime = None) -> Optional[models.Student]:
    db_student = get_student(db, student_id)
    if db_student:
        db_student.last_interaction_update_timestamp = timestamp if timestamp else datetime.utcnow()
        db.commit()
        db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: int) -> Optional[models.Student]:
    db_student = get_student(db, student_id)
    if db_student:
        db_student.is_deleted = True
        db_student.deleted_at = datetime.utcnow()
        db.commit()
        db.refresh(db_student)
    return db_student

# CRUD Operationen für Skill
def get_skill(db: Session, skill_id: int) -> Optional[models.Skill]: 
    return db.query(models.Skill).filter(models.Skill.id == skill_id).first()

def get_skill_by_internal_idx(db: Session, internal_idx: int) -> Optional[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.internal_idx == internal_idx).first()

def get_skill_by_name(db: Session, name: str) -> Optional[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.name == name).first()

def get_skill_by_original_id(db: Session, original_skill_id: str) -> Optional[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.original_skill_id == original_skill_id).first()

def get_skills(db: Session, skip: int = 0, limit: int = 102) -> List[models.Skill]: 
    return db.query(models.Skill).offset(skip).limit(limit).all()

def create_skill(db: Session, skill: schemas.SkillCreate) -> models.Skill:
    db_skill = models.Skill(
        internal_idx=skill.internal_idx,
        original_skill_id=skill.original_skill_id,
        name=skill.name
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

# CRUD Operationen für Problem
def get_problem(db: Session, problem_id: int) -> Optional[models.Problem]: 
    return db.query(models.Problem).filter(models.Problem.id == problem_id).first()

def get_problem_by_internal_idx(db: Session, internal_idx: int) -> Optional[models.Problem]:
    return db.query(models.Problem).filter(models.Problem.internal_idx == internal_idx).first()

def get_problem_by_original_id(db: Session, original_problem_id: str) -> Optional[models.Problem]:
    return db.query(models.Problem).filter(models.Problem.original_problem_id == original_problem_id).first()

def get_problems_by_skill_id(db: Session, skill_id: int, skip: int = 0, limit: int = 100) -> List[models.Problem]:
    return db.query(models.Problem).filter(models.Problem.skill_id == skill_id).offset(skip).limit(limit).all()

def get_problems_by_skill_internal_idx(db: Session, skill_internal_idx: int, skip: int = 0, limit: int = 3200) -> List[models.Problem]:
    skill = get_skill_by_internal_idx(db, internal_idx=skill_internal_idx)
    if not skill:
        return []
    return db.query(models.Problem).filter(models.Problem.skill_id == skill.id).offset(skip).limit(limit).all()

def create_problem(db: Session, problem: schemas.ProblemCreate) -> models.Problem:
    db_skill = get_skill_by_internal_idx(db, internal_idx=problem.skill_internal_idx)
    if not db_skill:
        raise ValueError(f"Skill mit internal_idx {problem.skill_internal_idx} nicht gefunden")
    
    db_problem = models.Problem(
        internal_idx=problem.internal_idx,
        original_problem_id=problem.original_problem_id,
        description_placeholder=problem.description_placeholder,
        skill_id=db_skill.id,
        difficulty_mu_q=problem.difficulty_mu_q 
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    return db_problem

def update_problem_mu_q(db: Session, problem_internal_idx: int, mu_q: float) -> Optional[models.Problem]:
    db_problem = get_problem_by_internal_idx(db, internal_idx=problem_internal_idx)
    if db_problem:
        db_problem.difficulty_mu_q = mu_q
        db.commit()
        db.refresh(db_problem)
    return db_problem

# CRUD Operationen für Interaction
def get_interaction(db: Session, interaction_id: int) -> Optional[models.Interaction]:
    return db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()

def get_student_interactions(db: Session, student_id: int, limit: Optional[int] = None, sort_desc: bool = True, end_date: Optional[datetime] = None) -> List[models.Interaction]:
    query = db.query(models.Interaction).filter(models.Interaction.student_id == student_id)
    if end_date:
        query = query.filter(models.Interaction.timestamp <= end_date)
    if sort_desc:
        query = query.order_by(desc(models.Interaction.timestamp))
    if limit:
        query = query.limit(limit)
    return query.all()

def create_interaction(db: Session, interaction: schemas.InteractionCreate, student_id: int) -> models.Interaction:
    db_problem = get_problem(db, interaction.problem_db_id)
    if not db_problem:
        raise ValueError(f"Problem mit ID {interaction.problem_db_id} nicht gefunden")
    
    if db_problem.skill_id != interaction.skill_db_id:
        raise ValueError(f"Problem {interaction.problem_db_id} gehört nicht zu Skill {interaction.skill_db_id}")
    
    db_interaction = models.Interaction(
        student_id=student_id,
        problem_id=interaction.problem_db_id,
        skill_id=interaction.skill_db_id,
        is_correct=interaction.is_correct,
        timestamp=interaction.timestamp
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    update_student_last_interaction_timestamp(db, student_id=student_id, timestamp=interaction.timestamp)
    return db_interaction

def create_interaction_from_csv(db: Session, csv_row: schemas.InteractionCSVRow, student_id: int) -> Optional[models.Interaction]:
    """Helper-Funktion für CSV-Import - konvertiert Original-IDs zu DB-IDs"""
    # Finde Problem
    db_problem = get_problem_by_original_id(db, csv_row.problem_original_id)
    if not db_problem:
        return None
    
    # Finde Skill
    db_skill = get_skill_by_original_id(db, csv_row.skill_original_id)
    if not db_skill:
        return None
    
    # Erstelle InteractionCreate Schema
    interaction_data = schemas.InteractionCreate(
        problem_db_id=db_problem.id,
        skill_db_id=db_skill.id,
        is_correct=csv_row.is_correct,
        timestamp=csv_row.timestamp
    )
    
    try:
        return create_interaction(db, interaction_data, student_id)
    except ValueError:
        return None

# CRUD Operationen für ProbeQuestionEntry
def get_probe_question_entry(db: Session, entry_id: int) -> Optional[models.ProbeQuestionEntry]:
    return db.query(models.ProbeQuestionEntry).filter(models.ProbeQuestionEntry.id == entry_id).first()

def get_probe_questions_for_skill_db_id(db: Session, skill_db_id: int) -> List[models.Problem]:
    # Gibt eine Liste von Problem-Objekten zurück, die als Probe Questions für einen Skill dienen
    return db.query(models.Problem)\
        .join(models.ProbeQuestionEntry)\
        .filter(models.ProbeQuestionEntry.skill_id == skill_db_id)\
        .all()

def add_probe_question_to_skill(db: Session, probe_entry: schemas.ProbeQuestionEntryCreate) -> models.ProbeQuestionEntry:
    db_probe_entry = models.ProbeQuestionEntry(
        skill_id=probe_entry.skill_db_id,
        problem_id=probe_entry.problem_db_id
    )
    db.add(db_probe_entry)
    db.commit()
    db.refresh(db_probe_entry)
    return db_probe_entry

# CRUD Operationen für RecommendationReport
def get_report(db: Session, report_id: int) -> Optional[models.RecommendationReport]:
    return db.query(models.RecommendationReport).filter(models.RecommendationReport.id == report_id).first()

def get_reports_by_student(db: Session, student_id: int, skip: int = 0, limit: int = 10) -> List[models.RecommendationReport]:
    return db.query(models.RecommendationReport).filter(
        models.RecommendationReport.student_id == student_id
    ).order_by(desc(models.RecommendationReport.creation_timestamp)).offset(skip).limit(limit).all()

def create_report(db: Session, report_data: schemas.RecommendationReportCreate, student_id: int) -> models.RecommendationReport:
    db_report = models.RecommendationReport(
        student_id=student_id,
        content_json=report_data.content_json,  
        teacher_comment=report_data.teacher_comment,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def update_report_comment(db: Session, report_id: int, comment_data: schemas.ReportCommentCreate) -> Optional[models.RecommendationReport]:
    db_report = get_report(db, report_id)
    if db_report:
        db_report.teacher_comment = comment_data.teacher_comment
        db.commit()
        db.refresh(db_report)
    return db_report

def delete_report(db: Session, report_id: int) -> Optional[models.RecommendationReport]:
    db_report = get_report(db, report_id)
    if db_report:
        db.delete(db_report)
        db.commit()
    return db_report

# Platzhalter für Student Statistics
def get_student_statistics(db: Session, student_id: int) -> Dict[str, Any]:
    """
    Platzhalter-Funktion für Schülerstatistiken.
    Gibt derzeit ein leeres Dictionary zurück.
    Die Logik fehlt noch.
    """
    student = get_student(db, student_id)
    if not student:
        return {"error": "Student not found for statistics"}

    # Vorerst leeres Dictionary zurückgeben
    return {
        # beispiel ...
        "total_interactions": 0,
        "correct_interactions": 0,
        "incorrect_interactions": 0,
        "mastered_skills_count": 0,
        "recent_activity_level": "unknown"
    }