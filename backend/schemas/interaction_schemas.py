from pydantic import BaseModel
from datetime import datetime

class InteractionBase(BaseModel):
    problem_db_id: int 
    skill_db_id: int  
    is_correct: bool
    timestamp: datetime

class InteractionCreate(InteractionBase):
    pass

class InteractionRead(InteractionBase):
    id: int 
    student_id: int

    class Config:
        orm_mode = True

# CSV Import, 
class InteractionCSVRow(BaseModel):
    student_original_id: str 
    problem_original_id: str
    skill_original_id: str 
    is_correct: bool
    timestamp: datetime 