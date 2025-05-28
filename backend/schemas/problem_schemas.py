from pydantic import BaseModel
from typing import Optional

class ProblemBase(BaseModel):
    original_problem_id: str
    internal_idx: int
    description_placeholder: Optional[str] = None
    skill_internal_idx: int 

class ProblemCreate(ProblemBase):
    difficulty_mu_q: Optional[float] = None 

class ProblemRead(ProblemBase):
    id: int
    difficulty_mu_q: Optional[float]
    skill_id: int 

    class Config:
        orm_mode = True