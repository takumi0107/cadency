"""Gemini-powered chord suggestion: 'what fits next?' given a progression."""

import json
import os
import re
from typing import TypedDict


class ChordSuggestion(TypedDict):
    chord: str
    reason: str
    theory: str


class SuggestionResult(TypedDict):
    suggestions: list[ChordSuggestion]


def _get_client():
    from google import genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def suggest_next_chord(
    progression: list[str],
    key: str,
    style_context: str,
) -> SuggestionResult:
    """
    Ask Gemini for 3 chord suggestions that fit after the given progression.
    Returns structured suggestions with reason and theory label.
    """
    client = _get_client()

    progression_str = " → ".join(progression)
    prompt = f"""You are a music theory expert and chord suggestion engine.

A musician has written this chord progression: {progression_str}
Key: {key}
Style/vibe: {style_context}

Suggest exactly 3 chords that would fit naturally as the next chord after this progression.
For each suggestion explain WHY it works in plain English, and give the Roman numeral or interval relationship (e.g. "IV → I", "bVII → i").

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{{
  "suggestions": [
    {{
      "chord": "G",
      "reason": "Creates a perfect authentic cadence — strong resolution back to the tonic.",
      "theory": "VII → i"
    }},
    {{
      "chord": "Em",
      "reason": "Stays in the minor tonality, adds a more introspective feel.",
      "theory": "v → i"
    }},
    {{
      "chord": "Dm",
      "reason": "The ii chord builds gentle tension before resolving.",
      "theory": "iv → i"
    }}
  ]
}}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    raw = response.text.strip()

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    return SuggestionResult(suggestions=data["suggestions"])
