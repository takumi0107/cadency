"""FastAPI dependencies for database sessions, auth, and rate limiting."""

import uuid
from typing import AsyncGenerator

from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import AsyncSessionLocal
from app.db.models import Session as DbSession, User


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


async def require_quota(
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
) -> User:
    """Require an authenticated user and enforce the 20/day rate limit."""
    if not cadency_sid:
        raise HTTPException(status_code=401, detail="Sign in to use this feature")
    db_session = await db.get(DbSession, cadency_sid)
    if not db_session or not db_session.user_id:
        raise HTTPException(status_code=401, detail="Sign in to use this feature")
    user = await db.get(User, db_session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to use this feature")

    from app.db.crud import check_and_increment_usage
    count, limit = await check_and_increment_usage(db, user)
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {limit} uses reached. Resets at midnight.",
        )
    return user
