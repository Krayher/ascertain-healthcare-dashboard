from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://ascertain:ascertain@localhost:5432/ascertain"
    )
    api_cors_origins: str = Field(default="http://localhost:5173")
    log_level: str = Field(default="INFO")
    anthropic_api_key: str | None = Field(default=None)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
