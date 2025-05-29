from pydantic import BaseModel
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime

if TYPE_CHECKING:
    from .student_schemas import StudentRead

class ClassBase(BaseModel):
    name: str
    description: str 

class ClassCreate(ClassBase):
    pass 

class ClassRead(ClassBase):
    id: int
    teacher_id: int
    created_at: datetime
    students: List["StudentRead"] = [] 

    class Config:
        from_attributes = True