const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// API calls
// ---------------------------------------------------------------------------

export async function analyzeTrack(url: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    body: JSON.stringify({ style, length }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Generation failed");
  }
  return res.json();
}
