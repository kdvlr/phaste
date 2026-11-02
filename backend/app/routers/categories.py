from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc, asc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.phaste import Phaste

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("")
async def get_categories_and_collections(db: AsyncSession = Depends(get_db)):
    """
    Returns live count aggregations for:
    1. System Collections: all, today, pinned, media, untagged, archive, trash
    2. Dynamic Tag Categories: e.g. [{ name: "bear", count: 3 }, ...]
    """
    now_utc = datetime.now(timezone.utc)
    start_of_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. System Collections Counts
    all_res = await db.execute(
        select(func.count(Phaste.id)).where(and_(Phaste.is_trash == False, Phaste.is_archived == False))
    )
    all_count = all_res.scalar() or 0

    today_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(Phaste.is_trash == False, Phaste.created_at >= start_of_today)
        )
    )
    today_count = today_res.scalar() or 0

    pinned_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(Phaste.is_trash == False, Phaste.is_pinned == True)
        )
    )
    pinned_count = pinned_res.scalar() or 0

    media_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(Phaste.is_trash == False, Phaste.kind.in_(["image", "video"]))
        )
    )
    media_count = media_res.scalar() or 0

    todo_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(Phaste.is_trash == False, Phaste.is_todo == True)
        )
    )
    todo_count = todo_res.scalar() or 0

    uncategorized_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(
                Phaste.is_trash == False,
                Phaste.is_archived == False,
                or_(Phaste.category == None, Phaste.category == "")
            )
        )
    )
    uncategorized_count = uncategorized_res.scalar() or 0

    archive_res = await db.execute(
        select(func.count(Phaste.id)).where(
            and_(Phaste.is_trash == False, Phaste.is_archived == True)
        )
    )
    archive_count = archive_res.scalar() or 0

    trash_res = await db.execute(
        select(func.count(Phaste.id)).where(Phaste.is_trash == True)
    )
    trash_count = trash_res.scalar() or 0

    # 2. Dynamic Categories with counts (each phaste belongs to strictly one category)
    categories = []
    try:
        cat_stmt = (
            select(
                Phaste.category,
                func.count(Phaste.id).label("count")
            )
            .where(
                and_(
                    Phaste.is_trash == False,
                    Phaste.is_archived == False,
                    Phaste.category != None,
                    Phaste.category != ""
                )
            )
            .group_by(Phaste.category)
            .order_by(desc("count"), asc(Phaste.category))
        )
        cat_res = await db.execute(cat_stmt)
        categories = [{"name": str(row[0]), "count": int(row[1])} for row in cat_res.fetchall() if row[0]]
    except Exception:
        # Fallback if table column just created
        pass

    return {
        "collections": {
            "all": all_count,
            "today": today_count,
            "pinned": pinned_count,
            "media": media_count,
            "todo": todo_count,
            "uncategorized": uncategorized_count,
            "untagged": uncategorized_count,
            "archive": archive_count,
            "trash": trash_count
        },
        "categories": categories
    }
