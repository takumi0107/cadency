"""Cadency API — FastAPI backend for AI-powered chord analysis and suggestions."""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from app.analyzer.youtube import analyze_youtube_url
from app.ai.suggest import suggest_next_chord, SuggestionResult
from app.ai.style_match import generate_progression, StyleInput, GenerationResult

app = FastAPI(title="Cadency API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def health_check():
    return {"service": "cadency-api", "version": "0.1.0"}


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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Download audio from a YouTube URL and return audio analysis."""
    try:
        result = analyze_youtube_url(str(request.url))
        return AnalyzeResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        return GenerateResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
