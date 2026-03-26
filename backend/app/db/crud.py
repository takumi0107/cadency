"""CRUD helpers for users, analyses, and progressions."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Analysis, Progression, Session as DbSession, User

DAILY_LIMIT = 20


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalars().first()


async def get_or_create_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    name: str,
    avatar_url: str | None,
) -> User:
    user = await get_user_by_google_id(db, google_id)
    if user:
        user.name = name
        user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user
    user = User(google_id=google_id, email=email, name=name, avatar_url=avatar_url)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def check_and_increment_usage(db: AsyncSession, user: User) -> tuple[int, int]:
    """Increment daily usage counter. Returns (new_count, limit). Does NOT raise."""
    today = date.today().isoformat()
    if user.usage_date != today:
        user.usage_count = 0
        user.usage_date = today
    user.usage_count += 1
    await db.commit()
    return user.usage_count, DAILY_LIMIT


# ---------------------------------------------------------------------------
# Analysis cache
# ---------------------------------------------------------------------------

async def get_analysis_by_video_id(db: AsyncSession, video_id: str) -> Analysis | None:
    result = await db.execute(
        select(Analysis).where(Analysis.video_id == video_id).order_by(Analysis.created_at.desc())
    )
    return result.scalars().first()


async def create_analysis(db: AsyncSession, session_id: str, video_id: str, data: dict) -> Analysis:
    analysis = Analysis(session_id=session_id, video_id=video_id, **data)
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis


# ---------------------------------------------------------------------------
# Progressions
# ---------------------------------------------------------------------------

async def list_progressions(db: AsyncSession, session_id: str) -> list[Progression]:
    result = await db.execute(
        select(Progression)
        .where(Progression.session_id == session_id)
        .order_by(Progression.created_at.desc())
    )
    return list(result.scalars().all())


async def create_progression(db: AsyncSession, session_id: str, data: dict) -> Progression:
    prog = Progression(session_id=session_id, **data)
    db.add(prog)
    await db.commit()
    await db.refresh(prog)
    return prog


async def get_progression(db: AsyncSession, prog_id: int, session_id: str) -> Progression | None:
    result = await db.execute(
        select(Progression).where(Progression.id == prog_id, Progression.session_id == session_id)
    )
    return result.scalars().first()


async def delete_progression(db: AsyncSession, prog_id: int, session_id: str) -> bool:
    prog = await get_progression(db, prog_id, session_id)
    if not prog:
        return False
    await db.delete(prog)
    await db.commit()
    return True


async def rename_progression(db: AsyncSession, prog_id: int, session_id: str, name: str) -> Progression | None:
    prog = await get_progression(db, prog_id, session_id)
    if not prog:
        return None
    prog.name = name
    await db.commit()
    await db.refresh(prog)
    return prog
