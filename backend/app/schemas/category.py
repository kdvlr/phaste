from typing import Optional
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryRename(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=128)


class CategoryResponse(BaseModel):
    name: str
    count: int = 0
    icon: Optional[str] = None
    color: Optional[str] = None
