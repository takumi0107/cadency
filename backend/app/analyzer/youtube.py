"""YouTube metadata fetch using YouTube Data API v3 + Gemini-based analysis."""

import json
import os
import re
from typing import TypedDict

import httpx


class AnalysisResult(TypedDict):
    title: str
    key: str
    scale: str
    tempo: float
    energy: float
    mood: str


def _fetch_video_metadata(video_id: str) -> dict:
    """Fetch video snippet from YouTube Data API v3."""
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY environment variable not set")

    resp = httpx.get(
        "https://www.googleapis.com/youtube/v3/videos",
        params={"part": "snippet", "id": video_id, "key": api_key},
        timeout=10,
    )
    resp.raise_for_status()
    items = resp.json().get("items", [])
    if not items:
        raise RuntimeError(f"Video not found: {video_id}")
    return items[0]["snippet"]


def _analyze_with_gemini(title: str, description: str, tags: list[str]) -> dict:
    """Use Gemini to infer key, scale, tempo, energy, and mood from metadata."""
    from google import genai

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    tags_str = ", ".join(tags[:20]) if tags else "none"

    prompt = f"""You are a music analysis expert. Based on the YouTube video metadata below, determine the musical characteristics of the song.

Title: {title}
Description (first 500 chars): {description[:500]}
Tags: {tags_str}

Return ONLY a JSON object with these exact fields:
- key: root note as a string (e.g. "C", "F#", "Bb")
- scale: "Ionian" for major keys, "Aeolian" for minor keys
- tempo: estimated BPM as a number (e.g. 120.0)
- energy: estimated energy level from 0.0 to 1.0
- mood: a short mood description (e.g. "melancholic", "upbeat & energetic", "calm & warm", "dark & heavy")

Base your analysis on:
- Song title keywords (minor, major, sad, happy, dark, ambient, etc.)
- Genre cues in title/tags (trap, jazz, lo-fi, EDM, classical, etc.)
- Artist style if recognizable from the title or channel
- Any musical key or BPM mentioned in the title, description, or tags

Return only valid JSON, no markdown, no explanation."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def analyze_youtube_url(url: str, on_progress=None) -> AnalysisResult:
    """
    Fetch YouTube metadata and use Gemini to determine key/mood/tempo.
    on_progress(status, data) is called at each step if provided.
    """
    def _emit(status: str, data=None):
        print(f"[analyze] {status}: {data}", flush=True)
        if on_progress:
            on_progress(status, data)

    m = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", url)
    if not m:
        raise ValueError(f"Invalid YouTube URL: {url}")
    video_id = m.group(1)

    _emit("fetching", url)
    snippet = _fetch_video_metadata(video_id)
    title: str = snippet.get("title", "Unknown Track")
    description: str = snippet.get("description", "")
    tags: list[str] = snippet.get("tags", [])
    _emit("fetched", title)

    _emit("analyzing", title)
    analysis = _analyze_with_gemini(title, description, tags)
    _emit("complete", title)

    return AnalysisResult(
        title=title,
        key=analysis.get("key", "C"),
        scale=analysis.get("scale", "Ionian"),
        tempo=float(analysis.get("tempo", 120.0)),
        energy=float(analysis.get("energy", 0.5)),
        mood=analysis.get("mood", "neutral"),
    )
