import { parseMidiMessage } from './parseMidiMessage';
import type { MidiEventLine } from './types';

function formatRawBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

export function formatMidiMessage(
  data: Uint8Array,
  deviceName: string,
): Pick<MidiEventLine, 'deviceName' | 'summary' | 'raw'> {
  const raw = formatRawBytes(data);
  const parsed = parseMidiMessage(data);

  switch (parsed.kind) {
    case 'cc':
      return {
        deviceName,
        summary: `CC ${parsed.controller} = ${parsed.value} (ch ${parsed.channel})`,
        raw,
      };
    case 'note-on':
      return {
        deviceName,
        summary: `Note On ${parsed.note} vel ${parsed.velocity} (ch ${parsed.channel})`,
        raw,
      };
    case 'note-off':
      return {
        deviceName,
        summary: `Note Off ${parsed.note} (ch ${parsed.channel})`,
        raw,
      };
    case 'pitch-bend':
      return {
        deviceName,
        summary: `Pitch Bend ${parsed.value} (ch ${parsed.channel})`,
        raw,
      };
    default:
      return {
        deviceName,
        summary: `Data (${raw})`,
        raw,
      };
  }
}
