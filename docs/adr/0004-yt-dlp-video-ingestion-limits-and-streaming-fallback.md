# 0004. yt-dlp Video Ingestion with 1080p / 500MB Ceilings and Fallback Streaming

We decided that when a video URL is pasted, `phaste` will asynchronously invoke `yt-dlp` with capped parameters (maximum resolution of 1080p and a configurable size limit defaulting to 500MB). Videos within limits are saved directly to local persistent storage for native streaming; videos exceeding constraints or blocked by provider restrictions gracefully fall back to storing metadata, thumbnail, and an embedded remote player without failing the paste.
