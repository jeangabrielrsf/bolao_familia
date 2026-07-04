from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CACHE_TTL_SECONDS: int = 300
    FOOTBALL_DATA_API_KEY: str = ""
    DATABASE_URL: str = ""
    CRON_SECRET: str = ""
    NEXTJS_BASE_URL: str = ""  # ex: https://bolao-copa.vercel.app
    LOCK_KEY_RESULTADOS_SYNC: int = 987654321

    class Config:
        env_file = ".env"


settings = Settings()
