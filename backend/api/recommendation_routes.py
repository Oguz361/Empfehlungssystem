from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging
from database.db_setup import SessionLocal
from database import crud
from api.auth_dependencies import get_db
from schemas.recommendation_schemas import (
    MasteryProfileResponse,
    ConceptMasteryData,
    ConceptPrognosisResponse,
    DifficultyPrognosisData
)
from services.akt_model_service import get_akt_service

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Mastery Profile für einen Schüler
@router.get("/students/{student_id}/mastery-profile", response_model=MasteryProfileResponse)
async def get_student_mastery_profile(
    student_id: int,
    min_interactions: int = Query(1, description="Minimum Interaktionen pro Skill"),
    db: Session = Depends(get_db)
):
    """
    Berechnet das aktuelle Mastery-Profil eines Schülers über alle Skills mit AKT.
    """
    
    # Hole Schüler
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    
    # Hole AKT Service
    try:
        akt_service = get_akt_service()
    except Exception as e:
        logger.error(f"AKT Service nicht verfügbar: {e}")
        raise HTTPException(status_code=503, detail="AKT Model Service nicht verfügbar")
    
    # Hole Interaction History
    interactions = crud.get_student_interactions(db, student_id, sort_desc=False)
    
    if not interactions:
        raise HTTPException(status_code=404, detail="Keine Interaktionen gefunden")
    
    # Konvertiere zu Format für AKT Service
    interaction_history = []
    for interaction in interactions:
        interaction_history.append({
            "problem_id": interaction.problem.original_problem_id,
            "skill_id": interaction.skill.original_skill_id,
            "correct": int(interaction.is_correct),
            "timestamp": interaction.timestamp
        })
    
    # Sammle alle Skills die der Schüler bearbeitet hat
    skill_interaction_count = {}
    for interaction in interactions:
        skill_id = interaction.skill.id
        skill_interaction_count[skill_id] = skill_interaction_count.get(skill_id, 0) + 1
    
    # Berechne Mastery für jeden Skill mit genug Interaktionen
    mastery_data = []
    
    for skill_id, count in skill_interaction_count.items():
        if count < min_interactions:
            continue
            
        skill = crud.get_skill(db, skill_id)
        if not skill:
            continue
        
        # Berechne Mastery mit AKT
        mastery_result = akt_service.get_skill_mastery(
            interaction_history, 
            skill.original_skill_id
        )
        
        mastery_data.append(ConceptMasteryData(
            concept_db_id=skill.id,
            internal_concept_idx=skill.internal_idx,
            original_skill_id=skill.original_skill_id,
            concept_name=skill.name,
            mastery_score=mastery_result.get("mastery_score", 0.5),
            confidence=mastery_result.get("confidence", "low"),
            probes_evaluated=mastery_result.get("n_attempts", 0)
        ))
    
    # Sortiere nach Mastery Score (niedrigste zuerst für Förderempfehlungen)
    mastery_data.sort(key=lambda x: x.mastery_score)
    
    return MasteryProfileResponse(
        student_db_id=student.id,
        student_first_name=student.first_name,
        student_last_name=student.last_name,
        profile_data=mastery_data
    )

