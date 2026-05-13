"""YouTube audio download via yt-dlp + librosa-based analysis."""

import glob
import os
import re
import tempfile
from typing import TypedDict

import librosa
import numpy as np
import yt_dlp


class AnalysisResult(TypedDict):
    title: str
    key: str
    scale: str
    tempo: float
    energy: float
    mood: str


# Krumhansl-Schmuckler key profiles
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _detect_key(y: np.ndarray, sr: int) -> tuple[str, str]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mean_chroma = chroma.mean(axis=1)

    best_score = -np.inf
    best_key = "C"
    best_scale = "Ionian"

    for i in range(12):
        rotated = np.roll(mean_chroma, -i)
        major_score = np.corrcoef(rotated, _MAJOR_PROFILE)[0, 1]
        minor_score = np.corrcoef(rotated, _MINOR_PROFILE)[0, 1]

        if major_score > best_score:
            best_score = major_score
            best_key = _NOTE_NAMES[i]
            best_scale = "Ionian"

        if minor_score > best_score:
            best_score = minor_score
            best_key = _NOTE_NAMES[i]
            best_scale = "Aeolian"

    return best_key, best_scale


def _detect_tempo(y: np.ndarray, sr: int) -> float:
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    return float(np.atleast_1d(tempo)[0])


def _detect_energy(y: np.ndarray) -> float:
    rms = librosa.feature.rms(y=y)[0]
    # Normalize: typical RMS values are 0.01–0.3
    return float(min(1.0, np.mean(rms) / 0.3))


def _detect_mood(title: str, key: str, scale: str, tempo: float, energy: float) -> str:
    """Use Gemini to infer mood from measured audio characteristics + title."""
    from google import genai

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    scale_name = "major" if scale == "Ionian" else "minor"

    prompt = f"""You are a music expert. Based on these audio analysis results, describe the mood in 2-4 words.

Title: {title}
Key: {key} {scale_name}
Tempo: {tempo:.0f} BPM
Energy: {energy:.2f} (0=silent, 1=very loud)

Return ONLY a mood phrase, e.g. "melancholic", "upbeat & energetic", "calm & warm", "dark & heavy". No explanation."""

    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    return response.text.strip().strip('"').strip("'")


def analyze_youtube_url(url: str, on_progress=None) -> AnalysisResult:
    """Download YouTube audio with yt-dlp, analyze with librosa, infer mood with Gemini."""
    def _emit(status: str, data=None):
        print(f"[analyze] {status}: {data}", flush=True)
        if on_progress:
            on_progress(status, data)

    if not re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", url):
        raise ValueError(f"Invalid YouTube URL: {url}")

    with tempfile.TemporaryDirectory() as tmpdir:
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(tmpdir, "audio.%(ext)s"),
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "wav"}],
            "quiet": True,
            "no_warnings": True,
        }

        _emit("downloading", url)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title: str = info.get("title", "Unknown Track")
        _emit("downloaded", title)

        wav_files = glob.glob(os.path.join(tmpdir, "*.wav"))
        if not wav_files:
            raise RuntimeError("Audio extraction failed: no WAV file produced by ffmpeg")
        audio_path = wav_files[0]

        _emit("analyzing", title)
        # Load first 2 minutes — enough for key/tempo detection, faster than full track
        y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=120)

        key, scale = _detect_key(y, sr)
        tempo = _detect_tempo(y, sr)
        energy = _detect_energy(y)
        _emit("audio_analyzed", f"{key} {scale} @ {tempo:.0f} BPM, energy={energy:.2f}")

        _emit("mood", title)
        mood = _detect_mood(title, key, scale, tempo, energy)
        _emit("complete", title)

    return AnalysisResult(
        title=title,
        key=key,
        scale=scale,
        tempo=tempo,
        energy=energy,
        mood=mood,
    )
