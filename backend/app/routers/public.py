import html
import mimetypes
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.phaste import Phaste
from app.schemas.phaste import PhasteResponse
from app.config import settings

router = APIRouter(tags=["Public"])


def render_public_html(item: Phaste, req: Request) -> str:
    """Renders a self-contained, lightweight Material 3 dark-mode public view for a single Phaste."""
    title = html.escape(item.title or f"{item.kind.capitalize()} Phaste")
    content_raw = item.content or ""
    content_escaped = html.escape(content_raw)
    slug = html.escape(item.public_slug)
    kind = html.escape(item.kind)
    date_str = item.created_at.strftime("%B %d, %Y at %I:%M %p UTC")

    meta = item.metadata_context or {}
    author = meta.get("author", {})
    author_name = html.escape(author.get("name") or "Owner")
    is_owner = author.get("is_owner", True)
    location_str = html.escape(meta.get("city") or meta.get("formatted_location") or "")

    # Content body based on kind
    content_body = ""
    if item.kind == "text" or item.kind == "richtext":
        line_count = len(content_raw.splitlines()) if content_raw else 1
        content_body = f"""
        <div class="code-card">
            <div class="code-header">
                <span class="code-info">{line_count} lines &bull; {len(content_raw)} chars</span>
                <button class="btn btn-secondary" onclick="copyContent()">
                    <span id="copy-btn-text">Copy Content</span>
                </button>
            </div>
            <pre class="code-content"><code id="raw-content">{content_escaped}</code></pre>
        </div>
        """
    elif item.kind == "image" and item.media_path:
        img_url = f"/sh/media/{html.escape(item.media_path)}"
        ocr_html = ""
        if item.ocr_transcript:
            ocr_html = f"""
            <div class="ocr-box">
                <div class="ocr-title">Extracted OCR Text:</div>
                <div class="ocr-content">{html.escape(item.ocr_transcript)}</div>
            </div>
            """
        content_body = f"""
        <div class="media-container">
            <div class="image-wrapper">
                <img src="{img_url}" alt="{title}" class="public-image" />
            </div>
            <div class="media-actions">
                <a href="{img_url}" target="_blank" class="btn btn-secondary">Open Full Image</a>
                <a href="{img_url}" download class="btn btn-primary">Download</a>
            </div>
            {ocr_html}
        </div>
        """
    elif item.kind == "video":
        vid_url = f"/sh/media/{html.escape(item.media_path)}" if item.media_path else item.source_url
        content_body = f"""
        <div class="media-container">
            <video controls autoplay muted playsinline class="public-video" src="{vid_url}">
                Your browser does not support HTML5 video.
            </video>
            {f'<div class="media-actions"><a href="{vid_url}" download class="btn btn-primary">Download Video</a></div>' if item.media_path else ''}
        </div>
        """
    elif item.kind == "link":
        og = meta.get("og", {})
        og_img = html.escape(og.get("image_url") or "")
        og_title = html.escape(og.get("title") or item.source_url or "Link")
        og_desc = html.escape(og.get("description") or "")
        source_url = html.escape(item.source_url or item.content or "#")
        
        preview_img = f'<img src="{og_img}" alt="" class="og-banner" />' if og_img else ''
        content_body = f"""
        <div class="link-card">
            {preview_img}
            <div class="link-content">
                <a href="{source_url}" target="_blank" rel="noopener noreferrer" class="link-title">{og_title} &nearr;</a>
                {f'<p class="link-desc">{og_desc}</p>' if og_desc else ''}
                <div class="link-url font-mono">{source_url}</div>
                <div style="margin-top: 1rem;">
                    <a href="{source_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Visit URL</a>
                    <button class="btn btn-secondary" onclick="copyText('{source_url}')">Copy URL</button>
                </div>
            </div>
        </div>
        """
    else:
        content_body = f"""
        <div class="code-card">
            <pre class="code-content"><code>{content_escaped}</code></pre>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Phaste</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23D0BCFF'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z'/></svg>" />
    <style>
        :root {{
            --surface: #141218;
            --surface-container: #1D1B20;
            --surface-container-high: #2B2930;
            --surface-container-highest: #36343B;
            --on-surface: #E6E0E9;
            --on-surface-variant: #CAC4D0;
            --primary: #D0BCFF;
            --on-primary: #381E72;
            --primary-container: #4F378B;
            --outline: #938F99;
            --outline-variant: #49454F;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background-color: var(--surface);
            color: var(--on-surface);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 1.5rem 1rem;
        }}
        .container {{
            max-width: 960px;
            width: 100%;
            margin: 0 auto;
            flex: 1;
        }}
        header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--outline-variant);
        }}
        .logo-group {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}
        .logo-badge {{
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--primary-container);
            color: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }}
        .title-group h1 {{
            font-size: 1.15rem;
            font-weight: 600;
            color: var(--on-surface);
        }}
        .meta-sub {{
            font-size: 0.75rem;
            color: var(--on-surface-variant);
            display: flex;
            gap: 0.5rem;
            align-items: center;
            margin-top: 0.2rem;
        }}
        .badge {{
            display: inline-block;
            padding: 0.15rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.7rem;
            font-weight: 600;
            background: var(--surface-container-highest);
            color: var(--primary);
            text-transform: uppercase;
        }}
        .code-card {{
            background: var(--surface-container);
            border: 1px solid var(--outline-variant);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }}
        .code-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.6rem 1rem;
            background: var(--surface-container-high);
            border-bottom: 1px solid var(--outline-variant);
        }}
        .code-info {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.75rem;
            color: var(--on-surface-variant);
        }}
        .code-content {{
            padding: 1rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.85rem;
            line-height: 1.6;
            overflow-x: auto;
            color: var(--on-surface);
            white-space: pre-wrap;
            word-break: break-word;
        }}
        .btn {{
            cursor: pointer;
            border: none;
            border-radius: 9999px;
            padding: 0.45rem 1rem;
            font-size: 0.8rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            transition: all 0.15s ease;
        }}
        .btn-primary {{
            background: var(--primary);
            color: var(--on-primary);
        }}
        .btn-primary:hover {{ opacity: 0.9; }}
        .btn-secondary {{
            background: var(--surface-container-highest);
            color: var(--on-surface);
        }}
        .btn-secondary:hover {{ background: var(--outline-variant); }}
        .media-container {{
            background: var(--surface-container);
            border: 1px solid var(--outline-variant);
            border-radius: 16px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
        }}
        .image-wrapper {{
            max-width: 100%;
            max-height: 75vh;
            overflow: hidden;
            border-radius: 8px;
            display: flex;
            justify-content: center;
        }}
        .public-image {{
            max-width: 100%;
            max-height: 75vh;
            object-fit: contain;
            border-radius: 8px;
        }}
        .public-video {{
            max-width: 100%;
            max-height: 70vh;
            border-radius: 8px;
            background: #000;
        }}
        .media-actions {{
            display: flex;
            gap: 0.75rem;
            width: 100%;
            justify-content: flex-end;
        }}
        .ocr-box {{
            width: 100%;
            padding: 0.85rem;
            border-radius: 8px;
            background: var(--surface-container-high);
            border: 1px solid var(--outline-variant);
            font-size: 0.8rem;
        }}
        .ocr-title {{ font-weight: 600; color: var(--primary); margin-bottom: 0.35rem; }}
        .ocr-content {{ font-family: monospace; white-space: pre-wrap; color: var(--on-surface-variant); }}
        .link-card {{
            background: var(--surface-container);
            border: 1px solid var(--outline-variant);
            border-radius: 16px;
            overflow: hidden;
        }}
        .og-banner {{
            width: 100%;
            max-height: 320px;
            object-fit: cover;
            border-bottom: 1px solid var(--outline-variant);
        }}
        .link-content {{ padding: 1.25rem; }}
        .link-title {{
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--primary);
            text-decoration: none;
        }}
        .link-title:hover {{ text-decoration: underline; }}
        .link-desc {{ font-size: 0.85rem; color: var(--on-surface-variant); margin: 0.5rem 0; line-height: 1.5; }}
        .link-url {{ font-size: 0.75rem; color: var(--outline); word-break: break-all; }}
        footer {{
            margin-top: 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: var(--outline);
            padding-top: 1rem;
            border-top: 1px solid var(--outline-variant);
        }}
        .toast {{
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary);
            color: var(--on-primary);
            padding: 0.5rem 1.25rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: none;
            z-index: 100;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-group">
                <div class="logo-badge">&#9889;</div>
                <div class="title-group">
                    <h1>{title}</h1>
                    <div class="meta-sub">
                        <span class="badge">{kind}</span>
                        <span>&bull;</span>
                        <span>{date_str}</span>
                        {f'<span>&bull;</span><span>{location_str}</span>' if location_str else ''}
                    </div>
                </div>
            </div>
            <div>
                <button class="btn btn-primary" onclick="copyContent()">Copy Content</button>
            </div>
        </header>

        <main>
            {content_body}
        </main>

        <footer>
            <span>Shared privately via <strong>Phaste</strong> &bull; #{slug}</span>
        </footer>
    </div>

    <div id="toast" class="toast">Content copied to clipboard!</div>

    <script>
        function showToast(text) {{
            const t = document.getElementById('toast');
            if (text) t.innerText = text;
            t.style.display = 'block';
            setTimeout(() => {{ t.style.display = 'none'; }}, 2000);
        }}
        function copyText(val) {{
            navigator.clipboard.writeText(val).then(() => showToast('Copied to clipboard!'));
        }}
        function copyContent() {{
            const elem = document.getElementById('raw-content');
            if (elem) {{
                navigator.clipboard.writeText(elem.innerText).then(() => {{
                    showToast('Content copied to clipboard!');
                    const btn = document.getElementById('copy-btn-text');
                    if (btn) btn.innerText = 'Copied!';
                    setTimeout(() => {{ if (btn) btn.innerText = 'Copy Content'; }}, 2000);
                }});
            }} else {{
                copyText(window.location.href);
            }}
        }}
    </script>
</body>
</html>"""


