from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = "postgresql+asyncpg://phaste:RWx3LNo7qZF7DcEeMFDfcAA1@postgres:5432/phaste"
    PHASTE_API_TOKEN: str = "phaste_default_secret_token_123"
    MEDIA_ROOT: Path = Path("/data/media")
    MODELS_CACHE_DIR: Path = Path("/data/models")
    
    # Ingestion constraints
    MAX_VIDEO_SIZE_MB: int = 500
    MAX_VIDEO_HEIGHT: int = 1080
    SCRAPE_TIMEOUT_SECONDS: float = 1.5
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    TRUST_PROXY_HEADERS: bool = True


settings = Settings()

# Ensure local directories exist if running locally
try:
    settings.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    settings.MODELS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
