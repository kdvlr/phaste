import os
import re
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Request,
    Query
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, text, desc, and_, or_
from app.database import get_db, async_session_factory
from app.models.phaste import Phaste
from app.schemas.phaste import (
    PhasteCreate,
    PhasteUpdate,
    PhasteResponse,
    PhasteListResponse,
    ClientContext
)
from app.config import settings
from app.services.metadata_scraper import scrape_quick_metadata
from app.services.video_downloader import is_video_url, download_video
from app.services.ocr_service import extract_ocr_transcript
from app.services.embedding_service import embedding_service
from app.services.geocoding_service import extract_exif_metadata, reverse_geocode_coordinates
from app.utils.event_bus import event_bus

router = APIRouter(prefix="/api/phastes", tags=["Phastes"])

URL_REGEX = r"^https?://[^\s/$.?#].[^\s]*$"


def is_valid_url(s: Optional[str]) -> bool:
    if not s:
        return False
    return bool(re.match(URL_REGEX, s.strip(), re.IGNORECASE))


async def run_background_enrichment(phaste_id: uuid.UUID):
    """
    Asynchronously processes heavy tasks: OCR, ONNX embeddings, yt-dlp video downloading,
    and EXIF GPS reverse-geocoding. Emits live SSE events when complete.
    """
    async with async_session_factory() as session:
        try:
            res = await session.execute(select(Phaste).where(Phaste.id == phaste_id))
            item = res.scalar_one_or_none()
            if not item:
                return

            item.status = "processing"
            await session.commit()
            await event_bus.publish("phaste.updated", {"id": str(item.id), "status": "processing"})

            now_year = datetime.now(timezone.utc).strftime("%Y")
            now_month = datetime.now(timezone.utc).strftime("%m")
            dest_dir = settings.MEDIA_ROOT / now_year / now_month
            dest_dir.mkdir(parents=True, exist_ok=True)

            meta = dict(item.metadata_context or {})

            # 1. Processing Video Phaste from URL
            if item.kind == "video" and item.source_url and not item.media_path:
                success, vid_result = await download_video(
                    item.source_url,
                    output_dir=dest_dir,
                    base_filename=f"{item.id}"
                )
                if success:
                    item.media_path = f"{now_year}/{now_month}/{item.id}.mp4"
                    if vid_result.get("thumbnail_path"):
                        item.thumbnail_path = f"{now_year}/{now_month}/{Path(vid_result['thumbnail_path']).name}"
                    item.duration_seconds = vid_result.get("duration")
                    item.media_size_bytes = vid_result.get("size_bytes")
                    item.media_mime_type = "video/mp4"
                    if vid_result.get("width") and vid_result.get("height"):
                        item.media_dimensions = {"width": vid_result["width"], "height": vid_result["height"]}
                    if not item.title and vid_result.get("title"):
                        item.title = vid_result["title"]
                    meta["video_info"] = vid_result
                    item.status = "ready"
                else:
                    # Fallback stream per ADR 0004
                    item.status = "fallback_stream"
                    meta["download_error"] = vid_result.get("error")

            # 2. Processing Image Phaste
            elif item.kind == "image" and item.media_path:
                full_image_path = settings.MEDIA_ROOT / item.media_path
                if full_image_path.exists():
                    # EXIF extraction
                    exif = extract_exif_metadata(full_image_path)
                    meta["exif"] = exif

                    # Geocoding if GPS coordinates are in EXIF
                    lat = exif.get("latitude")
                    lon = exif.get("longitude")
                    if lat and lon:
                        geo = await reverse_geocode_coordinates(lat, lon)
                        meta["location"] = geo
                        meta["city"] = geo.get("city")
                        meta["country_code"] = geo.get("country_code")

                    # OCR Text extraction
                    ocr_text = await extract_ocr_transcript(full_image_path)
                    if ocr_text:
                        item.ocr_transcript = ocr_text

                    # ONNX Visual Embedding
                    embedding = await embedding_service.embed_image(full_image_path)
                    if embedding:
                        item.visual_embedding = embedding

                    item.status = "ready"

            # 3. Text / Link fallback
            else:
                item.status = "ready"

            item.metadata_context = meta

            # Update PostgreSQL full-text search vector
            full_text_parts = [
                item.title or "",
                item.content or "",
                item.ocr_transcript or "",
                meta.get("city") or "",
                meta.get("formatted_location") or "",
                meta.get("og", {}).get("description", "") if isinstance(meta.get("og"), dict) else "",
            ]
            combined_text = " ".join(filter(None, full_text_parts))
            
            # Execute search_vector update
            await session.execute(
                update(Phaste)
                .where(Phaste.id == phaste_id)
                .values(
                    status=item.status,
                    media_path=item.media_path,
                    thumbnail_path=item.thumbnail_path,
                    media_dimensions=item.media_dimensions,
                    duration_seconds=item.duration_seconds,
                    media_size_bytes=item.media_size_bytes,
                    ocr_transcript=item.ocr_transcript,
                    visual_embedding=item.visual_embedding,
                    metadata_context=item.metadata_context,
                    search_vector=func.to_tsvector("english", combined_text)
                )
            )
            await session.commit()

            # Refresh and publish SSE
            res_after = await session.execute(select(Phaste).where(Phaste.id == phaste_id))
            updated_item = res_after.scalar_one()
            await event_bus.publish(
                "phaste.processed",
                PhasteResponse.model_validate(updated_item).model_dump(mode="json")
            )

        except Exception as e:
            await session.rollback()
            try:
                await session.execute(
                    update(Phaste)
                    .where(Phaste.id == phaste_id)
                    .values(status="failed", error_message=str(e))
                )
                await session.commit()
                await event_bus.publish("phaste.failed", {"id": str(phaste_id), "error": str(e)})
            except Exception:
                pass


