export type SoundPreset = "piano" | "warm" | "bright" | "organ";

export interface SynthOptions {
  oscillator: { type: "triangle" | "sine" | "sawtooth" | "square" };
  envelope: { attack: number; decay: number; sustain: number; release: number };
  volume: number;
}

// Synth presets for non-piano sounds
export const SYNTH_PRESETS: Record<Exclude<SoundPreset, "piano">, { label: string; options: SynthOptions }> = {
  warm:   { label: "Warm",   options: { oscillator: { type: "sine" },     envelope: { attack: 0.05, decay: 0.5,  sustain: 0.7, release: 2.5 }, volume: -10 } },
  bright: { label: "Bright", options: { oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.1,  sustain: 0.3, release: 0.8 }, volume: -14 } },
  organ:  { label: "Organ",  options: { oscillator: { type: "square" },   envelope: { attack: 0.01, decay: 0.01, sustain: 0.9, release: 0.3 }, volume: -14 } },
};

// Labels for all presets (including piano)
export const SOUND_PRESETS: Record<SoundPreset, { label: string }> = {
  piano:  { label: "Piano" },
  warm:   { label: "Warm" },
  bright: { label: "Bright" },
  organ:  { label: "Organ" },
};

// ---------------------------------------------------------------------------
// Salamander Grand Piano sampler (singleton — loaded once, reused)
// ---------------------------------------------------------------------------

// Subset of the Salamander sample set — Tone.Sampler interpolates between them
const SALAMANDER_URLS: Record<string, string> = {
  A0: "A0.mp3",  C1: "C1.mp3",  "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3",  C2: "C2.mp3",  "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3",  C3: "C3.mp3",  "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3",  C4: "C4.mp3",  "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3",  C5: "C5.mp3",  "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3",  C6: "C6.mp3",  "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3",  C7: "C7.mp3",
};

const BASE_URL = "https://tonejs.github.io/audio/salamander/";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sampler: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _samplerPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPianoSampler(Tone: any) {
  if (_sampler) return _sampler;
  if (_samplerPromise) return _samplerPromise;

  _samplerPromise = new Promise((resolve) => {
    _sampler = new Tone.Sampler({
      urls: SALAMANDER_URLS,
      baseUrl: BASE_URL,
      onload: () => resolve(_sampler),
    }).toDestination();
  });

  return _samplerPromise;
}
