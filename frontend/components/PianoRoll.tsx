"use client";

import { useState } from "react";
import { parseChord, getInversions, NOTE_NAMES } from "@/lib/chords";

interface PianoRollProps {
  chords: string[];
  playingIndex?: number | null;
  onTranspose?: (barIdx: number, semitones: number) => void;
}

const ROW_H = 13;
const BAR_W = 150;
const PIANO_W = 44;
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

export default function PianoRoll({ chords, playingIndex, onTranspose }: PianoRollProps) {
  const [drag, setDrag] = useState<{ barIdx: number; offset: number } | null>(null);

  if (chords.length === 0) return null;

  const baseNotes: number[][] = chords.map(chord => {
    const parsed = parseChord(chord);
    return parsed ? getInversions(parsed)[0].midiNotes : [];
  });

  // During drag, shift notes for the dragged bar for live preview
  const displayNotes: number[][] = baseNotes.map((notes, i) =>
    drag?.barIdx === i ? notes.map(m => m + drag.offset) : notes
  );

  const allMidi = displayNotes.flat();
  if (allMidi.length === 0) return null;
  const MIDI_BOTTOM = Math.floor((Math.min(...allMidi) - 3) / 12) * 12;
  const MIDI_TOP = Math.ceil((Math.max(...allMidi) + 3) / 12) * 12;
  const ROWS = MIDI_TOP - MIDI_BOTTOM;

  const rows = Array.from({ length: ROWS }, (_, i) => {
    const midi = MIDI_TOP - 1 - i;
    return { midi, semitone: midi % 12, octave: Math.floor(midi / 12) - 1, y: i * ROW_H };
  });

  const totalHeight = ROWS * ROW_H;
  const totalWidth = PIANO_W + chords.length * BAR_W;

  const startDrag = (e: React.MouseEvent, barIdx: number) => {
    if (!onTranspose) return;
    e.preventDefault();
    const startY = e.clientY;
    let currentOffset = 0;
    setDrag({ barIdx, offset: 0 });

    const onMove = (ev: MouseEvent) => {
      currentOffset = -Math.round((ev.clientY - startY) / ROW_H);
      setDrag({ barIdx, offset: currentOffset });
    };

    const onUp = () => {
      if (currentOffset !== 0) onTranspose(barIdx, currentOffset);
      setDrag(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="rounded-lg overflow-hidden select-none" style={{ border: "1px solid rgba(96,165,250,0.15)", background: "rgba(7,10,18,0.95)" }}>

      {/* Bar header */}
      <div className="flex" style={{ marginLeft: PIANO_W, borderBottom: "1px solid rgba(96,165,250,0.15)" }}>
        {chords.map((chord, i) => {
          const isDragging = drag?.barIdx === i;
          const label = isDragging && drag.offset !== 0
            ? `${chord} ${drag.offset > 0 ? "+" : ""}${drag.offset}`
            : chord;
          return (
            <div
              key={i}
              className="text-xs font-mono text-center py-1 shrink-0"
              style={{
                width: BAR_W,
                color: isDragging ? "#f9fafb" : playingIndex === i ? "#22d3ee" : "#6b7280",
                borderLeft: "1px solid rgba(96,165,250,0.15)",
                background: isDragging
                  ? "rgba(96,165,250,0.1)"
                  : playingIndex === i ? "rgba(34,211,238,0.06)" : "transparent",
                transition: isDragging ? "none" : "all 0.1s",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Roll */}
      <div style={{ overflowY: "auto", maxHeight: 340 }}>
        <div style={{ position: "relative", width: totalWidth, height: totalHeight }}>

          {/* Row backgrounds */}
          {rows.map(row => (
            <div key={row.midi} style={{
              position: "absolute", top: row.y, left: 0,
              width: totalWidth, height: ROW_H,
              background: IS_BLACK[row.semitone] ? "rgba(8,12,22,0.95)" : "rgba(18,26,40,0.8)",
              borderBottom: row.semitone === 0
                ? "1px solid rgba(96,165,250,0.12)"
                : "1px solid rgba(255,255,255,0.02)",
            }} />
          ))}

          {/* Piano keys */}
          {rows.map(row => (
            <div key={`pk-${row.midi}`} style={{
              position: "absolute", top: row.y, left: 0,
              width: PIANO_W, height: ROW_H,
              background: IS_BLACK[row.semitone] ? "#0f1520" : "#1c2738",
              borderRight: "2px solid rgba(96,165,250,0.25)",
              borderBottom: "1px solid rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 5,
            }}>
              {row.semitone === 0 && (
                <span style={{ fontSize: 9, color: "#4b5563", fontFamily: "monospace" }}>
                  C{row.octave}
                </span>
              )}
            </div>
          ))}

          {/* Bar lines */}
          {chords.map((_, i) => (
            <div key={`bl-${i}`} style={{
              position: "absolute", left: PIANO_W + i * BAR_W, top: 0,
              width: 1, height: totalHeight,
              background: "rgba(96,165,250,0.18)",
            }} />
          ))}

          {/* Beat lines */}
          {chords.map((_, i) =>
            [1, 2, 3].map(b => (
              <div key={`bt-${i}-${b}`} style={{
                position: "absolute",
                left: PIANO_W + i * BAR_W + b * (BAR_W / 4),
                top: 0, width: 1, height: totalHeight,
                background: "rgba(96,165,250,0.05)",
              }} />
            ))
          )}

          {/* Playing highlight */}
          {playingIndex != null && (
            <div style={{
              position: "absolute",
              left: PIANO_W + playingIndex * BAR_W, top: 0,
              width: BAR_W, height: totalHeight,
              background: "rgba(34,211,238,0.04)",
              borderLeft: "2px solid rgba(34,211,238,0.4)",
              pointerEvents: "none", transition: "left 0.1s",
            }} />
          )}

          {/* Note blocks */}
          {displayNotes.map((notes, barIdx) => {
            const isDragging = drag?.barIdx === barIdx;
            return notes.map((midi, noteIdx) => {
              const rowIdx = MIDI_TOP - 1 - midi;
              if (rowIdx < 0 || rowIdx >= ROWS) return null;
              const noteName = NOTE_NAMES[midi % 12];
              return (
                <div
                  key={`n-${barIdx}-${noteIdx}`}
                  onMouseDown={e => startDrag(e, barIdx)}
                  style={{
                    position: "absolute",
                    left: PIANO_W + barIdx * BAR_W + 2,
                    top: rowIdx * ROW_H + 1,
                    width: BAR_W - 4,
                    height: ROW_H - 2,
                    background: isDragging
                      ? "rgba(96,165,250,0.9)"
                      : playingIndex === barIdx
                        ? "rgba(34,211,238,0.85)"
                        : "rgba(134,239,172,0.65)",
                    borderRadius: 2,
                    display: "flex", alignItems: "center", paddingLeft: 4,
                    cursor: onTranspose ? "ns-resize" : "default",
                    transition: isDragging ? "none" : "background 0.1s",
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: 9, color: "rgba(0,0,0,0.6)", fontFamily: "monospace" }}>
                    {noteName}
                  </span>
                </div>
              );
            });
          })}
        </div>
      </div>

      {onTranspose && (
        <p className="text-center py-1 text-xs font-mono" style={{ color: "#374151", borderTop: "1px solid rgba(96,165,250,0.08)" }}>
          drag notes ↑↓ to transpose
        </p>
      )}
    </div>
  );
}
