from pydantic import BaseModel
from typing import Optional

class SkillBase(BaseModel):
    name: str
    original_skill_id: str
    internal_idx: int

class SkillCreate(SkillBase):
    pass 

class SkillRead(SkillBase):
    id: int 

    class Config:
        from_attributes = True

# Für API Antworten die eine Liste von Skills mit Zusatzinfos zeigen
class SkillWithProblemCountRead(SkillRead):
    num_problems: int        