import re
from typing import List

# Match hashtags: #tag_name, allowing alphanumeric and underscores/hyphens.
# Exclude pure numbers (#123) and standard hex color codes (#fff, #ffffff, #1a2b3c)
HASHTAG_REGEX = re.compile(r'(?<!\w)#([a-zA-Z0-9_\-]+)(?!\w)')
HEX_COLOR_REGEX = re.compile(r'^[0-9a-fA-F]{3,8}$')


def extract_hashtags(text: str) -> List[str]:
    """
    Extracts unique lowercase hashtag categories from text content.
    Filters out pure numbers and CSS hex color codes.
    """
    if not text:
        return []

    raw_matches = HASHTAG_REGEX.findall(text)
    tags = []
    seen = set()

    for match in raw_matches:
        cleaned = match.strip().lower()
        # Skip pure digits (e.g. #1, #2026)
        if cleaned.isdigit():
            continue
        # Skip CSS hex colors like #fff, #334155
        if HEX_COLOR_REGEX.match(cleaned) and len(cleaned) in (3, 4, 6, 8):
            continue
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            tags.append(cleaned)

    return tags
