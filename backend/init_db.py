from database.db_setup import create_db_and_tables, engine # Stelle sicher, dass der Pfad stimmt
from database.models import Teacher, Class, Student, Skill, Problem, Interaction, ProbeQuestionEntry, RecommendationReport # Importiere alle Modelle

if __name__ == "__main__":
    print("Datenbank und Tabellen werden erstellt...")
    create_db_and_tables()
    print("Datenbank und Tabellen erfolgreich erstellt in 'empfehlungssystem.db'.")