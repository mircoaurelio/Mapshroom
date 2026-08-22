import { invokeDesktop, isTauri } from './runtime.ts';

export interface DesktopMonitor {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}

export async function listDesktopMonitors(): Promise<DesktopMonitor[]> {
  if (!isTauri()) {
    return [];
  }
  return invokeDesktop<DesktopMonitor[]>('list_monitors');
}

export async function openDesktopOutputWindow(sessionId: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  await invokeDesktop('open_output_window', { sessionId });
  return true;
}

export async function focusDesktopOutputWindow(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  return invokeDesktop<boolean>('focus_output_window');
}

export async function placeDesktopOutputOnMonitor(
  monitorId: string | null,
  fullscreen = true,
): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  await invokeDesktop('place_output_on_monitor', {
    monitorId,
    fullscreen,
  });
  return true;
}

export async function closeDesktopOutputWindow(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invokeDesktop('close_output_window');
}
