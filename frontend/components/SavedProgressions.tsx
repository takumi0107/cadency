"use client";

import { useEffect, useRef, useState } from "react";
import { listProgressions, deleteProgression, renameProgression, SavedProgression } from "@/lib/api";

interface Props {
  onLoad: (prog: SavedProgression) => void;
  refreshTrigger?: number;
}

export default function SavedProgressions({ onLoad, refreshTrigger }: Props) {
  const [progressions, setProgressions] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      setProgressions(await listProgressions());
    } catch {
      // no saved progressions yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [refreshTrigger]);

  useEffect(() => {
    if (editingId !== null) inputRef.current?.focus();
  }, [editingId]);

  const startEdit = (prog: SavedProgression) => {
    setEditingId(prog.id);
    setEditingName(prog.name === "Untitled" ? "" : prog.name);
  };

  const commitEdit = async (id: number) => {
    const name = editingName.trim() || "Untitled";
    await renameProgression(id, name);
    setProgressions(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    setEditingId(null);
  };

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

      {loading && <p className="text-xs font-mono" style={{ color: "#6b7280" }}>Loading…</p>}

      {progressions.map(prog => (
        <div
          key={prog.id}
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "rgba(7,7,15,0.6)", border: "1px solid rgba(96,165,250,0.12)" }}
        >
          {/* Name / inline edit */}
          <div className="flex-1 min-w-0">
            {editingId === prog.id ? (
              <input
                ref={inputRef}
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => commitEdit(prog.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitEdit(prog.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                placeholder="Name…"
                className="w-full px-1 rounded text-sm font-mono outline-none"
                style={{ background: "rgba(7,7,15,0.9)", border: "1px solid rgba(96,165,250,0.4)", color: "#f9fafb" }}
              />
            ) : (
              <p className="text-sm font-mono truncate" style={{ color: "#f9fafb" }}>{prog.name}</p>
            )}
            <p className="text-xs font-mono truncate" style={{ color: "#6b7280" }}>
              {prog.chords.join(" → ")}
              {prog.bpm ? ` · ${prog.bpm} BPM` : ""}
            </p>
          </div>

          {/* Pencil */}
          <button
            onClick={() => startEdit(prog)}
            title="Rename"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: "#6b7280", background: "transparent" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z"/>
            </svg>
          </button>

          {/* Load */}
          <button
            onClick={() => onLoad(prog)}
            className="shrink-0 px-2 py-1 rounded text-xs font-mono"
            style={{ border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", background: "transparent" }}
          >
            Load
          </button>

          {/* Delete */}
          <button
            onClick={() => handleDelete(prog.id)}
            className="shrink-0 px-2 py-1 rounded text-xs font-mono"
            style={{ border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", background: "transparent" }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
