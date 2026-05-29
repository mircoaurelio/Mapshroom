import type {
  MidiTimelineTransportAction,
  ParsedControlChange,
  ParsedNoteMessage,
  ParsedPitchBend,
} from './types';

const FADER_COUNT = 8;

/** Mackie / DAW mode volume CC used by SMC-Mixer faders. */
export const SMC_MIXER_FADER_VOLUME_CC = 7;
const SMC_MIXER_SHIFT_CODES = new Set([70]);
const SMC_MIXER_SHIFT_LEFT_CODES = new Set([52]);
const SMC_MIXER_SHIFT_RIGHT_CODES = new Set([53]);

/**
 * SMC-Mixer fader mapping only — ignores button CC traffic.
 * DAW mode: CC 7 on MIDI channels 1-8.
 * User/CC mode: CC 1-8 on channel 1 (typical MidiSuite fader layout).
 */
export function resolveSmcMixerFaderIndex(message: ParsedControlChange): number | null {
  if (
    message.controller === SMC_MIXER_FADER_VOLUME_CC &&
    message.channel >= 1 &&
    message.channel <= FADER_COUNT
  ) {
    return message.channel - 1;
  }

  if (
    message.channel === 1 &&
    message.controller >= 1 &&
    message.controller <= FADER_COUNT
  ) {
    return message.controller - 1;
  }

  return null;
}

export function resolveSmcMixerShaderFaderIndex(message: ParsedControlChange): number | null {
  if (
    message.controller === SMC_MIXER_FADER_VOLUME_CC &&
    message.channel >= 1 &&
    message.channel <= FADER_COUNT
  ) {
    return message.channel - 1;
  }

  if (
    message.channel === 1 &&
    message.controller >= 1 &&
    message.controller <= FADER_COUNT
  ) {
    return message.controller - 1;
  }

  return null;
}

export function resolveSmcMixerTimelineFaderIndex(_message: ParsedControlChange): number | null {
  return null;
}

export function resolveSmcMixerPitchBendFaderIndex(message: ParsedPitchBend): number | null {
  if (message.channel >= 1 && message.channel <= FADER_COUNT) {
    return message.channel - 1;
  }

  return null;
}

export function resolveSmcMixerKnobIndex(message: ParsedControlChange): number | null {
  if (message.controller === 10 && message.channel >= 1 && message.channel <= FADER_COUNT) {
    return message.channel - 1;
  }

  if (message.channel === 1 && message.controller >= 16 && message.controller <= 23) {
    return message.controller - 16;
  }

  return null;
}

export function resolveSmcMixerTransport(
  message: ParsedControlChange | ParsedNoteMessage,
): MidiTimelineTransportAction | null {
  const code = message.kind === 'cc' ? message.controller : message.note;

  if (message.kind === 'note-on' || message.kind === 'note-off') {
    switch (code) {
      case 94:
        return 'play';
      case 93:
        return 'stop';
      case 95:
        return 'record';
      case 91:
        return 'previous-cut';
      case 92:
        return 'next-cut';
      case 46:
        return 'previous-mix';
      case 47:
        return 'next-mix';
      case 48:
        return 'mix-faster';
      case 49:
        return 'mix-slower';
      case 50:
        return 'select-left';
      case 51:
        return 'select-right';
      default:
        return null;
    }
  }

  if (message.channel !== 1) {
    return null;
  }

  switch (code) {
    case 22:
    case 23:
      return 'cycle-mix-mode';
    case 41:
      return 'play';
    case 42:
      return 'stop';
    case 43:
      return 'record';
    case 44:
      return 'previous-cut';
    case 45:
      return 'next-cut';
    case 46:
      return 'previous-mix';
    case 47:
      return 'next-mix';
    case 48:
      return 'mix-faster';
    case 49:
      return 'mix-slower';
    case 50:
      return 'select-left';
    case 51:
      return 'select-right';
    default:
      return null;
  }
}

export function isSmcMixerShiftButton(message: ParsedControlChange | ParsedNoteMessage): boolean {
  const code = message.kind === 'cc' ? message.controller : message.note;
  return SMC_MIXER_SHIFT_CODES.has(code);
}

export function resolveSmcMixerModeSwitch(
  message: ParsedControlChange | ParsedNoteMessage,
): 'shader-uniforms' | 'timeline-mixer' | null {
  const code = message.kind === 'cc' ? message.controller : message.note;
  if (SMC_MIXER_SHIFT_LEFT_CODES.has(code)) {
    return 'shader-uniforms';
  }
  if (SMC_MIXER_SHIFT_RIGHT_CODES.has(code)) {
    return 'timeline-mixer';
  }

  return null;
}

export function isUnambiguousSmcMixerShaderFader(message: ParsedControlChange): boolean {
  return (
    message.controller === SMC_MIXER_FADER_VOLUME_CC &&
    message.channel >= 1 &&
    message.channel <= FADER_COUNT
  );
}

export function isUnambiguousSmcMixerTimelineControl(
  message: ParsedControlChange | ParsedPitchBend | ParsedNoteMessage,
): boolean {
  if (message.kind === 'pitch-bend' || message.kind === 'note-on' || message.kind === 'note-off') {
    return true;
  }

  if (message.kind !== 'cc') {
    return false;
  }

  return (
    (message.controller === 10 && message.channel >= 1 && message.channel <= 8) ||
    (message.channel === 1 && (message.controller === 22 || message.controller === 23)) ||
    (message.channel === 1 && message.controller >= 41 && message.controller <= 51)
  );
}

export function isPressedMidiButton(message: ParsedControlChange | ParsedNoteMessage): boolean {
  if (message.kind === 'cc') {
    return message.value > 0;
  }

  return message.kind === 'note-on' && message.velocity > 0;
}
