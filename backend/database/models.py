from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func 

from .db_setup import Base 

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    classes = relationship("Class", back_populates="teacher")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False) 
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    teacher = relationship("Teacher", back_populates="classes")
    students = relationship("Student", back_populates="class_") 

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    last_interaction_update_timestamp = Column(DateTime(timezone=True), nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    class_ = relationship("Class", back_populates="students") 
    interactions = relationship("Interaction", back_populates="student")
    recommendation_reports = relationship("RecommendationReport", back_populates="student")

class Skill(Base): 
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True) 
    internal_idx = Column(Integer, unique=True, nullable=False, index=True) 
    original_skill_id = Column(String, nullable=False, index=True) 
    name = Column(String, nullable=False, unique=True)
    problems = relationship("Problem", back_populates="skill")
    probe_questions = relationship("ProbeQuestionEntry", back_populates="skill")
    interactions = relationship("Interaction", back_populates="skill")


class Problem(Base): 
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True) 
    internal_idx = Column(Integer, unique=True, nullable=False, index=True) 
    original_problem_id = Column(String, nullable=False, unique=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    difficulty_mu_q = Column(Float, nullable=True) 
    description_placeholder = Column(String, nullable=False)
    skill = relationship("Skill", back_populates="problems")
    interactions = relationship("Interaction", back_populates="problem")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False) 
    is_correct = Column(Boolean, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    student = relationship("Student", back_populates="interactions")
    problem = relationship("Problem", back_populates="interactions")
    skill = relationship("Skill", back_populates="interactions")


class ProbeQuestionEntry(Base):
    __tablename__ = "probe_question_entries"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    skill = relationship("Skill", back_populates="probe_questions")
    problem = relationship("Problem") 

class RecommendationReport(Base):
    __tablename__ = "recommendation_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    creation_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    content_json = Column(Text, nullable=False) 
    teacher_comment = Column(Text, nullable=True) 
    student = relationship("Student", back_populates="recommendation_reports")
