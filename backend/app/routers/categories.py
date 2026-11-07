import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc, asc, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.phaste import Phaste
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryRename, CategoryResponse
from app.utils.event_bus import event_bus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("")
async def get_categories_and_collections(db: AsyncSession = Depends(get_db)):
    """
    Returns live count aggregations for:
    1. System Collections: all, today, pinned, media, untagged, archive, trash
    2. Dynamic Tag Categories: e.g. [{ name: "Personal", count: 3 }, ...]
    Includes newly created categories even if they currently contain 0 phastes.
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

    # 2. Categories with live counts (includes empty categories from categories table)
    categories = []
    try:
        cat_stmt = text("""
            SELECT c.name, COUNT(p.id) AS count
            FROM (
                SELECT name FROM categories
                UNION
                SELECT category AS name FROM phastes WHERE category IS NOT NULL AND TRIM(category) != ''
            ) c
            LEFT JOIN phastes p ON LOWER(p.category) = LOWER(c.name) AND p.is_trash = FALSE AND p.is_archived = FALSE
            GROUP BY c.name
            ORDER BY count DESC, c.name ASC
        """)
        cat_res = await db.execute(cat_stmt)
        categories = [{"name": str(row[0]), "count": int(row[1])} for row in cat_res.fetchall() if row[0]]
    except Exception as e:
        logger.warning(f"Error fetching categories with counts: {e}")
        # Fallback to direct group_by on phastes table
        try:
            fallback_stmt = (
                select(Phaste.category, func.count(Phaste.id).label("count"))
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
            fallback_res = await db.execute(fallback_stmt)
            categories = [{"name": str(r[0]), "count": int(r[1])} for r in fallback_res.fetchall() if r[0]]
        except Exception:
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


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(payload: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new category. Name is trimmed and formatted to Title Case.
    """
    clean_name = payload.name.strip()
    # Normalize title case while preserving acronyms/case if already mixed
    clean_name = clean_name.title() if clean_name.islower() else clean_name

    if not clean_name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty")

    # Check if category already exists in categories table or phastes table
    cat_check = await db.execute(
        select(Category).where(func.lower(Category.name) == clean_name.lower())
    )
    existing = cat_check.scalar_one_or_none()

    if existing:
        return CategoryResponse(name=existing.name, count=0)

    # Insert into categories table
    new_cat = Category(
        name=clean_name,
        icon=payload.icon,
        color=payload.color
    )
    db.add(new_cat)
    await db.commit()

    await event_bus.publish("category.created", {"name": clean_name})
    logger.info(f"Created category '{clean_name}'")
    return CategoryResponse(name=clean_name, count=0, icon=payload.icon, color=payload.color)


@router.put("/{name}")
async def rename_category(
    name: str,
    payload: CategoryRename,
    db: AsyncSession = Depends(get_db)
):
    """
    Renames a category across both the categories table and all existing phastes in that category.
    """
    old_clean = name.strip()
    new_clean = payload.new_name.strip()
    new_clean = new_clean.title() if new_clean.islower() else new_clean

    if not new_clean:
        raise HTTPException(status_code=400, detail="New category name cannot be empty")

    if old_clean.lower() == new_clean.lower() and old_clean == new_clean:
        return {"old_name": old_clean, "new_name": new_clean}

    # 1. Update or upsert in categories table
    await db.execute(
        text("UPDATE categories SET name = :new_name WHERE LOWER(name) = LOWER(:old_name)"),
        {"new_name": new_clean, "old_name": old_clean}
    )
    await db.execute(
        text("""
            INSERT INTO categories (id, name, created_at)
            VALUES (gen_random_uuid(), :name, NOW())
            ON CONFLICT (name) DO NOTHING
        """),
        {"name": new_clean}
    )

    # 2. Update all phastes in that category
    update_res = await db.execute(
        text("UPDATE phastes SET category = :new_name WHERE LOWER(category) = LOWER(:old_name)"),
        {"new_name": new_clean, "old_name": old_clean}
    )
    affected_count = update_res.rowcount

    await db.commit()

    await event_bus.publish(
        "category.renamed",
        {"old_name": old_clean, "new_name": new_clean, "count": affected_count}
    )
    logger.info(f"Renamed category '{old_clean}' -> '{new_clean}' across {affected_count} phastes")
    return {"old_name": old_clean, "new_name": new_clean, "count": affected_count}


@router.delete("/{name}")
async def delete_category(name: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes a category and uncategorizes all phastes belonging to it.
    """
    clean_name = name.strip()

    # 1. Remove from categories table
    await db.execute(
        text("DELETE FROM categories WHERE LOWER(name) = LOWER(:name)"),
        {"name": clean_name}
    )

    # 2. Uncategorize phastes in this category
    res = await db.execute(
        text("UPDATE phastes SET category = NULL WHERE LOWER(category) = LOWER(:name)"),
        {"name": clean_name}
    )
    affected = res.rowcount

    await db.commit()

    await event_bus.publish("category.deleted", {"name": clean_name, "count": affected})
    logger.info(f"Deleted category '{clean_name}', uncategorized {affected} phastes")
    return {"deleted": clean_name, "count": affected}
