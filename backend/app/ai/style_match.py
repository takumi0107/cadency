"""Gemini-powered style-matched chord progression generation."""

import json
import os
import re
from typing import TypedDict

from pydantic import BaseModel


class StyleInput(TypedDict, total=False):
    key: str
    mood: str
    tempo: float | int
    energy: float  # 0.0 (very calm) to 1.0 (very intense)


class GenerationResult(BaseModel):
    progression: list[str]
    description: str
    theory_note: str


def _get_client():
    from google import genai
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

    energy = style.get("energy")
    energy_desc = ""
    if energy is not None:
        if energy < 0.25:
            energy_desc = "very low energy — sparse, ambient, minimal"
        elif energy < 0.5:
            energy_desc = "low-medium energy — relaxed, laid-back"
        elif energy < 0.75:
            energy_desc = "medium-high energy — confident, driving"
        else:
            energy_desc = "high energy — intense, powerful, dense"

    prompt = f"""You are a music theory expert and chord progression composer.

Generate a {length}-chord progression that matches this musical style:
- Key: {style["key"]}
- Mood/vibe: {style["mood"]}
- Tempo: {style["tempo"]} BPM{f'''
- Energy level: {energy:.2f}/1.0 ({energy_desc})''' if energy is not None else ""}

Let the energy level guide complexity and density: low energy → simple open voicings, sustained chords; high energy → fuller harmony, more tension and movement.
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

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    return GenerationResult(
        progression=data["progression"],
        description=data["description"],
        theory_note=data["theory_note"],
    )
