"use client";

import { useState, useEffect, useRef } from "react";
import {
  generateProgression,
  GenerationResult,
} from "@/lib/api";
import { parseChord, getInversions, transposeChord, NOTE_NAMES } from "@/lib/chords";
import { downloadMidi } from "@/lib/midi";
import { saveProgression, SavedProgression } from "@/lib/api";
import { SoundPreset, SOUND_PRESETS, SYNTH_PRESETS, getPianoSampler } from "@/lib/sounds";
import PianoChord from "./PianoChord";
import PianoRoll from "./PianoRoll";

function midiToTone(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

interface ChordInputProps {
  prefillStyle?: string;
  prefillKey?: string;
  prefillEnergy?: number;
  onSaved?: () => void;
  onUsed?: () => void;
  loadedProgression?: SavedProgression | null;
}

export default function ChordInput({ prefillStyle = "", prefillKey = "", prefillEnergy, onSaved, onUsed, loadedProgression }: ChordInputProps) {
  const [key, setKey] = useState(prefillKey);
  const [styleContext, setStyleContext] = useState(prefillStyle);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [editedProgression, setEditedProgression] = useState<string[]>([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [progressionName, setProgressionName] = useState("");
  const [sound, setSound] = useState<SoundPreset>(() => {
    if (typeof window === "undefined") return "piano";
    return (localStorage.getItem("cadency_sound") as SoundPreset) ?? "piano";
  });
  const [customChordNotes, setCustomChordNotes] = useState<(number[] | null)[]>([]);

  const stopRef = useRef(false);
  const loopingRef = useRef(looping);
  loopingRef.current = looping;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const customChordNotesRef = useRef(customChordNotes);
  customChordNotesRef.current = customChordNotes;

  // Sync edited progression when a new result arrives
  useEffect(() => {
    if (generationResult) {
      setEditedProgression(generationResult.progression);
      setCustomChordNotes(new Array(generationResult.progression.length).fill(null));
    }
  }, [generationResult]);

  // Load a saved progression from the saved-progressions panel
  useEffect(() => {
    if (!loadedProgression) return;
    setEditedProgression(loadedProgression.chords);
    setBpm(loadedProgression.bpm);
    setProgressionName(loadedProgression.name === "Untitled" ? "" : loadedProgression.name);
    setCustomChordNotes(new Array(loadedProgression.chords.length).fill(null));
    setGenerationResult({
      progression: loadedProgression.chords,
      description: loadedProgression.description,
      theory_note: loadedProgression.theory_note,
    });
  }, [loadedProgression]);

  const handleTranspose = (i: number, semitones: number) => {
    setEditedProgression(prev => {
      const next = [...prev];
      next[i] = transposeChord(prev[i], semitones);
      return next;
    });
    setCustomChordNotes(prev => {
      if (!prev[i]) return prev;
      const next = [...prev];
      next[i] = prev[i]!.map(m => m + semitones);
      return next;
    });
  };

  const handleTransposeNote = (barIdx: number, noteIdx: number, semitones: number) => {
    setCustomChordNotes(prev => {
      const next = [...prev];
      const base = next[barIdx] ?? (() => {
        const parsed = parseChord(editedProgression[barIdx]);
        return parsed ? getInversions(parsed)[0].midiNotes : [];
      })();
      const updated = [...base];
      updated[noteIdx] = base[noteIdx] + semitones;
      next[barIdx] = updated;
      return next;
    });
  };

  const handlePlayAll = async () => {
    if (playingAll) { stopRef.current = true; return; }
    stopRef.current = false;
    setPlayingAll(true);
    const Tone = await import("tone");
    await Tone.start();
    const pianoSampler = sound === "piano" ? await getPianoSampler(Tone) : null;

    let go = true;
    while (go) {
      for (let i = 0; i < editedProgression.length; i++) {
        if (stopRef.current) { go = false; break; }
        setPlayingIndex(i);
        const barMs = (60_000 / bpmRef.current) * 4;
        const rawNotes = customChordNotesRef.current[i] ?? (() => {
          const parsed = parseChord(editedProgression[i]);
          return parsed ? getInversions(parsed)[0].midiNotes : [];
        })();
        const notes = rawNotes.map(midiToTone);
        if (notes.length > 0) {
          if (pianoSampler) {
            pianoSampler.triggerAttackRelease(notes, "1n");
            await new Promise(r => setTimeout(r, barMs));
          } else {
            const synth = new Tone.PolySynth(Tone.Synth, SYNTH_PRESETS[sound as Exclude<typeof sound, "piano">].options).toDestination();
            synth.triggerAttackRelease(notes, "1n");
            await new Promise(r => setTimeout(r, barMs * 0.92));
            synth.dispose();
            await new Promise(r => setTimeout(r, barMs * 0.08));
          }
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

  const handleSave = async () => {
    if (!generationResult || editedProgression.length === 0) return;
    setSaving(true);
    try {
      await saveProgression({
        name: progressionName.trim() || "Untitled",
        chords: editedProgression,
        key: key || "",
        mood: styleContext || "",
        bpm,
        description: generationResult.description,
        theory_note: generationResult.theory_note,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
      onSaved?.();
    } catch {
      setError("Failed to save progression");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError(null);
    try {
      const result = await generateProgression(
        { key: key || "C major", mood: styleContext || "neutral", tempo: bpm, energy: prefillEnergy },
        4
      );
      setGenerationResult(result);
      onUsed?.();
      // Auto-save to history
      await saveProgression({
        name: progressionName.trim() || "Untitled",
        chords: result.progression,
        key: key || "",
        mood: styleContext || "",
        bpm,
        description: result.description,
        theory_note: result.theory_note,
      });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoadingGenerate(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(34,211,238,0.2)", background: "rgba(34,211,238,0.03)" }}
      >
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-mono" style={{ color: "#9ca3af" }}>Key</label>
              <input
                type="text" value={key} onChange={(e) => setKey(e.target.value)}
                placeholder="e.g.  A minor"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(34,211,238,0.15)", color: "#f9fafb" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono" style={{ color: "#9ca3af" }}>Style / vibe</label>
              <input
                type="text" value={styleContext} onChange={(e) => setStyleContext(e.target.value)}
                placeholder="e.g.  lo-fi, melancholic"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(34,211,238,0.15)", color: "#f9fafb" }}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate} disabled={loadingGenerate}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-mono transition-all duration-200 disabled:opacity-40"
            style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.28)", color: "#22d3ee" }}
          >
            {loadingGenerate && (
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loadingGenerate ? "Generating..." : "✦ Generate progression"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm px-1" style={{ color: "#f87171" }}>{error}</p>}

      {generationResult && editedProgression.length > 0 && (
        <div
          className="p-5 rounded-xl space-y-4"
          style={{ border: "1px solid rgba(34,211,238,0.25)", background: "rgba(34,211,238,0.04)", borderRadius: "12px" }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>
                Generated Progression
              </h3>
              <input
                type="text"
                value={progressionName}
                onChange={e => setProgressionName(e.target.value)}
                placeholder="Name…"
                className="px-2 py-0.5 rounded text-xs font-mono outline-none"
                style={{ background: "rgba(7,7,15,0.8)", border: "1px solid rgba(96,165,250,0.2)", color: "#f9fafb", width: 110 }}
              />
            </div>
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
                onClick={() => {
                  setEditedProgression(generationResult.progression);
                  setCustomChordNotes(new Array(generationResult.progression.length).fill(null));
                }}
                disabled={editedProgression.join() === generationResult.progression.join() && customChordNotes.every(n => n === null)}
                title="Reset to original"
                className="flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-mono transition-all disabled:opacity-30"
                style={{ background: "transparent", border: "1px solid rgba(96,165,250,0.25)", color: "#6b7280" }}
              >
                ↺ Reset
              </button>
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                title="Save progression"
                className="flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-mono transition-all disabled:opacity-40"
                style={{
                  background: savedMsg ? "rgba(34,197,94,0.15)" : "transparent",
                  border: `1px solid ${savedMsg ? "rgba(34,197,94,0.5)" : "rgba(96,165,250,0.25)"}`,
                  color: savedMsg ? "#4ade80" : "#6b7280",
                }}
              >
                {savedMsg ? "✓ Saved" : saving ? "Saving…" : "Save edits"}
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

          {/* Sound selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono w-12 shrink-0" style={{ color: "#9ca3af" }}>SOUND</span>
            {(Object.keys(SOUND_PRESETS) as SoundPreset[]).map(preset => (
              <button
                key={preset}
                onClick={() => { setSound(preset); localStorage.setItem("cadency_sound", preset); }}
                className="px-2 py-1 rounded text-xs font-mono transition-all"
                style={{
                  background: sound === preset ? "rgba(96,165,250,0.18)" : "transparent",
                  border: `1px solid ${sound === preset ? "rgba(96,165,250,0.5)" : "rgba(34,211,238,0.15)"}`,
                  color: sound === preset ? "#60a5fa" : "#6b7280",
                }}
              >
                {SOUND_PRESETS[preset].label}
              </button>
            ))}
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
          <PianoRoll
            chords={editedProgression}
            customNotes={customChordNotes}
            playingIndex={playingIndex}
            onTranspose={handleTranspose}
            onTransposeNote={handleTransposeNote}
          />

          {/* Piano for selected chord */}
          {selectedChord && (
            <div className="pt-1">
              <PianoChord chord={selectedChord} sound={sound} />
            </div>
          )}

          <p className="text-sm" style={{ color: "#d1d5db" }}>{generationResult.description}</p>
          <p className="text-xs font-mono" style={{ color: "#9ca3af" }}>{generationResult.theory_note}</p>
        </div>
      )}
    </div>
  );
}
