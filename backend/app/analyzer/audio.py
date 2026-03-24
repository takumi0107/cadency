"""Audio analysis helpers using librosa for key, tempo, energy, and mood extraction."""

from typing import TypedDict


class AudioAnalysis(TypedDict):
    key: str
    scale: str
    tempo: float
    energy: float
    mood: str


# Krumhansl–Schmuckler key profiles (plain lists; converted to np.array on first use)
MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _detect_key(y, sr: int) -> tuple[str, str]:
    """Detect musical key and scale (major/minor) using chroma features."""
    import numpy as np
    import librosa as _librosa

    chroma = _librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    best_score = -np.inf
    major = np.array(MAJOR_PROFILE)
    minor = np.array(MINOR_PROFILE)
    best_note = 0
    best_scale = "major"

    for i in range(12):
        rotated_major = np.roll(major, i)
        rotated_minor = np.roll(minor, i)

        score_major = np.corrcoef(chroma_mean, rotated_major)[0, 1]
        score_minor = np.corrcoef(chroma_mean, rotated_minor)[0, 1]

        if score_major > best_score:
            best_score = score_major
            best_note = i
            best_scale = "major"

        if score_minor > best_score:
            best_score = score_minor
            best_note = i
            best_scale = "minor"

    scale_name = "Ionian" if best_scale == "major" else "Aeolian"
    return NOTE_NAMES[best_note], scale_name


def _classify_mood(energy: float, spectral_centroid_mean: float) -> str:
    """Classify mood using energy and spectral centroid heuristics."""
    # Spectral centroid in Hz: low = dark, high = bright
    # Energy: 0–1 normalised RMS

    if energy > 0.07 and spectral_centroid_mean > 3000:
        return "bright & upbeat"
    elif energy > 0.07 and spectral_centroid_mean <= 3000:
        return "dark & heavy"
    elif energy < 0.03 and spectral_centroid_mean < 2000:
        return "melancholic"
    elif energy < 0.03 and spectral_centroid_mean >= 2000:
        return "calm & warm"
    else:
        return "energetic"


def analyze_audio(file_path: str) -> AudioAnalysis:
    """
    Analyze an audio file and return key, scale, tempo, energy, and mood.
    Only processes the first 60 seconds for speed.
    """
    import numpy as np
    import librosa

    y, sr = librosa.load(file_path, mono=True, duration=60.0)

    # Key detection
    key, scale = _detect_key(y, sr)

    # Tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    # beat_track may return an ndarray in newer librosa versions
    if hasattr(tempo, "__len__"):
        tempo = float(tempo[0])
    else:
        tempo = float(tempo)

    # Energy (RMS)
    rms = librosa.feature.rms(y=y)
    energy = float(np.mean(rms))

    # Spectral centroid for mood heuristic
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    spectral_centroid_mean = float(np.mean(spectral_centroid))

    mood = _classify_mood(energy, spectral_centroid_mean)

    return AudioAnalysis(
        key=key,
        scale=scale,
        tempo=round(tempo, 1),
        energy=round(energy, 4),
        mood=mood,
    )
