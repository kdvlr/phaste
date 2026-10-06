from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.phaste import Phaste
from app.schemas.phaste import PhasteResponse

router = APIRouter(prefix="/s", tags=["Public"])


@router.get("/{slug}", response_model=PhasteResponse)
async def get_public_phaste(slug: str, db: AsyncSession = Depends(get_db)):
    """Public read-only viewing of a Phaste via unguessable slug (ADR 0005)."""
    res = await db.execute(select(Phaste).where(Phaste.public_slug == slug))
    item = res.scalar_one_or_none()
    if not item or item.is_archived:
        raise HTTPException(status_code=404, detail="Phaste not found")
    return PhasteResponse.model_validate(item)
