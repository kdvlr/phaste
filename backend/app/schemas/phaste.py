from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ClientContext(BaseModel):
    client_timestamp: Optional[str] = None
    timezone: Optional[str] = None
    user_agent: Optional[str] = None
    platform: Optional[str] = None
    language: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None


class PhasteCreate(BaseModel):
    content: Optional[str] = None
    kind: Optional[str] = None  # auto-detected if omitted
    title: Optional[str] = None
    client_context: Optional[ClientContext] = None


class PhasteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class PhasteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    public_slug: str
    kind: str
    status: str
    error_message: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    rendered_content: Optional[str] = None
    source_url: Optional[str] = None
    media_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    media_mime_type: Optional[str] = None
    media_size_bytes: Optional[int] = None
    media_dimensions: Optional[Dict[str, Any]] = None
    duration_seconds: Optional[float] = None
    ocr_transcript: Optional[str] = None
    metadata_context: Dict[str, Any] = Field(default_factory=dict)
    is_pinned: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class PhasteListResponse(BaseModel):
    items: List[PhasteResponse]
    total: int
    page: int
    limit: int


class SearchResultItem(BaseModel):
    phaste: PhasteResponse
    score: float
    match_type: str  # 'lexical', 'semantic', 'hybrid', 'filter'


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
    query: str
    filters_applied: Dict[str, Any]
