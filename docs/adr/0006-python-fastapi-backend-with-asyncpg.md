# 0006. Python FastAPI Backend with Asyncpg and Native ML Integrations

We chose Python with FastAPI and `asyncpg`/SQLAlchemy for the `phaste` backend. This runtime provides first-class, in-process interoperability with `yt-dlp`, ONNX Runtime CPU vision embeddings, `pytesseract` OCR, and image processing libraries (`Pillow`), avoiding multi-process foreign language bridges while maintaining high async I/O throughput for web requests.
