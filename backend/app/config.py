from typing import List, Union, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings loaded from Environment Variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "CampusSync API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/campus_sync"

    # JWT Authentication Configuration
    JWT_SECRET_KEY: str = "development-only-insecure-key-change-before-deploy"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"
    AI_SUMMARY_MAX_OUTPUT_TOKENS: int = 1200
    AI_ANSWER_MAX_OUTPUT_TOKENS: int = 900
    AI_DAILY_LIMIT_STUDENT: int = 25
    AI_DAILY_LIMIT_STAFF: int = 100

    # CORS Configuration
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.strip():
                return []
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(origin).strip() for origin in v]
        return ["http://localhost:5173"]

    @model_validator(mode="after")
    def validate_runtime_security(self):
        if not 128 <= self.AI_SUMMARY_MAX_OUTPUT_TOKENS <= 4000:
            raise ValueError("AI_SUMMARY_MAX_OUTPUT_TOKENS must be between 128 and 4000.")
        if not 128 <= self.AI_ANSWER_MAX_OUTPUT_TOKENS <= 4000:
            raise ValueError("AI_ANSWER_MAX_OUTPUT_TOKENS must be between 128 and 4000.")
        if not 1 <= self.AI_DAILY_LIMIT_STUDENT <= 500 or not 1 <= self.AI_DAILY_LIMIT_STAFF <= 1000:
            raise ValueError("AI daily request limits are outside the allowed range.")
        if "*" in self.ALLOWED_ORIGINS:
            raise ValueError("ALLOWED_ORIGINS cannot contain '*' while credentialed requests are enabled.")
        if self.ENVIRONMENT.casefold() in {"production", "prod"}:
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production.")
            unsafe_secrets = {
                "development-only-insecure-key-change-before-deploy",
                "change_this_to_a_secure_random_secret_key_in_production",
                "super_secret_jwt_key_campussync_2026_production_foundation",
            }
            if len(self.JWT_SECRET_KEY.encode("utf-8")) < 32 or self.JWT_SECRET_KEY in unsafe_secrets:
                raise ValueError("Set JWT_SECRET_KEY to a unique random value of at least 32 bytes in production.")
            if not self.ALLOWED_ORIGINS:
                raise ValueError("Set explicit ALLOWED_ORIGINS for production.")
            if not self.DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg://", "postgresql+psycopg2://")):
                raise ValueError("Production requires a PostgreSQL DATABASE_URL.")
        return self


settings = Settings()
