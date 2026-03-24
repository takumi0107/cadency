"""YouTube audio download using yt-dlp and librosa-based analysis."""

import os
import shutil
import tempfile
from typing import TypedDict

from app.analyzer.audio import AudioAnalysis, analyze_audio


def _write_cookies_file(tmpdir: str) -> str | None:
    """Write YOUTUBE_COOKIES env var to a temp file. Returns path or None."""
    cookies = os.environ.get("YOUTUBE_COOKIES", "").strip()
    if not cookies:
        return None
    path = os.path.join(tmpdir, "cookies.txt")
    with open(path, "w") as f:
        f.write(cookies)
    return path


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
    ffmpeg_bin = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    ffmpeg_dir = os.path.dirname(ffmpeg_bin)
    cookies_file = _write_cookies_file(os.path.dirname(output_path))
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
        "ffmpeg_location": ffmpeg_dir,
        "noplaylist": True,
        "extractor_args": {"youtube": {"player_client": ["web", "ios"]}},
    }
    if cookies_file:
        ydl_opts["cookiefile"] = cookies_file

    import yt_dlp
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title: str = info.get("title", "Unknown Track")  # type: ignore[union-attr]

    return title


def analyze_youtube_url(url: str, on_progress=None) -> AnalysisResult:
    """
    Download audio from a YouTube URL, analyze it with librosa, then delete the temp file.
    Returns combined track metadata + audio analysis.
    on_progress(status, data) is called at each step if provided.
    """
    def _emit(status: str, data=None):
        print(f"[analyze] {status}: {data}", flush=True)
        if on_progress:
            on_progress(status, data)

    with tempfile.TemporaryDirectory() as tmpdir:
        base_path = os.path.join(tmpdir, "audio")
        _emit("downloading", url)
        title = _download_audio(url, base_path)
        _emit("downloaded", title)

        mp3_path = base_path + ".mp3"
        if not os.path.exists(mp3_path):
            files = os.listdir(tmpdir)
            if not files:
                raise RuntimeError("yt-dlp did not produce an output file")
            mp3_path = os.path.join(tmpdir, files[0])

        _emit("analyzing", title)
        analysis: AudioAnalysis = analyze_audio(mp3_path)
        _emit("complete", title)

    return AnalysisResult(
        title=title,
        key=analysis["key"],
        scale=analysis["scale"],
        tempo=analysis["tempo"],
        energy=analysis["energy"],
        mood=analysis["mood"],
    )
