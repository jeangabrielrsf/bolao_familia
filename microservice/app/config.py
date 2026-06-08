from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CACHE_TTL_SECONDS: int = 300
    FOOTBALL_DATA_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
