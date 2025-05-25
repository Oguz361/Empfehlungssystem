from pydantic import BaseModel
from typing import Optional, List

# Mastery Profil 
class ConceptMasteryData(BaseModel):
    concept_db_id: int
    internal_concept_idx: int
    original_skill_id: str
    concept_name: str
    mastery_score: Optional[float] = None
    confidence: str
    probes_evaluated: int

class MasteryProfileResponse(BaseModel):
    student_db_id: int
    student_first_name: str 
    student_last_name: str
    profile_data: List[ConceptMasteryData]

# Erfolgsprognose
class DifficultyPrognosisData(BaseModel):
    difficulty_category: str 
    predicted_success_rate: Optional[float] = None
    num_probes_in_category: int

class ConceptPrognosisResponse(BaseModel):
    student_db_id: int
    student_first_name: str
    student_last_name: str
    concept_db_id: int
    internal_concept_idx: int
    original_skill_id: str
    concept_name: str
    prognosis_by_difficulty: List[DifficultyPrognosisData]

# Attention Analyse
class AttendedInteractionData(BaseModel):
    attended_problem_db_id: int
    attended_problem_original_id: str
    attended_concept_db_id: int 
    attended_concept_name: str
    attended_correctness: bool
    attention_score: float 
    sequence_step_ago: int 
    problem_description_placeholder: str

class AttentionAnalysisResponse(BaseModel):
    student_db_id: int
    student_first_name: str
    student_last_name: str
    explaining_problem_db_id: Optional[int] = None
    explaining_problem_original_id: Optional[str] = None
    explaining_concept_name: Optional[str] = None
    top_n_attended_interactions: List[AttendedInteractionData]

#Textbasierte Empfehlungen
class TextSummaryResponse(BaseModel):
    student_db_id: int
    student_first_name: str
    student_last_name: str
    summary_title: str
    generated_paragraphs: List[str]
    suggested_actions_for_teacher: Optional[List[str]] = None