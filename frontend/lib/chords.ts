export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function transposeChord(chord: string, semitones: number): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const newRoot = ((parsed.root + semitones) % 12 + 12) % 12;
  return CHROMATIC[newRoot] + parsed.quality;
}

const NOTE_MAP: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7,
  'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  'm7b5': [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export interface ParsedChord {
  root: number;
  rootName: string;
  quality: string;
  intervals: number[];
}

export interface Inversion {
  label: string;
  midiNotes: number[];
}

export function parseChord(chord: string): ParsedChord | null {
  const clean = chord.split('/')[0].trim();
  let root = -1, rootName = '', rest = '';

  if (clean.length >= 2 && NOTE_MAP[clean.slice(0, 2)] !== undefined) {
    rootName = clean.slice(0, 2);
    root = NOTE_MAP[rootName];
    rest = clean.slice(2);
  } else if (NOTE_MAP[clean.slice(0, 1)] !== undefined) {
    rootName = clean.slice(0, 1);
    root = NOTE_MAP[rootName];
    rest = clean.slice(1);
  } else {
    return null;
  }

  const intervals = CHORD_INTERVALS[rest] ?? CHORD_INTERVALS[''];
  return { root, rootName, quality: rest, intervals };
}

const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

export function getInversions(chord: ParsedChord, baseOctave = 4): Inversion[] {
  const baseMidi = baseOctave * 12 + chord.root;
  let notes = chord.intervals.map(i => baseMidi + i);
  const inversions: Inversion[] = [];

  for (let i = 0; i < chord.intervals.length; i++) {
    const bassName = NOTE_NAMES[notes[0] % 12];
    const label = i === 0
      ? 'Root position'
      : `${INVERSION_NAMES[i]} — ${bassName} in bass`;
    inversions.push({ label, midiNotes: [...notes] });
    notes = [...notes.slice(1), notes[0] + 12];
  }

  return inversions;
}
