# Cadency

AI-powered chord assistant for music producers. Paste a YouTube link to analyze a track's harmonic style, then get chord suggestions with music theory explanations.

**Live demo:** <!-- add URL after deploy -->

---

## What it does

### Track Analysis
Paste any YouTube URL → Cadency downloads the audio, analyzes it, and extracts:
- Key and scale (e.g. F minor, Aeolian)
- Tempo (BPM)
- Mood and energy (e.g. melancholic, dark & heavy, bright & upbeat)

### "What fits next?"
Enter the chords you have so far. Cadency suggests 3 possible next chords — each with a plain English reason and a music theory label.

```
You have:  Am → F → C → ?

Cadency:   G   — perfect authentic cadence, resolves back to Am       (VII → i)
           Em  — stays minor, more introspective feel                  (v → i)
           Dm  — builds gentle tension before resolving                (iv → i)
```

### Style-matched generation
Use the style extracted from a track to generate a full chord progression inspired by the same harmonic DNA.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Package manager | uv |
| Audio download | yt-dlp |
| Audio analysis | librosa |
| Music theory | music21 |
| AI | Gemini 2.5 Flash |
| Frontend | Next.js 15 + TypeScript |
| Styling | Tailwind CSS |
| Audio playback | Tone.js |
| Deploy (backend) | Railway |
| Deploy (frontend) | Vercel |

---

## Project Structure

```
cadency/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI routes
│   │   ├── analyzer/
│   │   │   ├── youtube.py       # yt-dlp download + librosa analysis
│   │   │   └── audio.py         # key/tempo/mood extraction
│   │   └── ai/
│   │       ├── suggest.py       # "what fits next" — Gemini
│   │       └── style_match.py   # style-based progression generation
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── app/
│   ├── components/
│   │   ├── URLAnalyzer.tsx      # YouTube input + analysis results
│   │   ├── ChordInput.tsx       # progression input + suggest/generate
│   │   ├── SuggestionPanel.tsx  # 3 chord suggestions with explanations
│   │   └── ChordPlayer.tsx      # Tone.js chord playback
│   └── lib/
│       └── api.ts               # typed backend API calls
└── .devcontainer/
    └── devcontainer.json        # Python 3.12 + Node 20 + ffmpeg + uv
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/analyze` | Analyze a YouTube URL |
| `POST` | `/suggest` | Suggest next chords for a progression |
| `POST` | `/generate` | Generate a progression from a style |

### `POST /analyze`
```json
{ "url": "https://youtube.com/watch?v=..." }
```
```json
{
  "title": "Nujabes — Feather",
  "key": "F",
  "scale": "minor",
  "tempo": 87.4,
  "mood": "melancholic",
  "energy": 0.043
}
```

### `POST /suggest`
```json
{
  "progression": ["Am", "F", "C"],
  "key": "A minor",
  "style_context": "lo-fi, melancholic"
}
```
```json
{
  "suggestions": [
    {
      "chord": "G",
      "reason": "Creates a perfect authentic cadence resolving back to Am.",
      "theory": "VII → i"
    }
  ]
}
```

### `POST /generate`
```json
{
  "style": { "key": "F minor", "mood": "melancholic, warm", "tempo": 87 },
  "length": 4
}
```
```json
{
  "progression": ["Fm", "Db", "Ab", "Eb"],
  "description": "Minor key loop with bVI and bVII — common in lo-fi hip hop",
  "theory_note": "Db and Ab are borrowed from the parallel major"
}
```

---

## Getting Started

### Prerequisites
- [uv](https://docs.astral.sh/uv/) — Python package manager
- [ffmpeg](https://ffmpeg.org/) — required by librosa (`brew install ffmpeg` on Mac)
- Node.js 20+
- Gemini API key — get one free at [Google AI Studio](https://aistudio.google.com/)

### Setup

```bash
brew install ffmpeg  # required for YouTube audio extraction

cp backend/.env.example backend/.env
# add your GEMINI_API_KEY to backend/.env

make install
```

### Run (both servers at once)

```bash
make dev
```

Backend at `http://localhost:8000` (docs at `/docs`) — Frontend at `http://localhost:3000`.

Press `Ctrl+C` to stop both.

### Make targets

| Command | Description |
|---|---|
| `make dev` | Start backend + frontend together |
| `make dev-backend` | Backend only |
| `make dev-frontend` | Frontend only |
| `make test` | Run all tests |
| `make test-backend` | pytest (backend) |
| `make test-frontend` | lint (frontend) |
| `make lint` | Lint both |
| `make install` | Install all dependencies |

### With devcontainer (recommended)

Open the repo in VS Code → **Reopen in Container**. ffmpeg, uv, and Node are all pre-installed. Then run `make install && make dev`.

---

## Environment Variables

**Backend** (`.env`):
```
GEMINI_API_KEY=your-gemini-api-key
```

**Frontend** (`.env.local`, optional):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Roadmap

- [ ] Spotify support (audio features API — no download needed)
- [ ] SoundCloud support (yt-dlp already supports it)
- [ ] Piano roll visualization
- [ ] Save and export progressions as MIDI
- [ ] Progression history per session
# cadency
