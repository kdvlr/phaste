import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from app.config import settings
from app.database import init_db
from app.routers import phastes, search, media, events, public


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and vector extension
    try:
        await init_db()
    except Exception as e:
        print(f"[Warning] DB initialization skipped or deferred: {e}")
    yield


app = FastAPI(
    title="Phaste",
    description="Paste in haste - instant self-hosted multimodal capture and search",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(phastes.router)
app.include_router(search.router)
app.include_router(media.router)
app.include_router(events.router)
app.include_router(public.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "phaste", "version": "0.1.0"}


# Mount static frontend build in production (ADR 0007)
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_spa_root():
        index_file = frontend_dist / "index.html"
        return FileResponse(index_file)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or public share endpoints
        if full_path.startswith("api/") or full_path.startswith("s/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        candidate = frontend_dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend bundle not found"})
