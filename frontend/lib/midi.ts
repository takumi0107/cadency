import { parseChord, getInversions } from './chords';

const varLen = (n: number): number[] => {
  const buf = [n & 0x7f];
  n >>= 7;
  while (n > 0) { buf.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return buf;
};
const u32 = (n: number) => [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const u24 = (n: number) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];

export function downloadMidi(chords: string[], bpm: number, filename = 'progression.mid') {
  const PPQ = 480;
  const tempo = Math.round(60_000_000 / bpm);
  const barTicks = PPQ * 4;
  const CH = 0;
  const VEL = 80;

  const events: number[] = [];

  // Tempo meta event
  events.push(...varLen(0), 0xff, 0x51, 0x03, ...u24(tempo));

  for (const chord of chords) {
    const parsed = parseChord(chord);
    const notes = parsed ? getInversions(parsed)[0].midiNotes : [60, 64, 67];

    // Note ons (all at delta 0)
    for (const note of notes) {
      events.push(...varLen(0), 0x90 | CH, note, VEL);
    }
    // Note offs after 1 bar
    for (let i = 0; i < notes.length; i++) {
      events.push(...varLen(i === 0 ? barTicks : 0), 0x80 | CH, notes[i], 0);
    }
  }

  // End of track
  events.push(...varLen(0), 0xff, 0x2f, 0x00);

  const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(PPQ)];
  const track = [0x4d, 0x54, 0x72, 0x6b, ...u32(events.length), ...events];
  const blob = new Blob([new Uint8Array([...header, ...track])], { type: 'audio/midi' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
