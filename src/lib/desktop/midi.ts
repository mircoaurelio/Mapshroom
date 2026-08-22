import { invokeDesktop, isTauri, listenDesktop } from './runtime.ts';

export interface DesktopMidiDevice {
  id: string;
  name: string;
}

export interface DesktopMidiMessage {
  deviceId: string;
  deviceName: string;
  bytes: number[];
  timestampMs: number;
}

export async function listDesktopMidiInputs(): Promise<DesktopMidiDevice[]> {
  if (!isTauri()) {
    return [];
  }
  return invokeDesktop<DesktopMidiDevice[]>('list_midi_inputs');
}

export async function startDesktopMidiListen(
  deviceId?: string | null,
): Promise<DesktopMidiDevice> {
  if (!isTauri()) {
    throw new Error('Desktop MIDI is only available in the Tauri app.');
  }
  return invokeDesktop<DesktopMidiDevice>('start_midi_listen', {
    deviceId: deviceId ?? null,
  });
}

export async function stopDesktopMidiListen(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invokeDesktop('stop_midi_listen');
}

export async function listenDesktopMidiMessages(
  handler: (message: DesktopMidiMessage) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined;
  }
  return listenDesktop<DesktopMidiMessage>('midi://message', handler);
}