# Vorhersage für ein spezifisches Problem
@router.get("/students/{student_id}/predict-performance")
async def predict_problem_performance(
    student_id: int,
    problem_id: int,
    db: Session = Depends(get_db)
):
    """
    Vorhersage der Erfolgswahrscheinlichkeit für ein spezifisches Problem mit AKT.
    """
    
    # Validierung
    student = crud.get_student(db, student_id)
    problem = crud.get_problem(db, problem_id)
    
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    if not problem:
        raise HTTPException(status_code=404, detail="Problem nicht gefunden")
    
    # AKT Service
    try:
        akt_service = get_akt_service()
    except Exception as e:
        logger.error(f"AKT Service error: {e}")
        raise HTTPException(status_code=503, detail="AKT Service nicht verfügbar")
    
    # Hole Interaction History
    interactions = crud.get_student_interactions(db, student_id, sort_desc=False)
    
    if not interactions:
        return {
            "student_id": student_id,
            "problem_id": problem_id,
            "predicted_success": 0.5,
            "confidence": "no_history",
            "message": "Keine Historie verfügbar, neutrale Vorhersage"
        }
    
    # Konvertiere History
    interaction_history = [
        {
            "problem_id": i.problem.original_problem_id,
            "skill_id": i.skill.original_skill_id,
            "correct": int(i.is_correct)
        }
        for i in interactions
    ]
    
    # Vorhersage mit AKT
    try:
        success_probability = akt_service.predict_next_correct_probability(
            interaction_history,
            next_problem_id=problem.original_problem_id,
            next_skill_id=problem.skill.original_skill_id
        )
        
        # Schwierigkeitskategorisierung
        difficulty_info = akt_service.get_problem_difficulty_for_student(
            interaction_history,
            problem_id=problem.original_problem_id,
            skill_id=problem.skill.original_skill_id
        )
        
        return {
            "student_id": student_id,
            "problem_id": problem_id,
            "problem_original_id": problem.original_problem_id,
            "skill": {
                "id": problem.skill.id,
                "name": problem.skill.name
            },
            "predicted_success": success_probability,
            "difficulty": difficulty_info["difficulty"],
            "confidence": "model_based",
            "recommendation": _get_recommendation(success_probability)
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Vorhersagefehler: {str(e)}")

# Skill-spezifische Prognose
@router.get("/students/{student_id}/skills/{skill_id}/prognosis", response_model=ConceptPrognosisResponse)
async def get_skill_prognosis(
    student_id: int,
    skill_id: int,
    sample_size: int = Query(5, description="Anzahl Probleme pro Schwierigkeitskategorie"),
    db: Session = Depends(get_db)
):
    """
    Prognose für verschiedene Schwierigkeitsgrade eines Skills mit AKT.
    """
    
    student = crud.get_student(db, student_id)
    skill = crud.get_skill(db, skill_id)
    
    if not student or not skill:
        raise HTTPException(status_code=404, detail="Schüler oder Skill nicht gefunden")
    
    # AKT Service
    try:
        akt_service = get_akt_service()
    except:
        raise HTTPException(status_code=503, detail="AKT Service nicht verfügbar")
    
    # Interaction History
    interactions = crud.get_student_interactions(db, student_id, sort_desc=False)
    interaction_history = [
        {
            "problem_id": i.problem.original_problem_id,
            "skill_id": i.skill.original_skill_id,
            "correct": int(i.is_correct)
        }
        for i in interactions
    ]
    
    # Hole alle Probleme für diesen Skill
    all_problems = crud.get_problems_by_skill_id(db, skill_id)
    
    if not all_problems:
        raise HTTPException(status_code=404, detail="Keine Probleme für diesen Skill")
    
    # Bewerte jedes Problem
    problem_predictions = []
    for problem in all_problems[:50]:  # Limitiere auf 50 für Performance
        try:
            pred = akt_service.predict_next_correct_probability(
                interaction_history,
                next_problem_id=problem.original_problem_id,
                next_skill_id=skill.original_skill_id
            )
            problem_predictions.append((problem, pred))
        except:
            continue
    
    # Sortiere nach Vorhersage (aufsteigend = schwieriger zuerst)
    problem_predictions.sort(key=lambda x: x[1])
    
    # Teile in Schwierigkeitskategorien
    n_probs = len(problem_predictions)
    if n_probs < 3:
        raise HTTPException(status_code=400, detail="Zu wenige Probleme für Analyse")
    
    third = n_probs // 3
    hard_problems = problem_predictions[:third]
    medium_problems = problem_predictions[third:2*third]
    easy_problems = problem_predictions[2*third:]
    
    # Berechne Durchschnitte pro Kategorie
    prognosis_data = []
    
    for category, problems in [
        ("schwer", hard_problems),
        ("mittel", medium_problems),
        ("einfach", easy_problems)
    ]:
        if problems:
            avg_pred = sum(p[1] for p in problems) / len(problems)
            prognosis_data.append(DifficultyPrognosisData(
                difficulty_category=category,
                predicted_success_rate=round(avg_pred, 3),
                num_probes_in_category=len(problems)
            ))
    
    return ConceptPrognosisResponse(
        student_db_id=student.id,
        student_first_name=student.first_name,
        student_last_name=student.last_name,
        concept_db_id=skill.id,
        internal_concept_idx=skill.internal_idx,
        original_skill_id=skill.original_skill_id,
        concept_name=skill.name,
        prognosis_by_difficulty=prognosis_data
    )

# Empfohlene nächste Probleme
@router.get("/students/{student_id}/recommended-problems")
async def get_recommended_problems(
    student_id: int,
    skill_id: Optional[int] = None,
    n_recommendations: int = Query(5, ge=1, le=20),
    target_difficulty: str = Query("optimal", regex="^(easy|optimal|challenge)$"),
    db: Session = Depends(get_db)
):
    """
    Empfiehlt die nächsten Probleme basierend auf AKT-Vorhersagen.
    
    target_difficulty:
    - easy: 70-90% Erfolgswahrscheinlichkeit
    - optimal: 50-70% (Zone of Proximal Development)
    - challenge: 30-50%
    """
    
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    
    # AKT Service
    try:
        akt_service = get_akt_service()
    except:
        raise HTTPException(status_code=503, detail="AKT Service nicht verfügbar")
    
    # History
    interactions = crud.get_student_interactions(db, student_id, sort_desc=False)
    interaction_history = [
        {
            "problem_id": i.problem.original_problem_id,
            "skill_id": i.skill.original_skill_id,
            "correct": int(i.is_correct)
        }
        for i in interactions
    ]
    
    # Bestimme Ziel-Erfolgsbereich
    target_ranges = {
        "easy": (0.7, 0.9),
        "optimal": (0.5, 0.7),
        "challenge": (0.3, 0.5)
    }
    min_prob, max_prob = target_ranges[target_difficulty]
    
    # Hole Kandidaten-Probleme
    if skill_id:
        candidate_problems = crud.get_problems_by_skill_id(db, skill_id, limit=100)
    else:
        # Hole Probleme von Skills, die der Schüler bereits bearbeitet hat
        practiced_skill_ids = list(set(i.skill_id for i in interactions))
        candidate_problems = []
        for sid in practiced_skill_ids[:10]:  # Limitiere auf 10 Skills
            candidate_problems.extend(crud.get_problems_by_skill_id(db, sid, limit=20))
    
    if not candidate_problems:
        return {"recommendations": [], "message": "Keine passenden Probleme gefunden"}
    
    # Bewerte alle Kandidaten
    scored_problems = []
    
    for problem in candidate_problems:
        try:
            pred = akt_service.predict_next_correct_probability(
                interaction_history,
                next_problem_id=problem.original_problem_id,
                next_skill_id=problem.skill.original_skill_id
            )
            
            # Berechne Fitness Score (wie gut passt es zum Zielbereich)
            if min_prob <= pred <= max_prob:
                fitness = 1.0  # Perfekt im Zielbereich
            else:
                # Je weiter weg, desto schlechter
                distance = min(abs(pred - min_prob), abs(pred - max_prob))
                fitness = max(0, 1 - distance * 2)
            
            scored_problems.append({
                "problem": problem,
                "prediction": pred,
                "fitness": fitness
            })
            
        except Exception as e:
            logger.warning(f"Prediction failed for problem {problem.id}: {e}")
            continue
    
    # Sortiere nach Fitness Score
    scored_problems.sort(key=lambda x: x["fitness"], reverse=True)
    
    # Erstelle Empfehlungen
    recommendations = []
    for item in scored_problems[:n_recommendations]:
        problem = item["problem"]
        recommendations.append({
            "problem_id": problem.id,
            "original_problem_id": problem.original_problem_id,
            "description": problem.description_placeholder,
            "skill": {
                "id": problem.skill.id,
                "name": problem.skill.name
            },
            "predicted_success": round(item["prediction"], 3),
            "fitness_score": round(item["fitness"], 3),
            "difficulty_category": _categorize_difficulty(item["prediction"])
        })
    
    return {
        "student_id": student_id,
        "target_difficulty": target_difficulty,
        "target_success_range": f"{min_prob*100:.0f}-{max_prob*100:.0f}%",
        "n_recommendations": len(recommendations),
        "recommendations": recommendations
    }

# Hilfsfunktionen
def _get_recommendation(success_probability: float) -> str:
    """Gibt Empfehlung basierend auf Erfolgswahrscheinlichkeit."""
    if success_probability >= 0.8:
        return "Schüler beherrscht dieses Thema gut. Schwierigere Aufgaben empfohlen."
    elif success_probability >= 0.6:
        return "Gutes Niveau für weiteres Üben. Aufgabe ist angemessen."
    elif success_probability >= 0.4:
        return "Herausfordernde Aufgabe. Zusätzliche Unterstützung könnte hilfreich sein."
    else:
        return "Aufgabe ist wahrscheinlich zu schwer. Einfachere Aufgaben oder Wiederholung empfohlen."

def _categorize_difficulty(success_probability: float) -> str:
    """Kategorisiert basierend auf Erfolgswahrscheinlichkeit."""
    if success_probability >= 0.8:
        return "sehr_einfach"
    elif success_probability >= 0.65:
        return "einfach"
    elif success_probability >= 0.5:
        return "mittel"
    elif success_probability >= 0.35:
        return "schwer"
    else:
        return "sehr_schwer"