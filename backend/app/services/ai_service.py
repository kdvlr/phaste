import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intelligent knowledge extraction assistant for a multi-format personal vault and pastebin (Phaste).
Given the content, transcript, or metadata of a paste, provide structured enrichment.
Return ONLY valid JSON matching this schema:
{
  "suggested_title": "Descriptive title (<= 60 characters) ALWAYS prefixed with a single relevant emoji (e.g. '🐼 Polar Bears', '🪴 My green friends', '💻 Swift Basics', '🍕 Homemade Pizza'). Avoid generic titles like 'Paste' or 'Text'.",
  "summary": "1 to 2 sentences summarizing the core content, purpose, or essence.",
  "tags": ["3 to 5 lowercase keyword category tags for the sidebar (e.g. ['bear', 'nature', 'arctic'] or ['code', 'swift', 'programming'] or ['recipe', 'pizza', 'cooking'])"]
}
Do not include any markdown fences or explanatory text outside the JSON object."""


class AIService:
    def __init__(self):
        self.base_url = settings.LITELLM_BASE_URL.rstrip("/")
        self.api_key = settings.LITELLM_API_KEY
        self.model = settings.LITELLM_MODEL
        self.enabled = settings.LITELLM_ENABLED

    async def enrich_paste(
        self,
        title: Optional[str] = None,
        content: Optional[str] = None,
        ocr_transcript: Optional[str] = None,
        kind: str = "text",
        og_metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Enriches a paste with an AI-generated concise title, executive summary, and tags.
        """
        if not self.enabled or not self.api_key:
            return None

        # Build context prompt
        parts = [f"Content Kind: {kind}"]
        if title and title.strip():
            parts.append(f"Existing Title: {title.strip()}")
        if content and content.strip():
            # Truncate content to 8000 characters to stay well within token limits
            parts.append(f"Content:\n{content.strip()[:8000]}")
        if ocr_transcript and ocr_transcript.strip():
            parts.append(f"OCR Extracted Text:\n{ocr_transcript.strip()[:4000]}")
        if og_metadata and isinstance(og_metadata, dict):
            og_title = og_metadata.get("title")
            og_desc = og_metadata.get("description")
            if og_title:
                parts.append(f"Page Title: {og_title}")
            if og_desc:
                parts.append(f"Page Description: {og_desc}")

        if len(parts) == 1 and not content and not ocr_transcript:
            return None

        user_prompt = "\n\n".join(parts)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if resp.status_code >= 400:
                    logger.warning(
                        "LiteLLM error %s: %s", resp.status_code, resp.text[:200]
                    )
                    return None

                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```", 2)[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                    raw_text = raw_text.strip()

                parsed = json.loads(raw_text)
                return {
                    "suggested_title": str(parsed.get("suggested_title", "")).strip(),
                    "summary": str(parsed.get("summary", "")).strip(),
                    "tags": [
                        str(t).strip().lower()
                        for t in parsed.get("tags", [])
                        if str(t).strip()
                    ],
                    "model": self.model,
                }
        except Exception as e:
            logger.warning("AI enrichment failed: %s", e)
            return None


ai_service = AIService()