@router.get("/sh/{slug}", response_class=HTMLResponse)
async def view_shared_phaste(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Public standalone viewing of a single Phaste via unguessable slug (Request 5).
    Accessible externally without Ingress OTP authentication.
    Does NOT leak the rest of the application or database.
    """
    res = await db.execute(select(Phaste).where(Phaste.public_slug == slug))
    item = res.scalar_one_or_none()
    if not item or item.is_archived:
        raise HTTPException(status_code=404, detail="Shared phaste not found or has expired.")

    # If programmatic client requests JSON, return structured schema
    accept = request.headers.get("accept", "").lower()
    if "application/json" in accept or request.query_params.get("format") == "json":
        return JSONResponse(content=PhasteResponse.model_validate(item).model_dump(mode="json"))

    return HTMLResponse(content=render_public_html(item, request))


@router.get("/s/{slug}")
async def redirect_old_slug(slug: str):
    """Backward compatibility redirect: /s/{slug} -> /sh/{slug}"""
    return RedirectResponse(url=f"/sh/{slug}", status_code=307)


@router.get("/sh/media/{file_path:path}")
async def get_public_media(file_path: str):
    """
    Public media serving endpoint scoped strictly under /sh/ so external viewers
    bypassing Ingress OTP on /sh/* can load images and videos for shared pastes.
    """
    base_dir = settings.MEDIA_ROOT.resolve()
    full_path = (settings.MEDIA_ROOT / file_path).resolve()
    if not str(full_path).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Media not found")

    mime, _ = mimetypes.guess_type(str(full_path))
    return FileResponse(full_path, media_type=mime or "application/octet-stream")


@router.get("/api/public/{slug}", response_model=PhasteResponse)
async def get_public_phaste_json(slug: str, db: AsyncSession = Depends(get_db)):
    """Public read-only API endpoint for a single Phaste."""
    res = await db.execute(select(Phaste).where(Phaste.public_slug == slug))
    item = res.scalar_one_or_none()
    if not item or item.is_archived:
        raise HTTPException(status_code=404, detail="Shared phaste not found")
    return PhasteResponse.model_validate(item)
