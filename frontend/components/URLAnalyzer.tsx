"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Step = "downloading" | "downloaded" | "analyzing" | null;

const STEP_LABELS: Record<NonNullable<Step>, string> = {
  downloading: "Downloading audio...",
  downloaded: "Download complete",
  analyzing: "Analyzing audio...",
};

interface URLAnalyzerProps {
  onUseStyle: (styleContext: string, key: string) => void;
}

export default function URLAnalyzer({ onUseStyle }: URLAnalyzerProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStep("downloading");
    setTrackTitle(null);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${BASE}/analyze/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.status === "downloading") setStep("downloading");
          if (event.status === "downloaded") { setStep("downloaded"); setTrackTitle(event.data); }
          if (event.status === "analyzing") setStep("analyzing");
          if (event.status === "done") setResult(event.result);
          if (event.status === "error") throw new Error(event.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setStep(null);
    }
  };

  const handleUseStyle = () => {
    if (!result) return;
    const styleContext = `${result.mood}, ${result.tempo} BPM, ${result.key} ${result.scale}`;
    onUseStyle(styleContext, `${result.key} ${result.scale}`);
  };

  return (
    <div
      className="p-5 rounded-xl space-y-4"
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
        Track Analyzer
      </h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="Paste a YouTube URL..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all"
          style={{
            background: "rgba(7,7,15,0.8)",
            border: "1px solid rgba(96,165,250,0.2)",
            color: "#f9fafb",
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          className="px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all duration-200 disabled:opacity-40"
          style={{
            background: loading ? "rgba(96,165,250,0.1)" : "rgba(96,165,250,0.15)",
            border: "1px solid rgba(96,165,250,0.4)",
            color: "#60a5fa",
          }}
        >
          {loading ? "..." : "Analyze"}
        </button>
      </div>

      {loading && step && (
        <div className="space-y-1">
          {trackTitle && (
            <p className="text-sm font-medium truncate" style={{ color: "#f9fafb" }}>
              {trackTitle}
            </p>
          )}
          <p className="flex items-center gap-2 text-sm font-mono" style={{ color: "#9ca3af" }}>
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {STEP_LABELS[step]}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "#f9fafb" }}
          >
            {result.title}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <DataRow label="Key" value={`${result.key} ${result.scale}`} />
            <DataRow label="Tempo" value={`${result.tempo} BPM`} />
            <DataRow label="Mood" value={result.mood} />
            <DataRow label="Energy" value={result.energy.toFixed(3)} />
          </div>
          <button
            onClick={handleUseStyle}
            className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22d3ee",
            }}
          >
            Use this style →
          </button>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        className="text-xs font-mono uppercase tracking-wider block"
        style={{ color: "#6b7280" }}
      >
        {label}
      </span>
      <span className="text-sm" style={{ color: "#e5e7eb" }}>
        {value}
      </span>
    </div>
  );
}
