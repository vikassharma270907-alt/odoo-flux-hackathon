"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Secrets come from the environment, never hardcoded."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite by default for a zero-setup demo; set DATABASE_URL to a
    # PostgreSQL DSN (postgresql+psycopg2://user:pass@host/db) for production.
    database_url: str = "sqlite:///./brightloop.db"

    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8
    algorithm: str = "HS256"

    app_name: str = "Brightloop Subscription Management"


settings = Settings()