@router.post("", response_model=PhasteResponse, status_code=201)
async def create_phaste(
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Instant capture endpoint: creates a Phaste immediately (<50ms for text/files,
    synchronous fast-metadata scrape up to 1.5s for links per ADR 0002).
    Supports both application/json payloads and multipart/form-data uploads.
    """
    content_type = request.headers.get("content-type", "").lower()
    content: Optional[str] = None
    kind: Optional[str] = None
    title: Optional[str] = None
    client_ctx: Optional[ClientContext] = None
    file: Optional[UploadFile] = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = PhasteCreate.model_validate(body)
            content = payload.content
            kind = payload.kind
            title = payload.title
            client_ctx = payload.client_context
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
        form = await request.form()
        raw_file = form.get("file")
        if raw_file and hasattr(raw_file, "filename") and hasattr(raw_file, "read"):
            file = raw_file
        raw_content = form.get("raw_content") or form.get("content")
        if isinstance(raw_content, str):
            content = raw_content
        raw_kind = form.get("kind_form") or form.get("kind")
        if isinstance(raw_kind, str):
            kind = raw_kind
        raw_title = form.get("title_form") or form.get("title")
        if isinstance(raw_title, str):
            title = raw_title
        raw_client_ctx = form.get("client_context")
        if isinstance(raw_client_ctx, str):
            try:
                import json
                ctx_dict = json.loads(raw_client_ctx)
                client_ctx = ClientContext.model_validate(ctx_dict)
            except Exception:
                pass

    # Base metadata context
    metadata_context = {}
    if client_ctx:
        metadata_context["client"] = client_ctx.model_dump(exclude_none=True)
        if client_ctx.latitude and client_ctx.longitude:
            geo = await reverse_geocode_coordinates(client_ctx.latitude, client_ctx.longitude)
            metadata_context["location"] = geo
            metadata_context["city"] = geo.get("city")
            metadata_context["country_code"] = geo.get("country_code")

    # Client IP and User-Agent
    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    metadata_context["network"] = {"ip": client_ip, "user_agent": user_agent}

    now_year = datetime.now(timezone.utc).strftime("%Y")
    now_month = datetime.now(timezone.utc).strftime("%m")
    dest_dir = settings.MEDIA_ROOT / now_year / now_month
    dest_dir.mkdir(parents=True, exist_ok=True)

    new_id = uuid.uuid4()
    media_path = None
    media_mime_type = None
    media_size_bytes = None
    source_url = None
    thumbnail_path = None

    # Case 1: Direct File Upload
    if file:
        filename = file.filename or "upload"
        ext = Path(filename).suffix.lower() or ".bin"
        saved_filename = f"{new_id}{ext}"
        saved_file_path = dest_dir / saved_filename

        content_bytes = await file.read()
        media_size_bytes = len(content_bytes)
        media_mime_type = file.content_type or "application/octet-stream"

        with open(saved_file_path, "wb") as f:
            f.write(content_bytes)

        media_path = f"{now_year}/{now_month}/{saved_filename}"

        if media_mime_type.startswith("image/"):
            kind = "image"
            if not title:
                title = filename
        elif media_mime_type.startswith("video/"):
            kind = "video"
            if not title:
                title = filename
        else:
            kind = "text"

    # Case 2: Text or URL Payload
    else:
        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="Content or file is required.")

        content_clean = content.strip()

        # Check if URL
        if is_valid_url(content_clean):
            source_url = content_clean

            # Check if video platform link
            if is_video_url(content_clean):
                kind = "video"
                # Synchronously scrape quick title/thumbnail
                quick_meta = await scrape_quick_metadata(content_clean)
                if not title and quick_meta.get("title"):
                    title = quick_meta["title"]
                metadata_context["og"] = quick_meta
            else:
                kind = "link"
                # Synchronous quick-scrape (1.5s per ADR 0002)
                quick_meta = await scrape_quick_metadata(content_clean)
                if not title and quick_meta.get("title"):
                    title = quick_meta["title"]
                metadata_context["og"] = quick_meta
        else:
            if not kind:
                # Detect rich text (Markdown / HTML) vs plain text
                if any(tag in content_clean for tag in ["# ", "```", "* ", "- ", "<b>", "<div>"]):
                    kind = "richtext"
                else:
                    kind = "text"

    # Initial TSVECTOR content
    search_text = f"{title or ''} {content or ''} {metadata_context.get('city', '')}"

    phaste = Phaste(
        id=new_id,
        kind=kind or "text",
        status="processing" if (kind in ("video", "image") or source_url) else "ready",
        title=title,
        content=content,
        source_url=source_url,
        media_path=media_path,
        thumbnail_path=thumbnail_path,
        media_mime_type=media_mime_type,
        media_size_bytes=media_size_bytes,
        metadata_context=metadata_context,
        search_vector=func.to_tsvector("english", search_text)
    )

    db.add(phaste)
    await db.commit()
    await db.refresh(phaste)

    # Dispatch background worker
    if phaste.status == "processing":
        background_tasks.add_task(run_background_enrichment, phaste.id)

    # Publish creation event
    resp_obj = PhasteResponse.model_validate(phaste)
    await event_bus.publish("phaste.created", resp_obj.model_dump(mode="json"))

    return resp_obj


@router.get("", response_model=PhasteListResponse)
async def list_phastes(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    kind: Optional[str] = Query(None),
    pinned: Optional[bool] = Query(None),
    archived: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    conditions = [Phaste.is_archived == archived]

    if kind:
        conditions.append(Phaste.kind == kind)
    if pinned is not None:
        conditions.append(Phaste.is_pinned == pinned)

    count_stmt = select(func.count(Phaste.id)).where(and_(*conditions))
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = (
        select(Phaste)
        .where(and_(*conditions))
        .order_by(Phaste.is_pinned.desc(), Phaste.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return PhasteListResponse(
        items=[PhasteResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{id}", response_model=PhasteResponse)
async def get_phaste(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Phaste).where(Phaste.id == id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Phaste not found")
    return PhasteResponse.model_validate(item)


@router.patch("/{id}", response_model=PhasteResponse)
async def update_phaste(
    id: uuid.UUID,
    payload: PhasteUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Phaste).where(Phaste.id == id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Phaste not found")

    if payload.title is not None:
        item.title = payload.title
    if payload.content is not None:
        item.content = payload.content
    if payload.is_pinned is not None:
        item.is_pinned = payload.is_pinned
    if payload.is_archived is not None:
        item.is_archived = payload.is_archived

    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)

    resp_data = PhasteResponse.model_validate(item)
    await event_bus.publish("phaste.updated", resp_data.model_dump(mode="json"))
    return resp_data


@router.delete("/{id}", status_code=204)
async def delete_phaste(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Phaste).where(Phaste.id == id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Phaste not found")

    # Remove media file from disk if present
    if item.media_path:
        f = settings.MEDIA_ROOT / item.media_path
        if f.exists():
            try:
                f.unlink()
            except Exception:
                pass

    if item.thumbnail_path:
        t = settings.MEDIA_ROOT / item.thumbnail_path
        if t.exists():
            try:
                t.unlink()
            except Exception:
                pass

    await db.delete(item)
    await db.commit()
    await event_bus.publish("phaste.deleted", {"id": str(id)})
    return None
