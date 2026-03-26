const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  usage_today: number;
  usage_limit: number;
}

export interface AnalysisResult {
  title: string;
  key: string;
  scale: string;
  tempo: number;
  energy: number;
  mood: string;
}

export interface ChordSuggestion {
  chord: string;
  reason: string;
  theory: string;
}

export interface SuggestionResult {
  suggestions: ChordSuggestion[];
}

export interface StyleInput {
  key: string;
  mood: string;
  tempo: number;
}

export interface GenerationResult {
  progression: string[];
  description: string;
  theory_note: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" });
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function analyzeTrack(url: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Analysis failed");
  }
  return res.json();
}

export async function suggestChords(
  progression: string[],
  key: string,
  styleContext: string
): Promise<SuggestionResult> {
  const res = await fetch(`${BASE}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ progression, key, style_context: styleContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Suggestion failed");
  }
  return res.json();
}

export async function generateProgression(
  style: StyleInput,
  length: number
): Promise<GenerationResult> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ style, length }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Generation failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Progressions
// ---------------------------------------------------------------------------

export interface SavedProgression {
  id: number;
  name: string;
  chords: string[];
  key: string;
  mood: string;
  bpm: number;
  description: string;
  theory_note: string;
  created_at: string;
}

export interface SaveProgressionInput {
  name?: string;
  chords: string[];
  key?: string;
  mood?: string;
  bpm?: number;
  description?: string;
  theory_note?: string;
}

export async function listProgressions(): Promise<SavedProgression[]> {
  const res = await fetch(`${BASE}/progressions`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load progressions");
  return res.json();
}

export async function saveProgression(data: SaveProgressionInput): Promise<SavedProgression> {
  const res = await fetch(`${BASE}/progressions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Save failed");
  }
  return res.json();
}

export async function deleteProgression(id: number): Promise<void> {
  const res = await fetch(`${BASE}/progressions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function renameProgression(id: number, name: string): Promise<void> {
  const res = await fetch(`${BASE}/progressions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Rename failed");
}
