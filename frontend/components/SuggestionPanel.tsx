"use client";

import { ChordSuggestion } from "@/lib/api";
import ChordPlayer from "./ChordPlayer";
import PianoChord from "./PianoChord";

interface SuggestionPanelProps {
  suggestions: ChordSuggestion[];
}

export default function SuggestionPanel({ suggestions }: SuggestionPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: "#9ca3af" }}
      >
        Suggestions
      </h3>
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="p-4 rounded-xl"
          style={{
            border: "1px solid rgba(96,165,250,0.28)",
            background: "rgba(30,58,138,0.07)",
            borderRadius: "12px",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold" style={{ color: "#22d3ee" }}>
              {s.chord}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  color: "#9ca3af",
                  background: "rgba(96,165,250,0.08)",
                  border: "1px solid rgba(96,165,250,0.15)",
                }}
              >
                {s.theory}
              </span>
              <ChordPlayer chord={s.chord} />
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "#d1d5db" }}>
            {s.reason}
          </p>
          <PianoChord chord={s.chord} />
        </div>
      ))}
    </div>
  );
}
