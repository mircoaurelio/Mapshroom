import type { ParsedMidiMessage } from './types';

export function parseMidiMessage(data: Uint8Array): ParsedMidiMessage {
  if (data.length < 2) {
    return { kind: 'unknown', raw: data };
  }

  const status = data[0] ?? 0;
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  if (command === 0xb0 && data.length >= 3) {
    return {
      kind: 'cc',
      channel,
      controller: data[1] ?? 0,
      value: data[2] ?? 0,
    };
  }

  if (command === 0x90 && data.length >= 3) {
    const velocity = data[2] ?? 0;
    return {
      kind: velocity === 0 ? 'note-off' : 'note-on',
      channel,
      note: data[1] ?? 0,
      velocity,
    };
  }

  if (command === 0x80 && data.length >= 3) {
    return {
      kind: 'note-off',
      channel,
      note: data[1] ?? 0,
      velocity: data[2] ?? 0,
    };
  }

  if (command === 0xe0 && data.length >= 3) {
    return {
      kind: 'pitch-bend',
      channel,
      value: (data[1] ?? 0) | ((data[2] ?? 0) << 7),
    };
  }

  return { kind: 'unknown', raw: data };
}
