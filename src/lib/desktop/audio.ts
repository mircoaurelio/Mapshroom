import { invokeDesktop, isTauri, listenDesktop } from './runtime.ts';

export interface DesktopAudioDevice {
  id: string;
  name: string;
  kind: 'microphone' | 'loopback' | string;
}

export interface DesktopAudioFrame {
  timestampMs: number;
  rms: number;
  peak: number;
  bass: number;
  mid: number;
  treble: number;
  spectralFlux: number;
  beat: boolean;
  bpm: number;
}

export async function listDesktopAudioDevices(): Promise<DesktopAudioDevice[]> {
  if (!isTauri()) {
    return [];
  }
  return invokeDesktop<DesktopAudioDevice[]>('list_audio_devices');
}

export async function startDesktopAudioCapture(
  source: 'microphone' | 'system',
  deviceId?: string | null,
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Desktop audio capture is only available in the Tauri app.');
  }
  await invokeDesktop('start_audio_capture', {
    source,
    deviceId: deviceId ?? null,
  });
}

export async function stopDesktopAudioCapture(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invokeDesktop('stop_audio_capture');
}

export async function getDesktopAudioFrame(): Promise<DesktopAudioFrame | null> {
  if (!isTauri()) {
    return null;
  }
  return invokeDesktop<DesktopAudioFrame>('get_audio_frame');
}

export async function listenDesktopAudioFrames(
  handler: (frame: DesktopAudioFrame) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined;
  }
  return listenDesktop<DesktopAudioFrame>('audio://frame', handler);
}
