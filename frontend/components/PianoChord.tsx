"use client";

import { useState, useCallback } from "react";
import { parseChord, getInversions, NOTE_NAMES } from "@/lib/chords";

const KEY_LAYOUT = [
  { isBlack: false, whitePos: 0 },
  { isBlack: true,  blackCenter: 0.6 },
  { isBlack: false, whitePos: 1 },
  { isBlack: true,  blackCenter: 1.6 },
  { isBlack: false, whitePos: 2 },
  { isBlack: false, whitePos: 3 },
  { isBlack: true,  blackCenter: 3.6 },
  { isBlack: false, whitePos: 4 },
  { isBlack: true,  blackCenter: 4.6 },
  { isBlack: false, whitePos: 5 },
  { isBlack: true,  blackCenter: 5.6 },
  { isBlack: false, whitePos: 6 },
] as const;

const WW = 18;
const WH = 58;
const BW = 11;
const BH = 36;

function midiToTone(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

interface PianoChordProps {
  chord: string;
}

export default function PianoChord({ chord }: PianoChordProps) {
  const [inversionIdx, setInversionIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const parsed = parseChord(chord);
  const inversions = parsed ? getInversions(parsed) : [];

  const playChord = useCallback(async () => {
    if (playing || inversions.length === 0) return;
    setPlaying(true);
    const Tone = await import("tone");
    await Tone.start();
    const notes = inversions[inversionIdx].midiNotes.map(midiToTone);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.5 },
      volume: -10,
    }).toDestination();
    synth.triggerAttackRelease(notes, "2n");
    setTimeout(() => { synth.dispose(); setPlaying(false); }, 2500);
  }, [playing, inversions, inversionIdx]);

  if (!parsed || inversions.length === 0) return null;

  const activeNotes = new Set(inversions[inversionIdx].midiNotes);
  const allMidi = inversions.flatMap(inv => inv.midiNotes);
  const startC = Math.floor(Math.min(...allMidi) / 12) * 12;
  const endC = (Math.ceil(Math.max(...allMidi) / 12) + 1) * 12;
  const startOctave = startC / 12;

  type Key = { midi: number; isBlack: boolean; left: number };
  const whites: Key[] = [];
  const blacks: Key[] = [];

  for (let midi = startC; midi < endC; midi++) {
    const semitone = midi % 12;
    const octave = Math.floor(midi / 12);
    const rel = octave - startOctave;
    const info = KEY_LAYOUT[semitone];

    if (!info.isBlack) {
      whites.push({ midi, isBlack: false, left: (rel * 7 + (info as { isBlack: false; whitePos: number }).whitePos) * WW });
    } else {
      const center = (info as { isBlack: true; blackCenter: number }).blackCenter;
      blacks.push({ midi, isBlack: true, left: (rel * 7 + center) * WW - BW / 2 });
    }
  }

  const totalWidth = whites.length * WW;

  return (
    <div className="space-y-2">
      {/* Piano + play button */}
      <div className="flex items-end gap-3">
        <div className="overflow-x-auto">
          <div className="relative" style={{ width: totalWidth, height: WH }}>
            {whites.map(k => (
              <div
                key={k.midi}
                className="absolute"
                style={{
                  left: k.left, width: WW - 1, height: WH,
                  background: activeNotes.has(k.midi) ? '#60a5fa' : 'rgba(245,245,255,0.93)',
                  border: '1px solid rgba(0,0,0,0.25)',
                  borderRadius: '0 0 3px 3px',
                }}
              />
            ))}
            {blacks.map(k => (
              <div
                key={k.midi}
                className="absolute z-10"
                style={{
                  left: k.left, width: BW, height: BH,
                  background: activeNotes.has(k.midi) ? '#2563eb' : 'rgba(10,10,20,0.95)',
                  borderRadius: '0 0 3px 3px',
                  border: '1px solid rgba(0,0,0,0.4)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={playChord}
          disabled={playing}
          title="Play chord"
          className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 shrink-0"
          style={{
            background: playing ? 'rgba(34,211,238,0.15)' : 'rgba(34,211,238,0.08)',
            border: `1px solid ${playing ? 'rgba(34,211,238,0.6)' : 'rgba(34,211,238,0.3)'}`,
          }}
        >
          {playing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#22d3ee" strokeWidth="4" />
              <path className="opacity-75" fill="#22d3ee" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <path d="M0 0L10 6L0 12V0Z" fill="#22d3ee" />
            </svg>
          )}
        </button>
      </div>

      {/* Inversion selector */}
      {inversions.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {inversions.map((inv, i) => (
            <button
              key={i}
              onClick={() => setInversionIdx(i)}
              className="px-2 py-0.5 rounded text-xs font-mono transition-all"
              style={{
                background: i === inversionIdx ? 'rgba(96,165,250,0.18)' : 'transparent',
                border: `1px solid ${i === inversionIdx ? 'rgba(96,165,250,0.5)' : 'rgba(96,165,250,0.12)'}`,
                color: i === inversionIdx ? '#60a5fa' : '#6b7280',
              }}
            >
              {inv.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
