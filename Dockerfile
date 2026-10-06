# ==========================================
# Stage 1: Build React Vite SPA (MD3)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python FastAPI + ML Backend
# ==========================================
FROM python:3.12-slim

# Install system dependencies (ffmpeg for video/audio transcoding, tesseract for OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-eng \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy compiled frontend SPA bundle into place for static serving (ADR 0007)
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Persistent media & model directories
RUN mkdir -p /data/media /data/models

ENV MEDIA_ROOT=/data/media
ENV MODELS_CACHE_DIR=/data/models
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
