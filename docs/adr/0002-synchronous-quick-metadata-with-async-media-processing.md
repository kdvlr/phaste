# 0002. Synchronous Quick-Metadata Scraping with Asynchronous Heavy Media Ingestion

We decided that paste creation will synchronously scrape lightweight web metadata (title, favicon, open graph description) with a strict short timeout (up to 1.5s) before returning the initial response, allowing the UI to render an immediate preview card. Heavy tasks—such as full video downloads via `yt-dlp`, frame extraction, OCR, and multimodal vector embeddings—are dispatched to an asynchronous background worker and streamed/updated as they finish.
