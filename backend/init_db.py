from database.db_setup import create_db_and_tables, engine 
from database.models import Teacher, Class, Student, Skill, Problem, Interaction

if __name__ == "__main__":
    print("Datenbank und Tabellen werden erstellt...")
    create_db_and_tables()
    print("Datenbank und Tabellen erfolgreich erstellt in 'empfehlungssystem.db'.")