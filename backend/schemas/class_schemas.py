from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ClassBase(BaseModel):
    name: str
    description: str 

class ClassCreate(ClassBase):
    pass 

class ClassRead(ClassBase):
    id: int
    teacher_id: int
    created_at: datetime
    students: List[StudentRead] = [] 

    class Config:
        orm_mode = True