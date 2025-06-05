from pydantic import BaseModel
from typing import List, TYPE_CHECKING
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

    class Config:
        from_attributes = True

class ClassReadWithStudents(ClassRead):
    students: List["StudentRead"] = []
    
    class Config:
        from_attributes = True

class ClassDashboardRead(BaseModel):
    id: int
    name: str
    student_count: int

    class Config:
        from_attributes = True        