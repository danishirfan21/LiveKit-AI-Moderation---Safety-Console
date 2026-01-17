from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration settings."""

    app_name: str = "LiveKit AI Moderation Console"
    debug: bool = True

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # LiveKit Configuration (for future webhook verification)
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    if not settings.openai_api_key:
        import os
        settings.openai_api_key = os.getenv("OPENAI_API_KEY", "")

    if not settings.openai_api_key:
        print("WARNING: OPENAI_API_KEY is not set. Moderation pipeline will fail.")
    return settings
