"""Cadency API — FastAPI backend for AI-powered chord analysis and suggestions."""

from dotenv import load_dotenv

load_dotenv()

import os
import re
import secrets
from contextlib import asynccontextmanager
from datetime import date

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyzer.youtube import analyze_youtube_url
from app.ai.suggest import suggest_next_chord, SuggestionResult
from app.ai.style_match import generate_progression, StyleInput, GenerationResult
from app.auth.google import exchange_code, fetch_user_info, get_oauth_url
from app.db.engine import init_db
from app.db.deps import get_db, get_or_create_session, require_quota
from app.db.models import Session as DbSession, User
from app.db import crud


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Cadency API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://cadency-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_YT_VIDEO_ID_RE = re.compile(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})")


def extract_video_id(url: str) -> str | None:
    m = _YT_VIDEO_ID_RE.search(url)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    url: str


class AnalyzeResponse(BaseModel):
    title: str
    key: str
    scale: str
    tempo: float
    energy: float
    mood: str


class SuggestRequest(BaseModel):
    progression: list[str]
    key: str
    style_context: str


class SuggestResponse(BaseModel):
    suggestions: list[dict]


class GenerateRequest(BaseModel):
    style: dict
    length: int = 4


class GenerateResponse(BaseModel):
    progression: list[str]
    description: str
    theory_note: str


class ProgressionCreate(BaseModel):
    name: str = "Untitled"
    chords: list[str]
    key: str = ""
    mood: str = ""
    bpm: int = 120
    description: str = ""
    theory_note: str = ""


class ProgressionResponse(BaseModel):
    id: int
    name: str
    chords: list[str]
    key: str
    mood: str
    bpm: int
    description: str
    theory_note: str
    created_at: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def health_check():
    return {"service": "cadency-api", "version": "0.1.0"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.get("/auth/debug")
async def auth_debug():
    """Show OAuth config for debugging — remove before going live."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "NOT SET")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "NOT SET")
    frontend_url = os.environ.get("FRONTEND_URL", "NOT SET")
    state = "debug"
    oauth_url = get_oauth_url(state) if client_id != "NOT SET" and redirect_uri != "NOT SET" else "cannot build — env vars missing"
    return {
        "GOOGLE_CLIENT_ID": client_id,
        "GOOGLE_REDIRECT_URI": redirect_uri,
        "FRONTEND_URL": frontend_url,
        "oauth_url_that_would_be_sent": oauth_url,
    }


@app.get("/auth/google")
async def auth_google():
    """Redirect to Google OAuth consent screen."""
    state = secrets.token_urlsafe(16)
    redirect = RedirectResponse(url=get_oauth_url(state))
    redirect.set_cookie("oauth_state", state, max_age=600, httponly=True, samesite="lax")
    return redirect


@app.get("/auth/google/callback")
async def auth_google_callback(
    code: str,
    state: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
    oauth_state: str | None = Cookie(default=None),
):
    """Handle Google OAuth callback, create/update user, link to session."""
    if not oauth_state or state != oauth_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        tokens = exchange_code(code)
        user_info = fetch_user_info(tokens["access_token"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {exc}") from exc

    user = await crud.get_or_create_user(
        db,
        google_id=user_info["id"],
        email=user_info["email"],
        name=user_info["name"],
        avatar_url=user_info.get("picture"),
    )

    db_session = await get_or_create_session(response, db, cadency_sid)
    db_session.user_id = user.id
    await db.commit()

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    redirect = RedirectResponse(url=frontend_url)
    redirect.delete_cookie("oauth_state")
    return redirect


@app.get("/auth/me")
async def auth_me(
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Return current user info and today's usage, or null if not logged in."""
    if not cadency_sid:
        return None
    db_session = await db.get(DbSession, cadency_sid)
    if not db_session or not db_session.user_id:
        return None
    user = await db.get(User, db_session.user_id)
    if not user:
        return None

    today = date.today().isoformat()
    usage_today = user.usage_count if user.usage_date == today else 0
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "usage_today": usage_today,
        "usage_limit": crud.DAILY_LIMIT,
    }


