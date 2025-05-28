import json
import pandas as pd
from database.db_setup import SessionLocal
from database import crud
from datetime import datetime
import schemas

# Initialisiert die Datenbank mit den korrektn AKT Mappings und Problem Skill Zuordnungen
def init_database_with_akt_data():
    
    db = SessionLocal()
    
    # Laden der Mappings
    print("Lade AKT Mappings...")
    with open('akt_model_mappings.json', 'r', encoding='utf-8') as f:
        mappings = json.load(f)
    
    skill_to_idx = mappings["skill_to_idx"]
    problem_to_idx = mappings["problem_to_idx"]
    
    print("Lade Original-Daten für Problem-Skill Zuordnungen...")
    csv_path = "C:/Users/oguzk/Desktop/Bachelorarbeit/Datensatz/assistments2017.csv"
    df = pd.read_csv(csv_path, encoding='latin1', low_memory=False)
    
    if 'studentId' in df.columns:
        df.rename(columns={
            'studentId': 'user_id',
            'problemId': 'problem_id', 
            'skill': 'skill_id',
            'correct': 'correct'
        }, inplace=True)
    
    df = df.dropna(subset=['problem_id', 'skill_id'])
    
    # Findet Problem Skill Zuordnungen (ein Problem -> ein Skill)
    problem_skill_map = {}
    for _, row in df.iterrows():
        problem_id = str(row['problem_id'])
        skill_id = row['skill_id']
        
        # Nimmt die erste gefundene Zuordnung 
        if problem_id not in problem_skill_map:
            problem_skill_map[problem_id] = skill_id
    
    print(f"Gefunden: {len(problem_skill_map)} Problem-Skill Zuordnungen")
    
    # Erstellt Skills in der DB
    print(f"\nErstelle {len(skill_to_idx)} Skills...")
    skill_db_id_map = {}  # skill_name -> db_id für spätere Referenz
    
    for skill_name, train_idx in sorted(skill_to_idx.items(), key=lambda x: x[1]):
        skill = schemas.SkillCreate(
            internal_idx=train_idx - 1,  # Training startet bei 1, DB bei 0
            original_skill_id=skill_name,
            name=skill_name
        )
        try:
            db_skill = crud.create_skill(db, skill)
            skill_db_id_map[skill_name] = db_skill.id
            if train_idx <= 5:  # Zeigt ersten 5
                print(f"  ✓ Skill '{skill_name}' (internal_idx={train_idx-1})")
        except Exception as e:
            print(f"  ✗ Skill {skill_name}: {e}")
    
    print(f"✓ {len(skill_db_id_map)} Skills erstellt")
    
    # Erstellt Problems mit korrekten Skill-Zuordnungen
    print(f"\nErstelle {len(problem_to_idx)} Problems...")
    problems_created = 0
    problems_skipped = 0
    
    for problem_id_str, train_idx in sorted(problem_to_idx.items(), key=lambda x: x[1]):
        # Findet zugehörigen Skill
        if problem_id_str not in problem_skill_map:
            problems_skipped += 1
            continue
        
        skill_name = problem_skill_map[problem_id_str]
        if skill_name not in skill_to_idx:
            problems_skipped += 1
            continue
        
        skill_internal_idx = skill_to_idx[skill_name] - 1  
        
        problem = schemas.ProblemCreate(
            internal_idx=train_idx - 1, 
            original_problem_id=problem_id_str,
            skill_internal_idx=skill_internal_idx,
            description_placeholder=f"Problem {problem_id_str}"
        )
        
        try:
            crud.create_problem(db, problem)
            problems_created += 1
            
            if problems_created <= 5:  # Zeig erste 5
                print(f"  ✓ Problem '{problem_id_str}' → Skill '{skill_name}'")
                
            if problems_created % 500 == 0:
                print(f"  ... {problems_created} Problems erstellt")
                
        except Exception as e:
            print(f"  ✗ Problem {problem_id_str}: {e}")
            problems_skipped += 1
    
    print(f"✓ {problems_created} Problems erstellt, {problems_skipped} übersprungen")
    
    # Demo Daten
    print("\nErstelle Demo-Daten...")
    
    # Demo Teacher
    teacher = schemas.TeacherCreate(
        username="demo_teacher",
        password="demo123"
    )
    db_teacher = crud.create_teacher(db, teacher)
    print(f"✓ Demo-Lehrer erstellt")
    
    # Demo Class
    demo_class = schemas.ClassCreate(
        name="Demo Klasse",
        description="Testklasse für AKT System"
    )
    db_class = crud.create_class_for_teacher(db, demo_class, db_teacher.id)
    print(f"✓ Demo-Klasse erstellt")
    
    # Demo Students
    demo_students = []
    for i in range(3):
        student = schemas.StudentCreate(
            first_name=f"Test",
            last_name=f"Schüler{i+1}"
        )
        db_student = crud.create_student_in_class(db, student, db_class.id)
        demo_students.append(db_student)
    print(f"✓ {len(demo_students)} Demo-Schüler erstellt")
    
    db.commit()
    db.close()
    
    print("\n Datenbank erfolgreich initialisiert!")
    print(f"   - Skills: {len(skill_db_id_map)}")
    print(f"   - Problems: {problems_created}")
    print(f"   - Demo-Daten erstellt")
    
    # Speichert Statistiken
    stats = {
        "initialization_date": str(datetime.now()),
        "skills_created": len(skill_db_id_map),
        "problems_created": problems_created,
        "problems_skipped": problems_skipped,
        "mappings_file": "akt_model_mappings.json"
    }
    
    with open("db_init_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
    
    print("\nStatistiken gespeichert in 'db_init_stats.json'")

if __name__ == "__main__":
    init_database_with_akt_data()