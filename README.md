# Cadency

AI-powered chord assistant for music producers. Paste a YouTube link to analyze a track's harmonic style, then generate and edit chord progressions — complete with piano roll visualization, MIDI export, and sound playback.

**Live demo:** <!-- add URL after deploy -->

---

## What it does

### Track Analysis
Paste any YouTube URL → Cadency downloads the audio, analyzes it with librosa, and extracts:
- Key and scale (e.g. F minor, Aeolian)
- Tempo (BPM)
- Mood and energy level

Results are **cached in SQLite** — analyzing the same video twice returns instantly.

### "What fits next?"
Enter the chords you have so far. Cadency suggests 3 possible next chords — each with a plain English reason and a music theory label.

```
You have:  Am → F → C → ?

Cadency:   G   — perfect authentic cadence, resolves back to Am       (VII → i)
           Em  — stays minor, more introspective feel                  (v → i)
           Dm  — builds gentle tension before resolving                (iv → i)
```

### Style-matched progression generation
Generates a full chord progression matching the key, mood, and tempo extracted from a track (or entered manually). Each generation is **automatically saved** to your session history.

### Piano roll editor
Every generated progression is shown in an FL Studio-style piano roll. You can:
- **Drag individual notes** up/down to customize a chord's voicing independently of the other notes
- **Transpose entire chords** with the ↑/↓ buttons above each bar
- Bars with custom note edits are marked with a **✦** indicator

### Sound selector
Choose the synth tone used for playback:

| Preset | Oscillator | Character |
|---|---|---|
| Piano | Triangle | Natural, warm decay |
| Warm | Sine | Smooth, long release |
| Bright | Sawtooth | Punchy, edgy |
| Organ | Square | Sustained, electronic |

### Playback controls
- **Play all** — plays through the progression bar by bar
- **Loop** — repeats continuously until stopped
- **BPM slider** — 40–200 BPM, adjustable live during playback

### MIDI export
Exports the current (edited) progression as a `.mid` file using binary MIDI encoding — no external library.

### Progression history
Every generated progression is saved to a **per-session SQLite database** (cookie-based, no login required). From the history panel you can:
- **Load** any saved progression back into the editor
- **Rename** progressions with an inline pencil editor
- **Delete** entries

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Package manager | uv |
| Database | SQLite + SQLAlchemy 2.0 async + aiosqlite |
| Migrations | Alembic |
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
│   │   ├── main.py              # FastAPI routes + lifespan
│   │   ├── db/
│   │   │   ├── base.py          # DeclarativeBase
│   │   │   ├── engine.py        # async engine + WAL mode init
│   │   │   ├── models.py        # sessions, analyses, progressions tables
│   │   │   ├── crud.py          # DB query helpers
│   │   │   └── deps.py          # get_db + get_or_create_session
│   │   ├── analyzer/
│   │   │   ├── youtube.py       # yt-dlp download + progress callbacks
│   │   │   └── audio.py         # key/tempo/mood extraction via librosa
│   │   └── ai/
│   │       ├── suggest.py       # "what fits next" — Gemini
│   │       └── style_match.py   # style-based progression generation
│   ├── alembic/                 # DB migrations
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── app/
│   ├── components/
│   │   ├── URLAnalyzer.tsx      # YouTube input + SSE progress stream
│   │   ├── ChordInput.tsx       # progression editor, playback, sound selector
│   │   ├── SuggestionPanel.tsx  # 3 chord suggestions with piano viewer
│   │   ├── PianoChord.tsx       # interactive piano keyboard + inversion selector
│   │   ├── PianoRoll.tsx        # FL Studio-style piano roll with per-note drag
│   │   ├── ChordPlayer.tsx      # Tone.js single-chord playback button
│   │   └── SavedProgressions.tsx # session history with inline rename
│   └── lib/
│       ├── api.ts               # typed backend API calls
│       ├── chords.ts            # chord parsing, inversions, transposition
│       ├── midi.ts              # binary MIDI file generation
│       └── sounds.ts            # synth preset definitions
└── Makefile
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/analyze` | Analyze a YouTube URL (cached by video ID) |
| `POST` | `/analyze/stream` | Same, with SSE progress events |
| `POST` | `/suggest` | Suggest next chords for a progression |
| `POST` | `/generate` | Generate a progression from a style |
| `GET` | `/progressions` | List saved progressions for this session |
| `POST` | `/progressions` | Save a progression |
| `PATCH` | `/progressions/{id}` | Rename a progression |
| `DELETE` | `/progressions/{id}` | Delete a progression |

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
    { "chord": "G", "reason": "Creates a perfect authentic cadence.", "theory": "VII → i" }
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

### `GET /progressions`
Returns all progressions saved in the current browser session (identified by `cadency_sid` cookie).
```json
[
  {
    "id": 1,
    "name": "Lo-fi loop",
    "chords": ["Am", "F", "C", "G"],
    "key": "A minor",
    "mood": "melancholic",
    "bpm": 90,
    "description": "...",
    "theory_note": "...",
    "created_at": "2026-03-23T10:00:00"
  }
]
```

---

## Database

Three tables managed with SQLAlchemy 2.0 async + Alembic:

| Table | Purpose |
|---|---|
| `sessions` | Anonymous browser sessions (UUID cookie) |
| `analyses` | Cached YouTube analysis results, keyed by video ID |
| `progressions` | Saved chord progressions per session |

SQLite runs in **WAL mode** for better concurrent read performance. No login required — sessions are created automatically on first request.

To create or apply migrations:
```bash
cd backend
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
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
| `make kill` | Kill anything running on ports 8000 and 3000 |
| `make test` | Run all tests |
| `make test-backend` | pytest (backend) |
| `make test-frontend` | lint (frontend) |
| `make install` | Install all dependencies |

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
- [ ] Per-session progression sharing via short URL
