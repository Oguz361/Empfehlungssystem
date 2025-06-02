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
