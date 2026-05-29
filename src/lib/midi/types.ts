export type MidiControllerMode = 'shader-uniforms' | 'timeline-mixer';

export type MidiConnectionStatus = 'idle' | 'connected' | 'unsupported' | 'denied' | 'error';

export interface ParsedControlChange {
  kind: 'cc';
  channel: number;
  controller: number;
  value: number;
}

export interface ParsedNoteMessage {
  kind: 'note-on' | 'note-off';
  channel: number;
  note: number;
  velocity: number;
}

export interface ParsedPitchBend {
  kind: 'pitch-bend';
  channel: number;
  value: number;
}

export interface ParsedUnknownMidi {
  kind: 'unknown';
  raw: Uint8Array;
}

export type ParsedMidiMessage =
  | ParsedControlChange
  | ParsedNoteMessage
  | ParsedPitchBend
  | ParsedUnknownMidi;

export interface MidiEventLine {
  id: string;
  timestamp: number;
  deviceName: string;
  summary: string;
  raw: string;
}

export interface MidiFaderBinding {
  faderIndex: number;
  targetName: string | null;
}

export type MidiTimelineTransportAction =
  | 'play'
  | 'stop'
  | 'record'
  | 'previous-cut'
  | 'next-cut'
  | 'previous-mix'
  | 'next-mix'
  | 'mix-faster'
  | 'mix-slower'
  | 'cycle-mix-mode'
  | 'select-left'
  | 'select-right';

export type MidiTimelineStripAction = 'select' | 'duplicate' | 'solo' | 'mute';
