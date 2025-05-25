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
        orm_mode = True 