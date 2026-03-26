"""Async SQLAlchemy engine + session factory."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base

DB_PATH = "cadency.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create tables and enable WAL mode."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await session.execute(text("PRAGMA journal_mode=WAL"))
        await session.commit()

        # Safe migrations: add columns to sessions if not present (existing DBs)
        for col_sql in [
            "ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE sessions ADD COLUMN oauth_state VARCHAR(64)",
        ]:
            try:
                await session.execute(text(col_sql))
                await session.commit()
            except Exception:
                await session.rollback()  # Column already exists — ignore
