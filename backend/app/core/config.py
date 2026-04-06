from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    supabase_db_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres"
    supabase_service_role_key: str = ""
    instagram_app_secret: str = ""
    instagram_verify_token: str = ""
    scheduler_enabled: bool = True
    mock_data_mode: bool = True

    @field_validator("supabase_db_url", mode="before")
    @classmethod
    def validate_supabase_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
