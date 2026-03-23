"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Session(Base):
    """Anonymous browser session identified by a cookie UUID."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_seen: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    progressions: Mapped[list["Progression"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Analysis(Base):
    """Cached YouTube analysis result keyed by video ID."""

    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), nullable=False)
    video_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    key: Mapped[str] = mapped_column(String(32), nullable=False)
    scale: Mapped[str] = mapped_column(String(32), nullable=False)
    tempo: Mapped[float] = mapped_column(Float, nullable=False)
    energy: Mapped[float] = mapped_column(Float, nullable=False)
    mood: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session: Mapped["Session"] = relationship(back_populates="analyses")


class Progression(Base):
    """A saved chord progression belonging to a session."""

    __tablename__ = "progressions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="Untitled")
    chords: Mapped[list] = mapped_column(JSON, nullable=False)  # list[str]
    key: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    mood: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    bpm: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    theory_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    session: Mapped["Session"] = relationship(back_populates="progressions")
