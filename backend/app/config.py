from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Diagnostic Assistant 1C"
    database_url: str = "sqlite:///./app.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change_me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080


settings = Settings()
