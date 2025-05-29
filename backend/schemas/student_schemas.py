from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StudentBase(BaseModel):
    first_name: str
    last_name: str

class StudentCreate(StudentBase):
    pass

class StudentRead(StudentBase):
    id: int
    class_id: int
    last_interaction_update_timestamp: Optional[datetime] = None 
    created_at: datetime

    class Config:
        from_attributes = True