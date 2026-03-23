"use client";

import { useState } from "react";
import {
  suggestChords,
  generateProgression,
  ChordSuggestion,
  GenerationResult,
} from "@/lib/api";
import SuggestionPanel from "./SuggestionPanel";

interface ChordInputProps {
  prefillStyle?: string;
  prefillKey?: string;
}

export default function ChordInput({ prefillStyle = "", prefillKey = "" }: ChordInputProps) {
  const [progression, setProgression] = useState("");
  const [key, setKey] = useState(prefillKey);
  const [styleContext, setStyleContext] = useState(prefillStyle);
  const [suggestions, setSuggestions] = useState<ChordSuggestion[]>([]);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync prefill props when parent updates them
  if (prefillStyle && prefillStyle !== styleContext) setStyleContext(prefillStyle);
  if (prefillKey && prefillKey !== key) setKey(prefillKey);

  const handleSuggest = async () => {
    const chords = progression.trim().split(/[\s,→]+/).filter(Boolean);
    if (chords.length === 0) return;
    setLoadingSuggest(true);
    setError(null);
    setGenerationResult(null);
    try {
      const result = await suggestChords(chords, key || "unknown", styleContext || "general");
      setSuggestions(result.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await generateProgression(
        {
          key: key || "C major",
          mood: styleContext || "neutral",
          tempo: 90,
        },
        4
      );
      setGenerationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoadingGenerate(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="p-5 rounded-xl space-y-3"
        style={{
          border: "1px solid rgba(96,165,250,0.28)",
          background: "rgba(30,58,138,0.07)",
          borderRadius: "12px",
        }}
      >
        <h2
          className="text-xs font-mono uppercase tracking-widest"
          style={{ color: "#9ca3af" }}
        >
          Chord Assistant
        </h2>

        <input
          type="text"
          value={progression}
          onChange={(e) => setProgression(e.target.value)}
          placeholder="Enter your progression (e.g. Am F C)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "rgba(7,7,15,0.8)",
            border: "1px solid rgba(96,165,250,0.2)",
            color: "#f9fafb",
          }}
        />

        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Key (e.g. A minor)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "rgba(7,7,15,0.8)",
            border: "1px solid rgba(96,165,250,0.2)",
            color: "#f9fafb",
          }}
        />

        <input
          type="text"
          value={styleContext}
          onChange={(e) => setStyleContext(e.target.value)}
          placeholder="Style context (e.g. lo-fi, melancholic)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "rgba(7,7,15,0.8)",
            border: "1px solid rgba(96,165,250,0.2)",
            color: "#f9fafb",
          }}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSuggest}
            disabled={loadingSuggest || !progression.trim()}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200 disabled:opacity-40"
            style={{
              background: "rgba(96,165,250,0.15)",
              border: "1px solid rgba(96,165,250,0.4)",
              color: "#60a5fa",
            }}
          >
            {loadingSuggest ? "Thinking..." : "What fits next?"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loadingGenerate}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200 disabled:opacity-40"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22d3ee",
            }}
          >
            {loadingGenerate && (
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loadingGenerate ? "Generating..." : "Generate progression"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm px-1" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {suggestions.length > 0 && <SuggestionPanel suggestions={suggestions} />}

      {generationResult && (
        <div
          className="p-5 rounded-xl space-y-3"
          style={{
            border: "1px solid rgba(34,211,238,0.25)",
            background: "rgba(34,211,238,0.04)",
            borderRadius: "12px",
          }}
        >
          <h3
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "#9ca3af" }}
          >
            Generated Progression
          </h3>
          <div className="flex flex-wrap gap-2">
            {generationResult.progression.map((chord, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg text-lg font-bold"
                style={{
                  background: "rgba(34,211,238,0.1)",
                  border: "1px solid rgba(34,211,238,0.3)",
                  color: "#22d3ee",
                }}
              >
                {chord}
              </span>
            ))}
          </div>
          <p className="text-sm" style={{ color: "#d1d5db" }}>
            {generationResult.description}
          </p>
          <p className="text-xs font-mono" style={{ color: "#9ca3af" }}>
            {generationResult.theory_note}
          </p>
        </div>
      )}
    </div>
  );
}
