"""Gemini-powered style-matched chord progression generation."""

import json
import os
import re
from typing import TypedDict

from google import genai
from google.genai import types
from pydantic import BaseModel


class StyleInput(TypedDict):
    key: str
    mood: str
    tempo: float | int


class GenerationResult(BaseModel):
    progression: list[str]
    description: str
    theory_note: str


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def generate_progression(style: StyleInput, length: int = 4) -> GenerationResult:
    """
    Ask Gemini to generate a chord progression matching the given style.
    Returns a progression array + description + theory note.
    """
    client = _get_client()

    prompt = f"""You are a music theory expert and chord progression composer.

Generate a {length}-chord progression that matches this musical style:
- Key: {style["key"]}
- Mood/vibe: {style["mood"]}
- Tempo: {style["tempo"]} BPM

The progression should feel authentic to the style — not a cliché copy, but inspired by the same harmonic DNA.
Include a plain English description of the vibe and a theory note explaining the harmonic choices.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{{
  "progression": ["Fm", "Db", "Ab", "Eb"],
  "description": "Minor key loop with bVI and bVII — common in lo-fi hip hop and neo-soul",
  "theory_note": "The Db and Ab are borrowed from the parallel major, giving a warm, unresolved feel"
}}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    raw = response.text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    return GenerationResult(
        progression=data["progression"],
        description=data["description"],
        theory_note=data["theory_note"],
    )
