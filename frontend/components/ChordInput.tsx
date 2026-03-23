"use client";

import { useState, useEffect, useRef } from "react";
import {
  suggestChords,
  generateProgression,
  ChordSuggestion,
  GenerationResult,
} from "@/lib/api";
import { parseChord, getInversions, transposeChord, NOTE_NAMES } from "@/lib/chords";
import { downloadMidi } from "@/lib/midi";
import SuggestionPanel from "./SuggestionPanel";
import PianoChord from "./PianoChord";
import PianoRoll from "./PianoRoll";

function midiToTone(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

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
  const [editedProgression, setEditedProgression] = useState<string[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [error, setError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const loopingRef = useRef(looping);
  loopingRef.current = looping;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  // Sync edited progression when a new result arrives
  useEffect(() => {
    if (generationResult) setEditedProgression(generationResult.progression);
  }, [generationResult]);

  const handleTranspose = (i: number, semitones: number) => {
    setEditedProgression(prev => {
      const next = [...prev];
      next[i] = transposeChord(prev[i], semitones);
      return next;
    });
  };

  const handlePlayAll = async () => {
    if (playingAll) { stopRef.current = true; return; }
    stopRef.current = false;
    setPlayingAll(true);
    const Tone = await import("tone");
    await Tone.start();

    let go = true;
    while (go) {
      for (let i = 0; i < editedProgression.length; i++) {
        if (stopRef.current) { go = false; break; }
        setPlayingIndex(i);
        const barMs = (60_000 / bpmRef.current) * 4;
        const parsed = parseChord(editedProgression[i]);
        const notes = parsed ? getInversions(parsed)[0].midiNotes.map(midiToTone) : [];
        if (notes.length > 0) {
          const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.5 },
            volume: -10,
          }).toDestination();
          synth.triggerAttackRelease(notes, "1n");
          await new Promise(r => setTimeout(r, barMs * 0.92));
          synth.dispose();
          await new Promise(r => setTimeout(r, barMs * 0.08));
        }
      }
      if (!loopingRef.current || stopRef.current) go = false;
    }

    setPlayingIndex(null);
    setPlayingAll(false);
  };

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
        { key: key || "C major", mood: styleContext || "neutral", tempo: bpm },
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
        style={{ border: "1px solid rgba(96,165,250,0.28)", background: "rgba(30,58,138,0.07)", borderRadius: "12px" }}
      >
        <h2 className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>
          Chord Assistant
        </h2>

        <input
          type="text" value={progression} onChange={(e) => setProgression(e.target.value)}
          placeholder="Enter your progression (e.g. Am F C)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(96,165,250,0.2)", color: "#f9fafb" }}
        />
        <input
          type="text" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="Key (e.g. A minor)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(96,165,250,0.2)", color: "#f9fafb" }}
        />
        <input
          type="text" value={styleContext} onChange={(e) => setStyleContext(e.target.value)}
          placeholder="Style context (e.g. lo-fi, melancholic)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(96,165,250,0.2)", color: "#f9fafb" }}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSuggest} disabled={loadingSuggest || !progression.trim()}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200 disabled:opacity-40"
            style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.4)", color: "#60a5fa" }}
          >
            {loadingSuggest ? "Thinking..." : "What fits next?"}
          </button>
          <button
            onClick={handleGenerate} disabled={loadingGenerate}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200 disabled:opacity-40"
            style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee" }}
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

      {error && <p className="text-sm px-1" style={{ color: "#f87171" }}>{error}</p>}

      {suggestions.length > 0 && <SuggestionPanel suggestions={suggestions} />}

      {generationResult && editedProgression.length > 0 && (
        <div
          className="p-5 rounded-xl space-y-4"
          style={{ border: "1px solid rgba(34,211,238,0.25)", background: "rgba(34,211,238,0.04)", borderRadius: "12px" }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>
              Generated Progression
            </h3>
            <div className="flex items-center gap-2">
              {/* Loop */}
              <button
                onClick={() => setLooping(l => !l)}
                title="Loop"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: looping ? "rgba(34,211,238,0.2)" : "transparent",
                  border: `1px solid ${looping ? "rgba(34,211,238,0.6)" : "rgba(34,211,238,0.25)"}`,
                  color: looping ? "#22d3ee" : "#6b7280",
                }}
              >
                ⟳
              </button>
              {/* Reset */}
              <button
                onClick={() => setEditedProgression(generationResult.progression)}
                disabled={editedProgression.join() === generationResult.progression.join()}
                title="Reset to original"
                className="flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-mono transition-all disabled:opacity-30"
                style={{ background: "transparent", border: "1px solid rgba(96,165,250,0.25)", color: "#6b7280" }}
              >
                ↺ Reset
              </button>
              {/* MIDI export */}
              <button
                onClick={() => downloadMidi(editedProgression, bpm)}
                title="Export MIDI"
                className="flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-mono transition-all"
                style={{ background: "transparent", border: "1px solid rgba(34,211,238,0.25)", color: "#6b7280" }}
              >
                <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                  <path d="M5.5 1v7M2 8l3.5 3 3.5-3M1 11h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                MIDI
              </button>
              {/* Play All / Stop */}
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: playingAll ? "rgba(34,211,238,0.15)" : "rgba(34,211,238,0.08)",
                  border: `1px solid ${playingAll ? "rgba(34,211,238,0.6)" : "rgba(34,211,238,0.3)"}`,
                  color: "#22d3ee",
                }}
              >
                {playingAll ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="1"/></svg>
                ) : (
                  <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0L10 6L0 12V0Z"/></svg>
                )}
                {playingAll ? "Stop" : "Play all"}
              </button>
            </div>
          </div>

          {/* BPM slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono w-8" style={{ color: "#9ca3af" }}>BPM</span>
            <input
              type="range" min={40} max={200} value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="flex-1 h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: "#22d3ee" }}
            />
            <span className="text-xs font-mono w-8 text-right" style={{ color: "#22d3ee" }}>{bpm}</span>
          </div>

          {/* Chord bars */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${editedProgression.length}, 1fr)` }}>
            {editedProgression.map((chord, i) => {
              const isPlaying = playingIndex === i;
              const isSelected = selectedChord === chord;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-lg overflow-hidden"
                  style={{
                    border: `1px solid ${isPlaying ? "rgba(34,211,238,0.9)" : isSelected ? "rgba(34,211,238,0.5)" : "rgba(34,211,238,0.2)"}`,
                    background: isPlaying ? "rgba(34,211,238,0.15)" : isSelected ? "rgba(34,211,238,0.08)" : "rgba(34,211,238,0.03)",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Up */}
                  <button
                    onClick={() => handleTranspose(i, 1)}
                    className="w-full py-1 text-xs transition-colors hover:bg-cyan-400/10"
                    style={{ color: "#6b7280" }}
                  >
                    ↑
                  </button>
                  {/* Chord name */}
                  <button
                    onClick={() => setSelectedChord(isSelected ? null : chord)}
                    className="w-full py-2 text-center font-bold text-lg"
                    style={{ color: isPlaying ? "#22d3ee" : "#f9fafb" }}
                  >
                    {chord}
                  </button>
                  {/* Down */}
                  <button
                    onClick={() => handleTranspose(i, -1)}
                    className="w-full py-1 text-xs transition-colors hover:bg-cyan-400/10"
                    style={{ color: "#6b7280" }}
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </div>

          {/* Piano roll */}
          <PianoRoll chords={editedProgression} playingIndex={playingIndex} onTranspose={handleTranspose} />

          {/* Piano for selected chord */}
          {selectedChord && (
            <div className="pt-1">
              <PianoChord chord={selectedChord} />
            </div>
          )}

          <p className="text-sm" style={{ color: "#d1d5db" }}>{generationResult.description}</p>
          <p className="text-xs font-mono" style={{ color: "#9ca3af" }}>{generationResult.theory_note}</p>
        </div>
      )}
    </div>
  );
}
