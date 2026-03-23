"""FastAPI dependencies for database sessions and session management."""

import uuid
from typing import AsyncGenerator

from fastapi import Cookie, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import AsyncSessionLocal
from app.db.models import Session as DbSession


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


SESSION_COOKIE = "cadency_sid"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # 1 year


async def get_or_create_session(
    response: Response,
    db: AsyncSession,
    cadency_sid: str | None = Cookie(default=None),
) -> DbSession:
    """Return the existing DB session or create a new one, setting the cookie."""
    if cadency_sid:
        db_session = await db.get(DbSession, cadency_sid)
        if db_session:
            return db_session

    # Create a new session
    db_session = DbSession(id=str(uuid.uuid4()))
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)

    response.set_cookie(
        key=SESSION_COOKIE,
        value=db_session.id,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return db_session
