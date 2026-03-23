"""Cadency API — FastAPI backend for AI-powered chord analysis and suggestions."""

from dotenv import load_dotenv

load_dotenv()

import asyncio
import json
import re
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyzer.youtube import analyze_youtube_url
from app.ai.suggest import suggest_next_chord, SuggestionResult
from app.ai.style_match import generate_progression, StyleInput, GenerationResult
from app.db.engine import init_db, AsyncSessionLocal
from app.db.deps import get_db, get_or_create_session
from app.db.models import Session as DbSession
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
    allow_origins=["http://localhost:3000"],
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
# Analyze endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """Download audio from a YouTube URL and return audio analysis (cached by video ID)."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    video_id = extract_video_id(str(request.url))

    # Return cached result if available
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


@app.post("/analyze/stream")
async def analyze_stream(
    request: AnalyzeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cadency_sid: str | None = Cookie(default=None),
):
    """SSE endpoint — streams progress events then the final result."""
    db_session = await get_or_create_session(response, db, cadency_sid)
    video_id = extract_video_id(str(request.url))

    # Return cached result immediately if available
    if video_id:
        cached = await crud.get_analysis_by_video_id(db, video_id)
        if cached:
            data = {
                "status": "done",
                "result": {
                    "title": cached.title, "key": cached.key, "scale": cached.scale,
                    "tempo": cached.tempo, "energy": cached.energy, "mood": cached.mood,
                },
                "cached": True,
            }
            async def cached_stream():
                yield f"data: {json.dumps({'status': 'progress', 'data': {'step': 'cache', 'message': 'Loaded from cache'}})}\n\n"
                yield f"data: {json.dumps(data)}\n\n"
            return StreamingResponse(cached_stream(), media_type="text/event-stream")

    session_id = db_session.id

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def on_progress(status: str, data):
            loop.call_soon_threadsafe(queue.put_nowait, {"status": status, "data": data})

        def run():
            try:
                result = analyze_youtube_url(str(request.url), on_progress=on_progress)
                loop.call_soon_threadsafe(
                    queue.put_nowait, {"status": "done", "result": dict(result)}
                )
            except Exception as exc:
                loop.call_soon_threadsafe(
                    queue.put_nowait, {"status": "error", "error": str(exc)}
                )

        executor = ThreadPoolExecutor(max_workers=1)
        loop.run_in_executor(executor, run)

        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["status"] == "done":
                # Cache the result
                result = event.get("result", {})
                if video_id and result:
                    async with AsyncSessionLocal() as save_db:
                        await crud.create_analysis(save_db, session_id, video_id, result)
                break
            if event["status"] == "error":
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Suggest / Generate endpoints
# ---------------------------------------------------------------------------

@app.post("/suggest", response_model=SuggestResponse)
async def suggest(request: SuggestRequest):
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
async def generate(request: GenerateRequest):
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
