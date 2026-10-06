# ⚡ phaste — Paste in Haste

> **A self-hosted, multimodal instant-capture clipboard and search engine.**

`phaste` is designed for one primary goal: **frictionless haste**. Press `Cmd+V` or drop files anywhere on the screen, and `phaste` captures text, code, rich links, images, and streaming videos instantly—while automatically extracting rich spatial, temporal, and multimodal context in the background for unified hybrid search.

---

## 🌟 Key Highlights

- **Ambient Zero-Click Capture**: Press `Cmd+V` / `Ctrl+V` or drag-and-drop files anywhere on the screen. Content kind (`text`, `richtext`, `link`, `image`, `video`) is auto-detected without requiring focused inputs.
- **Synchronous Fast Previews + Async Enrichment**: Quick OpenGraph scraping (up to 1.5s) creates instant preview cards; background workers handle heavy video downloads and ML embeddings asynchronously.
- **yt-dlp Video Archiving**: Pasting a video URL (YouTube, Twitter/X, TikTok, Reddit, direct MP4) downloads the video (up to 1080p / 500MB) directly into local storage, with graceful fallback to remote embeds if limits are exceeded.
- **Multimodal Image Search**:
  - **Visual Semantics**: CPU-friendly ONNX vision embeddings (CLIP) project images into vector space.
  - **OCR Text Detection**: Tesseract OCR extracts text from screenshots, receipts, and photos.
  - **Hybrid Omnibar**: Blends PostgreSQL full-text search (`tsvector`) and cosine vector similarity (`pgvector`) with Reciprocal Rank Fusion (RRF).
- **Offline Geocoding & Context**: Extracts image EXIF GPS, client location, and timezone, reverse-geocoding coordinates offline into City, State, and Country names without external API keys.
- **Material 3 (MD3) Design**: Tonal palettes, 28px rounded corners, elevation layers, and responsive typography scales.
- **Byte-Range Video Streaming**: Supports HTTP `Range` headers (`206 Partial Content`) for instant scrubbing and seeking in video players.

---

## 🏗️ Architecture & Decisions

`phaste` was designed using the [`grill-with-docs`](./GLOSSARY.md) discipline. All core architectural decisions are recorded in [`docs/adr/`](./docs/adr/):

- [`0001`](./docs/adr/0001-postgresql-with-pgvector.md) — PostgreSQL with `pgvector`
- [`0002`](./docs/adr/0002-synchronous-quick-metadata-with-async-media-processing.md) — Two-Tier Synchronous Scraping & Async Heavy Media Ingestion
- [`0003`](./docs/adr/0003-dual-local-vision-embedding-and-ocr.md) — Dual Local Vision Embeddings and OCR Pipeline
- [`0004`](./docs/adr/0004-yt-dlp-video-ingestion-limits-and-streaming-fallback.md) — `yt-dlp` Video Ingestion Limits (1080p / 500MB) & Stream Fallback
- [`0005`](./docs/adr/0005-single-tenant-security-with-proxy-auth-and-api-tokens.md) — Single-Tenant Security with Proxy Auth & API Tokens
- [`0006`](./docs/adr/0006-python-fastapi-backend-with-asyncpg.md) — Python FastAPI Backend with Asyncpg
- [`0007`](./docs/adr/0007-react-vite-spa-with-tailwind-md3.md) — React SPA with Vite & Tailwind Material 3 Tokens
- [`0008`](./docs/adr/0008-comprehensive-context-extraction-and-offline-geocoding.md) — Comprehensive Multi-Layer Context Extraction & Offline Geocoding
- [`0009`](./docs/adr/0009-unified-omnibar-hybrid-lexical-and-semantic-ranking.md) — Unified Omnibar with Hybrid Lexical & Semantic Ranking (RRF)
- [`0010`](./docs/adr/0010-local-persistent-volume-media-storage-with-byte-range-streaming.md) — Local Persistent Media Volume with Byte-Range Streaming
- [`0011`](./docs/adr/0011-ambient-zero-click-global-capture-with-transient-feedback.md) — Ambient Zero-Click Global Capture with Transient Feedback
- [`0012`](./docs/adr/0012-ingress-otp-deployment-and-bearer-bypass.md) — Ingress OTP Gate Deployment on `phaste.dkiran.com` with Bearer Bypass

See [`GLOSSARY.md`](./GLOSSARY.md) for canonical domain vocabulary.

---

## 🚀 Quick Start (Local Development)

To run `phaste` locally with an embedded `pgvector` database:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🚢 Deployment on `linsrv`

`phaste` is pre-configured to run on `linsrv` reusing the existing PostgreSQL container on the `linsrv_default` network.

1. **Verify Database**: The `phaste` database and `vector` extension have already been initialized in `postgres`.
2. **Start the Service**:
   ```bash
   docker compose up -d --build
   ```
3. **Caddy Ingress Routing**:
   Append the contents of [`Caddyfile.snippet`](./Caddyfile.snippet) to `/docker/caddyv2/Caddyfile` on `linsrv` and reload Caddy:
   ```bash
   /docker/caddyv2/caddy validate --config /docker/caddyv2/Caddyfile
   cd /docker/caddyv2 && ./caddy reload --config Caddyfile
   ```

---

## ⌨️ Keyboard Shortcuts & Search Syntax

- `Cmd + V` / `Ctrl + V`: Ambient paste from anywhere on the page
- `Cmd + K` or `/`: Focus the Omnibar
- `Escape`: Clear search or dismiss modal

### Search Syntax in the Omnibar:
- `flight ticket` — Hybrid search (matches OCR text, notes, and visual concepts)
- `kind:image` / `kind:video` / `kind:link` / `kind:text` — Filter by content kind
- `city:Chicago` / `city:"New York"` — Filter by resolved offline location
- `pinned:true` — Filter by pinned items
