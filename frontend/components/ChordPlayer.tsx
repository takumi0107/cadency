"use client";

import { useCallback } from "react";

// Basic chord-to-notes mapping for common chords
const CHORD_NOTES: Record<string, string[]> = {
  // Major chords
  C: ["C4", "E4", "G4"],
  D: ["D3", "F#3", "A3"],
  E: ["E3", "G#3", "B3"],
  F: ["F3", "A3", "C4"],
  G: ["G3", "B3", "D4"],
  A: ["A3", "C#4", "E4"],
  B: ["B3", "D#4", "F#4"],
  // Minor chords
  Am: ["A3", "C4", "E4"],
  Bm: ["B3", "D4", "F#4"],
  Cm: ["C4", "Eb4", "G4"],
  Dm: ["D3", "F3", "A3"],
  Em: ["E3", "G3", "B3"],
  Fm: ["F3", "Ab3", "C4"],
  Gm: ["G3", "Bb3", "D4"],
  // Flat major chords
  Bb: ["Bb3", "D4", "F4"],
  Eb: ["Eb3", "G3", "Bb3"],
  Ab: ["Ab3", "C4", "Eb4"],
  Db: ["Db3", "F3", "Ab3"],
  Gb: ["Gb3", "Bb3", "Db4"],
  // Sharp major
  "F#": ["F#3", "A#3", "C#4"],
  "C#": ["C#4", "F4", "G#4"],
  // Minor with flats/sharps
  "F#m": ["F#3", "A3", "C#4"],
  "C#m": ["C#4", "E4", "G#4"],
  "Bbm": ["Bb3", "Db4", "F4"],
  "Ebm": ["Eb3", "Gb3", "Bb3"],
  "Abm": ["Ab3", "B3", "Eb4"],
};

function resolveNotes(chordName: string): string[] {
  if (CHORD_NOTES[chordName]) return CHORD_NOTES[chordName];
  // Try stripping variations like maj7, 7, sus2 etc.
  const base = chordName.replace(/(maj7|maj|min|m7|7|sus2|sus4|add9|dim|aug)$/, "");
  if (CHORD_NOTES[base]) return CHORD_NOTES[base];
  // Fallback: C major
  return ["C4", "E4", "G4"];
}

interface ChordPlayerProps {
  chord: string;
}

export default function ChordPlayer({ chord }: ChordPlayerProps) {
  const playChord = useCallback(async () => {
    // Dynamically import Tone.js to avoid SSR issues
    const Tone = await import("tone");
    await Tone.start();

    const notes = resolveNotes(chord);

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -10,
    }).toDestination();

    synth.triggerAttackRelease(notes, "2n");

    // Dispose after 3 seconds
    setTimeout(() => synth.dispose(), 3000);
  }, [chord]);

  return (
    <button
      onClick={playChord}
      title={`Play ${chord}`}
      className="flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/40 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-200 group"
    >
      {/* Cyan triangle play icon */}
      <svg
        width="10"
        height="12"
        viewBox="0 0 10 12"
        fill="none"
        className="text-cyan-400 group-hover:text-cyan-300 transition-colors ml-0.5"
      >
        <path d="M0 0L10 6L0 12V0Z" fill="currentColor" />
      </svg>
    </button>
  );
}
