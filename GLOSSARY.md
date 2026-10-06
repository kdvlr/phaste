# Phaste Domain Model

The ubiquitous domain vocabulary for `phaste`, a self-hosted instant capture and retrieval system for multimodal content.

## Language

**Phaste**:
An individual captured item stored in the system, containing original content, derived metadata, and search indexes.
_Avoid_: Paste, snippet, entry, clip, note

**Kind**:
The primary content classification of a Phaste, determining how it was created and rendered (`text`, `richtext`, `link`, `image`, `video`).
_Avoid_: Content-type, category, format

**Link Phaste**:
A Phaste originating from a web URL, augmented with scraped title, preview image, favicon, and source domain.
_Avoid_: Bookmark, URL paste, web clip

**Video Phaste**:
A Phaste representing video content, originating either from a direct video file upload or a downloaded external streaming URL.
_Avoid_: Movie, clip, stream

**Image Phaste**:
A Phaste representing visual media, containing dimensions, color profile, extracted OCR text, and visual semantic embeddings.
_Avoid_: Picture, photo, graphic

**Metadata Context**:
Environmental and spatial-temporal data associated with a Phaste, including creation timestamp, geolocation (from EXIF or client), and source client.
_Avoid_: Tags, extra info, properties

**Visual Embedding**:
A fixed-dimensional mathematical vector representing the semantic visual meaning of an Image Phaste in a shared vision-language space.
_Avoid_: Vector, image hash, feature map

**OCR Transcript**:
The machine-readable text extracted from visible characters inside an Image Phaste.
_Avoid_: Image text, extracted text, scan

**Omnibar**:
The primary search and filter control that accepts text queries, natural language prompts, and structured filter tokens.
_Avoid_: Search box, query input, filter bar

**Ambient Capture**:
The client-wide listener that intercepts global paste actions and file drops without requiring focused form fields.
_Avoid_: Global paste, drop listener, auto-paste

**Public Slug**:
A non-sequential, cryptographically random identifier enabling direct unauthenticated viewing of an individual Phaste.
_Avoid_: Share link, public ID, short URL

