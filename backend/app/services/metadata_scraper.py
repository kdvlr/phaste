import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Dict, Any, Optional
from app.config import settings


async def scrape_quick_metadata(url: str, timeout: float = None) -> Dict[str, Any]:
    """
    Synchronously scrapes web metadata with a strict timeout (default 1.5s per ADR 0002).
    Returns title, description, favicon, image, site_name, and canonical URL.
    """
    if timeout is None:
        timeout = settings.SCRAPE_TIMEOUT_SECONDS

    result: Dict[str, Any] = {
        "title": None,
        "description": None,
        "image_url": None,
        "favicon_url": None,
        "site_name": None,
        "canonical_url": url,
        "scraped_successfully": False,
    }

    parsed = urlparse(url)
    default_favicon = f"{parsed.scheme}://{parsed.netloc}/favicon.ico"
    result["favicon_url"] = default_favicon
    result["site_name"] = parsed.netloc

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                return result

            content_type = resp.headers.get("content-type", "").lower()
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return result

            soup = BeautifulSoup(resp.text[:500000], "html.parser")

            # Extract title
            og_title = soup.find("meta", property="og:title")
            twitter_title = soup.find("meta", property="twitter:title")
            html_title = soup.find("title")

            if og_title and og_title.get("content"):
                result["title"] = og_title["content"].strip()
            elif twitter_title and twitter_title.get("content"):
                result["title"] = twitter_title["content"].strip()
            elif html_title and html_title.string:
                result["title"] = html_title.string.strip()

            # Extract description
            og_desc = soup.find("meta", property="og:description")
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if og_desc and og_desc.get("content"):
                result["description"] = og_desc["content"].strip()
            elif meta_desc and meta_desc.get("content"):
                result["description"] = meta_desc["content"].strip()

            # Extract image
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                result["image_url"] = urljoin(url, og_image["content"].strip())

            # Extract site name
            og_site = soup.find("meta", property="og:site_name")
            if og_site and og_site.get("content"):
                result["site_name"] = og_site["content"].strip()

            # Extract favicon
            icon_link = soup.find("link", rel=lambda r: r and "icon" in r.lower())
            if icon_link and icon_link.get("href"):
                result["favicon_url"] = urljoin(url, icon_link["href"].strip())

            result["scraped_successfully"] = True
    except Exception:
        # Graceful fallback on timeout or connection error per ADR 0002
        pass

    return result
