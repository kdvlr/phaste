import mimetypes
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse, FileResponse
from app.config import settings

router = APIRouter(prefix="/api/media", tags=["Media"])


@router.get("/{file_path:path}")
async def stream_media(file_path: str, request: Request):
    """
    Streams media assets with full HTTP byte-range support (206 Partial Content)
    enabling seekable video and audio playback (ADR 0010).
    """
    full_path = (settings.MEDIA_ROOT / file_path).resolve()

    # Prevent directory traversal
    try:
        full_path.relative_to(settings.MEDIA_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = full_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(full_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    range_header = request.headers.get("range")
    if not range_header:
        # Standard full file response
        return FileResponse(
            full_path,
            media_type=mime_type,
            headers={"Accept-Ranges": "bytes"}
        )

    # Parse byte-range header (e.g. 'bytes=1000-2000' or 'bytes=1000-')
    try:
        byte_range = range_header.strip().replace("bytes=", "")
        parts = byte_range.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1

        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                detail="Requested range not satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        content_length = end - start + 1

        def iter_file():
            with open(full_path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                chunk_size = 64 * 1024
                while bytes_left > 0:
                    read_size = min(chunk_size, bytes_left)
                    data = f.read(read_size)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime_type,
        }

        return StreamingResponse(
            iter_file(),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers
        )
    except Exception:
        return FileResponse(full_path, media_type=mime_type, headers={"Accept-Ranges": "bytes"})
