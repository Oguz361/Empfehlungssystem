from pydantic import BaseModel

class ProbeQuestionEntryBase(BaseModel):
    skill_db_id: int 
    problem_db_id: int 

class ProbeQuestionEntryCreate(ProbeQuestionEntryBase):
    pass

class ProbeQuestionEntryRead(ProbeQuestionEntryBase):
    id: int

    class Config:
        orm_mode = True