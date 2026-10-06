from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.phaste import SearchResponse
from app.services.search_service import execute_hybrid_search

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
async def search_phastes(
    q: str = Query("", description="Query text with optional filter tokens e.g. 'kind:image city:Chicago'"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified Omnibar search endpoint executing blended lexical and semantic search (RRF).
    """
    return await execute_hybrid_search(db, raw_query=q, limit=limit, offset=offset)
