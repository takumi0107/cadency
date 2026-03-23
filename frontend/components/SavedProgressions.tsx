"use client";

import { useEffect, useState } from "react";
import {
  listProgressions,
  deleteProgression,
  SavedProgression,
} from "@/lib/api";

interface Props {
  onLoad: (prog: SavedProgression) => void;
  refreshTrigger?: number;
}

export default function SavedProgressions({ onLoad, refreshTrigger }: Props) {
  const [progressions, setProgressions] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await listProgressions();
      setProgressions(data);
    } catch {
      // silently ignore — user may not have any saved yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [refreshTrigger]);

  const handleDelete = async (id: number) => {
    await deleteProgression(id);
    setProgressions(prev => prev.filter(p => p.id !== id));
  };

  if (progressions.length === 0 && !loading) return null;

  return (
    <div
      className="p-5 rounded-xl space-y-3"
      style={{ border: "1px solid rgba(96,165,250,0.2)", background: "rgba(30,58,138,0.05)", borderRadius: "12px" }}
    >
      <h2 className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>
        Saved Progressions
      </h2>

      {loading && (
        <p className="text-xs font-mono" style={{ color: "#6b7280" }}>Loading…</p>
      )}

      {progressions.map(prog => (
        <div
          key={prog.id}
          className="flex items-center gap-3 rounded-lg px-3 py-2"
          style={{ background: "rgba(7,7,15,0.6)", border: "1px solid rgba(96,165,250,0.12)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono truncate" style={{ color: "#f9fafb" }}>{prog.name}</p>
            <p className="text-xs font-mono truncate" style={{ color: "#6b7280" }}>
              {prog.chords.join(" → ")}
              {prog.bpm ? ` · ${prog.bpm} BPM` : ""}
            </p>
          </div>
          <button
            onClick={() => onLoad(prog)}
            className="shrink-0 px-2 py-1 rounded text-xs font-mono transition-colors"
            style={{ border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", background: "transparent" }}
          >
            Load
          </button>
          <button
            onClick={() => handleDelete(prog.id)}
            className="shrink-0 px-2 py-1 rounded text-xs font-mono transition-colors"
            style={{ border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", background: "transparent" }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
