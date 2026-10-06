import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    BigInteger,
    Float,
    Boolean,
    DateTime,
    Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from pgvector.sqlalchemy import Vector
from app.database import Base


def generate_slug() -> str:
    """Generate a 10-character URL-safe unguessable slug."""
    return secrets.token_urlsafe(8)[:10]


class Phaste(Base):
    __tablename__ = "phastes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_slug = Column(String(32), unique=True, nullable=False, default=generate_slug, index=True)
    
    # Domain Kind: text, richtext, link, image, video
    kind = Column(String(32), nullable=False, default="text", index=True)
    
    # Ingestion status: ready, processing, fallback_stream, failed
    status = Column(String(32), nullable=False, default="ready", index=True)
    error_message = Column(Text, nullable=True)

    title = Column(String(512), nullable=True)
    content = Column(Text, nullable=True)
    rendered_content = Column(Text, nullable=True)
    source_url = Column(String(2048), nullable=True, index=True)

    # Media assets stored on disk
    media_path = Column(String(512), nullable=True)
    thumbnail_path = Column(String(512), nullable=True)
    media_mime_type = Column(String(128), nullable=True)
    media_size_bytes = Column(BigInteger, nullable=True)
    media_dimensions = Column(JSONB, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Search & Multimodal
    ocr_transcript = Column(Text, nullable=True)
    visual_embedding = Column(Vector(512), nullable=True)
    search_vector = Column(TSVECTOR, nullable=True)

    # Comprehensive multi-layer context (geo, client, EXIF, OpenGraph)
    metadata_context = Column(JSONB, nullable=False, default=dict)

    is_pinned = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_phastes_search_vector", "search_vector", postgresql_using="gin"),
        Index("idx_phastes_metadata_context", "metadata_context", postgresql_using="gin"),
        Index("idx_phastes_feed", "is_pinned", "created_at"),
        Index(
            "idx_phastes_visual_embedding",
            "visual_embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"visual_embedding": "vector_cosine_ops"}
        ),
    )
