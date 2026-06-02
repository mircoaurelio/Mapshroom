import { BROADCAST_PREFIX } from '../../config';
import { restoreTransport, snapshotTransport } from '../clock';
import type { PlaybackTransport } from '../../types';

const MIDI_OUTPUT_STORAGE_PREFIX = 'mapshroom-v3:midi-output:';

export interface MidiOutputMixState {
  enabled: boolean;
  currentStepId: string | null;
  nextStepId: string | null;
  followingStepId: string | null;
  progress: number;
  updatedAt: number;
}

export interface MidiOutputLiveState extends MidiOutputMixState {
  transport: PlaybackTransport | null;
}

function getMidiOutputChannelName(sessionId: string): string {
  return `${BROADCAST_PREFIX}${sessionId}:midi-output`;
}

function getMidiOutputStorageKey(sessionId: string): string {
  return `${MIDI_OUTPUT_STORAGE_PREFIX}${sessionId}`;
}

function normalizeMidiOutputLiveState(
  payload: Partial<MidiOutputLiveState> | null | undefined,
): MidiOutputLiveState | null {
  if (!payload) {
    return null;
  }

  return {
    enabled: Boolean(payload.enabled),
    currentStepId: typeof payload.currentStepId === 'string' ? payload.currentStepId : null,
    nextStepId: typeof payload.nextStepId === 'string' ? payload.nextStepId : null,
    followingStepId:
      typeof payload.followingStepId === 'string' ? payload.followingStepId : null,
    progress:
      typeof payload.progress === 'number' && Number.isFinite(payload.progress)
        ? Math.max(0, Math.min(1, payload.progress))
        : 0,
    updatedAt:
      typeof payload.updatedAt === 'number' && Number.isFinite(payload.updatedAt)
        ? payload.updatedAt
        : Date.now(),
    transport: payload.transport ? restoreTransport(payload.transport) : null,
  };
}

function parseMidiOutputMixState(value: string | null): MidiOutputLiveState | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeMidiOutputLiveState(JSON.parse(value) as Partial<MidiOutputLiveState>);
  } catch (error) {
    console.warn('Unable to parse MIDI output state.', error);
    return null;
  }
}

export function loadMidiOutputMixState(sessionId: string): MidiOutputLiveState | null {
  return parseMidiOutputMixState(localStorage.getItem(getMidiOutputStorageKey(sessionId)));
}

export function createMidiOutputSync(
  sessionId: string,
  onStateUpdate: (state: MidiOutputLiveState) => void,
) {
  const channelName = getMidiOutputChannelName(sessionId);
  const storageKey = getMidiOutputStorageKey(sessionId);
  const broadcastChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) {
      return;
    }

    const nextState = parseMidiOutputMixState(event.newValue);
    if (nextState) {
      onStateUpdate(nextState);
    }
  };

  const handleMessage = (event: MessageEvent<MidiOutputLiveState>) => {
    const nextState = normalizeMidiOutputLiveState(event.data);
    if (nextState) {
      onStateUpdate(nextState);
    }
  };

  window.addEventListener('storage', handleStorage);
  broadcastChannel?.addEventListener('message', handleMessage);

  return {
    publish(state: MidiOutputLiveState) {
      const stateSnapshot = {
        ...state,
        transport: state.transport ? snapshotTransport(state.transport) : null,
      };
      const payload = JSON.stringify(stateSnapshot);
      localStorage.setItem(storageKey, payload);
      broadcastChannel?.postMessage(stateSnapshot);
    },
    destroy() {
      window.removeEventListener('storage', handleStorage);
      broadcastChannel?.removeEventListener('message', handleMessage);
      broadcastChannel?.close();
    },
  };
}
