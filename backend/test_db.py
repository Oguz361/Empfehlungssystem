# test_db.py
from database.db_setup import SessionLocal
from database import crud

db = SessionLocal()

# Teste Skills
skills = crud.get_skills(db, limit=5)
print(f"Skills in DB: {len(skills)}")
for skill in skills[:5]:
    print(f"  - {skill.name} (idx: {skill.internal_idx})")

# Teste Problems
problems = crud.get_problems_by_skill_id(db, skill_id=1, limit=5)
print(f"\nProblems für Skill 1: {len(problems)}")

# Teste Demo-Daten
teacher = crud.get_teacher_by_username(db, "demo_teacher")
print(f"\nDemo Teacher: {teacher.username if teacher else 'Nicht gefunden'}")

db.close()