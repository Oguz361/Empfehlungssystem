from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TeacherBase(BaseModel):
    username: str

class TeacherCreate(TeacherBase):
    password: str 

class TeacherRead(TeacherBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True