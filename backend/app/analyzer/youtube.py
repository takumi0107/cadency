"""YouTube audio download using yt-dlp and librosa-based analysis."""

import os
import tempfile
from typing import TypedDict

import yt_dlp

from app.analyzer.audio import AudioAnalysis, analyze_audio


class TrackInfo(TypedDict):
    title: str
    file_path: str


class AnalysisResult(TypedDict):
    title: str
    key: str
    scale: str
    tempo: float
    energy: float
    mood: str


def _download_audio(url: str, output_path: str) -> str:
    """
    Download best audio from a YouTube URL as mp3 to output_path.
    Returns the actual file path written (yt-dlp appends extension).
    """
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title: str = info.get("title", "Unknown Track")  # type: ignore[union-attr]

    return title


def analyze_youtube_url(url: str) -> AnalysisResult:
    """
    Download audio from a YouTube URL, analyze it with librosa, then delete the temp file.
    Returns combined track metadata + audio analysis.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        base_path = os.path.join(tmpdir, "audio")
        # yt-dlp will write base_path.mp3 after post-processing
        title = _download_audio(url, base_path)

        mp3_path = base_path + ".mp3"
        if not os.path.exists(mp3_path):
            # Fallback: find whatever file was written
            files = os.listdir(tmpdir)
            if not files:
                raise RuntimeError("yt-dlp did not produce an output file")
            mp3_path = os.path.join(tmpdir, files[0])

        analysis: AudioAnalysis = analyze_audio(mp3_path)

    return AnalysisResult(
        title=title,
        key=analysis["key"],
        scale=analysis["scale"],
        tempo=analysis["tempo"],
        energy=analysis["energy"],
        mood=analysis["mood"],
    )