@app.post("/auth/logout")
async def auth_logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Unlink the session from the user and clear the session cookie."""
    if cadency_sid:
        db_session = await db.get(DbSession, cadency_sid)
        if db_session:
            db_session.user_id = None
            await db.commit()
    response.delete_cookie("cadency_sid")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Analyze endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
    _: User = Depends(require_quota),
):
    """Fetch YouTube metadata and use Gemini to determine key/mood/tempo (cached by video ID)."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    video_id = extract_video_id(str(request.url))

    if video_id:
        cached = await crud.get_analysis_by_video_id(db, video_id)
        if cached:
            return AnalyzeResponse(
                title=cached.title, key=cached.key, scale=cached.scale,
                tempo=cached.tempo, energy=cached.energy, mood=cached.mood,
            )

    try:
        result = analyze_youtube_url(str(request.url))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if video_id:
        await crud.create_analysis(db, db_session.id, video_id, result)

    return AnalyzeResponse(**result)


# ---------------------------------------------------------------------------
# Suggest / Generate endpoints
# ---------------------------------------------------------------------------

@app.post("/suggest", response_model=SuggestResponse)
async def suggest(request: SuggestRequest, _: User = Depends(require_quota)):
    """Return 3 chord suggestions that fit after the given progression."""
    try:
        result: SuggestionResult = suggest_next_chord(
            progression=request.progression,
            key=request.key,
            style_context=request.style_context,
        )
        return SuggestResponse(suggestions=result["suggestions"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, _: User = Depends(require_quota)):
    """Generate a chord progression matching the given style."""
    try:
        style = StyleInput(
            key=request.style.get("key", "C major"),
            mood=request.style.get("mood", "neutral"),
            tempo=request.style.get("tempo", 120),
        )
        result: GenerationResult = generate_progression(style=style, length=request.length)
        return GenerateResponse(**result.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Progressions endpoints
# ---------------------------------------------------------------------------

@app.get("/progressions", response_model=list[ProgressionResponse])
async def list_progressions(
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """List all saved progressions for the current session."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    progs = await crud.list_progressions(db, db_session.id)
    return [
        ProgressionResponse(
            id=p.id, name=p.name, chords=p.chords, key=p.key, mood=p.mood,
            bpm=p.bpm, description=p.description, theory_note=p.theory_note,
            created_at=p.created_at.isoformat(),
        )
        for p in progs
    ]


@app.post("/progressions", response_model=ProgressionResponse, status_code=201)
async def save_progression(
    body: ProgressionCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Save a chord progression to the current session."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    prog = await crud.create_progression(db, db_session.id, body.model_dump())
    return ProgressionResponse(
        id=prog.id, name=prog.name, chords=prog.chords, key=prog.key, mood=prog.mood,
        bpm=prog.bpm, description=prog.description, theory_note=prog.theory_note,
        created_at=prog.created_at.isoformat(),
    )


@app.patch("/progressions/{prog_id}", response_model=ProgressionResponse)
async def rename_progression(
    prog_id: int,
    body: dict,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Rename a saved progression."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    name = body.get("name", "").strip() or "Untitled"
    prog = await crud.rename_progression(db, prog_id, db_session.id, name)
    if not prog:
        raise HTTPException(status_code=404, detail="Progression not found")
    return ProgressionResponse(
        id=prog.id, name=prog.name, chords=prog.chords, key=prog.key, mood=prog.mood,
        bpm=prog.bpm, description=prog.description, theory_note=prog.theory_note,
        created_at=prog.created_at.isoformat(),
    )


@app.delete("/progressions/{prog_id}", status_code=204)
async def delete_progression(
    prog_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Delete a saved progression (must belong to the current session)."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    deleted = await crud.delete_progression(db, prog_id, db_session.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Progression not found")
