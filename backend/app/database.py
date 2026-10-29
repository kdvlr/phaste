from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

async_session_factory = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        # Ensure pgvector extension exists
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Create all tables defined in models
        await conn.run_sync(Base.metadata.create_all)
        # Apply non-destructive migrations for new columns
        await conn.execute(text("ALTER TABLE phastes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_phastes_tags ON phastes USING gin (tags);"))
        await conn.execute(text("ALTER TABLE phastes ADD COLUMN IF NOT EXISTS is_trash BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE phastes ADD COLUMN IF NOT EXISTS is_todo BOOLEAN DEFAULT FALSE;"))
