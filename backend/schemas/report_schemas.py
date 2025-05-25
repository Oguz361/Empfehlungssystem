from pydantic import BaseModel, Json
from typing import Optional, Dict, Any
from datetime import datetime

class RecommendationReportBase(BaseModel):
    content_json: Dict[str, Any] 
    teacher_comment: Optional[str] = None 

class RecommendationReportCreate(RecommendationReportBase):
    pass

class RecommendationReportRead(RecommendationReportBase):
    id: int
    student_id: int
    creation_timestamp: datetime
    teacher_id: Optional[int]

    class Config:
        orm_mode = True

class ReportCommentCreate(BaseModel):
    teacher_comment: str