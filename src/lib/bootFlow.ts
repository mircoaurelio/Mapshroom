export const PROJECT_READY_EVENT = 'mapshroom:project-ready';
export const BOOT_EXIT_START_EVENT = 'mapshroom:boot-exit-start';

let bootExitStarted = false;

export function signalProjectReady() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(PROJECT_READY_EVENT));
}

export function signalBootExitStarted() {
  if (typeof window === 'undefined') {
    return;
  }
  bootExitStarted = true;
  window.dispatchEvent(new Event(BOOT_EXIT_START_EVENT));
}

export function hasBootExitStarted() {
  return bootExitStarted;
}
