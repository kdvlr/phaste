import asyncio
from pathlib import Path
from typing import Optional
from PIL import Image
import pytesseract


async def extract_ocr_transcript(image_path: Path) -> Optional[str]:
    """
    Extract readable text characters from an image file using Tesseract OCR.
    Runs in an executor to avoid blocking the async event loop.
    """
    if not image_path.exists():
        return None

    loop = asyncio.get_running_loop()

    def _ocr():
        try:
            with Image.open(image_path) as img:
                # Convert image to RGB if needed (handles RGBA, P, etc.)
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                
                # Perform OCR
                text = pytesseract.image_to_string(img, timeout=10)
                cleaned = " ".join(text.split()).strip()
                return cleaned if cleaned else None
        except Exception:
            return None

    return await loop.run_in_executor(None, _ocr)
