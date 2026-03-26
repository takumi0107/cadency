"use client";

import { useState } from "react";
import { AnalysisResult, AuthUser, analyzeTrack } from "@/lib/api";


interface URLAnalyzerProps {
  user: AuthUser | null;
  onUseStyle: (styleContext: string, key: string) => void;
  onUsed: () => void;
}

export default function URLAnalyzer({ user, onUseStyle, onUsed }: URLAnalyzerProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim() || !user) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await analyzeTrack(url.trim()));
      onUsed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUseStyle = () => {
    if (!result) return;
    onUseStyle(`${result.mood}, ${result.tempo} BPM, ${result.key} ${result.scale}`, `${result.key} ${result.scale}`);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.04)" }}
    >
      {/* Input row */}
      <div className="p-4 flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="https://youtube.com/watch?v=..."
          disabled={!user}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all disabled:opacity-40"
          style={{
            background: "rgba(7,7,15,0.8)",
            border: "1px solid rgba(139,92,246,0.2)",
            color: "#f9fafb",
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim() || !user}
          className="px-5 py-2 rounded-lg text-sm font-mono font-medium transition-all duration-200 disabled:opacity-40 shrink-0"
          style={{
            background: "rgba(139,92,246,0.18)",
            border: "1px solid rgba(139,92,246,0.45)",
            color: "#a78bfa",
          }}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : "Analyze"}
        </button>
      </div>

      {/* Loading hint */}
      {loading && (
        <div className="px-4 pb-3">
          <p className="text-xs font-mono" style={{ color: "#6b7280" }}>
            Fetching track info and running AI analysis...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm font-mono" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold truncate" style={{ color: "#f9fafb" }}>{result.title}</p>
            <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
              analyzed
            </span>
          </div>
          <div className="px-4 pb-3 grid grid-cols-4 gap-3">
            <Stat label="Key" value={`${result.key} ${result.scale}`} />
            <Stat label="Tempo" value={`${result.tempo} BPM`} />
            <Stat label="Mood" value={result.mood} />
            <Stat label="Energy" value={`${(result.energy * 100).toFixed(0)}%`} />
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={handleUseStyle}
              className="w-full py-2.5 rounded-lg text-sm font-mono font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.25)",
                color: "#22d3ee",
              }}
            >
              Use this style in Chord Assistant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-wider mb-0.5" style={{ color: "#9ca3af" }}>{label}</p>
      <p className="text-sm font-mono" style={{ color: "#e5e7eb" }}>{value}</p>
    </div>
  );
}
