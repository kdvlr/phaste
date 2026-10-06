import asyncio
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlparse
import yt_dlp
from app.config import settings

VIDEO_URL_PATTERNS = [
    r"youtube\.com/watch\?v=",
    r"youtu\.be/",
    r"youtube\.com/shorts/",
    r"vimeo\.com/\d+",
    r"twitter\.com/.+/status/\d+",
    r"x\.com/.+/status/\d+",
    r"tiktok\.com/@.+/video/\d+",
    r"reddit\.com/r/.+/comments/",
    r"instagram\.com/(?:p|reel)/",
    r"\.(mp4|webm|m4v|mov|mkv)(\?.*)?$",
]


def is_video_url(url: str) -> bool:
    """Check if URL points to a supported video platform or direct media stream."""
    if not url:
        return False
    return any(re.search(pattern, url, re.IGNORECASE) for pattern in VIDEO_URL_PATTERNS)


async def inspect_video_metadata(url: str) -> Dict[str, Any]:
    """Extract video metadata without downloading the full payload."""
    loop = asyncio.get_running_loop()

    def _extract():
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)

    try:
        info = await loop.run_in_executor(None, _extract)
        return {
            "title": info.get("title"),
            "description": info.get("description"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "filesize_approx": info.get("filesize_approx") or info.get("filesize"),
            "width": info.get("width"),
            "height": info.get("height"),
            "extractor": info.get("extractor"),
        }
    except Exception as e:
        return {"error": str(e)}


async def download_video(
    url: str,
    output_dir: Path,
    base_filename: str
) -> Tuple[bool, Dict[str, Any]]:
    """
    Download video via yt-dlp respecting ADR 0004 limits (<=1080p, <=500MB).
    Returns (success, result_dict).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    out_tmpl = str(output_dir / f"{base_filename}.%(ext)s")
    max_bytes = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
    max_height = settings.MAX_VIDEO_HEIGHT

    loop = asyncio.get_running_loop()

    ydl_opts = {
        "format": f"bestvideo[height<={max_height}][filesize<={max_bytes}]+bestaudio/best[height<={max_height}][filesize<={max_bytes}]/best",
        "outtmpl": out_tmpl,
        "merge_output_format": "mp4",
        "writethumbnail": True,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "max_filesize": max_bytes,
        "postprocessors": [
            {
                "key": "FFmpegThumbnailsConvertor",
                "format": "jpg",
            }
        ],
    }

    def _download():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return info

    try:
        info = await loop.run_in_executor(None, _download)
        
        # Locate downloaded media file
        expected_mp4 = output_dir / f"{base_filename}.mp4"
        thumb_jpg = output_dir / f"{base_filename}.jpg"

        file_path = expected_mp4 if expected_mp4.exists() else None
        if not file_path:
            # Check for any file matching base_filename
            for f in output_dir.glob(f"{base_filename}.*"):
                if f.suffix not in [".jpg", ".png", ".webp", ".part"]:
                    file_path = f
                    break

        thumbnail_path = thumb_jpg if thumb_jpg.exists() else None
        if not thumbnail_path:
            for f in output_dir.glob(f"{base_filename}*.jpg"):
                thumbnail_path = f
                break

        size_bytes = file_path.stat().st_size if file_path and file_path.exists() else None

        return True, {
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "thumbnail_url": info.get("thumbnail"),
            "file_path": str(file_path) if file_path else None,
            "thumbnail_path": str(thumbnail_path) if thumbnail_path else None,
            "size_bytes": size_bytes,
            "width": info.get("width"),
            "height": info.get("height"),
            "format": info.get("format"),
        }
    except Exception as e:
        # Graceful fallback per ADR 0004
        return False, {
            "error": str(e),
            "fallback_stream": True,
        }
