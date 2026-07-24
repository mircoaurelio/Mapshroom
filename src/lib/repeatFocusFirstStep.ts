const DISMISSED_STORAGE_KEY = 'mapshroom:repeat-focus-first-step-dismissed:v1';
let dismissedForCurrentVisit = false;

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // The guide still works for the current visit when browser storage is unavailable.
  }
}

export function isRepeatFocusFirstStepDismissed(): boolean {
  return (
    dismissedForCurrentVisit ||
    readStorage(window.localStorage, DISMISSED_STORAGE_KEY) === 'true'
  );
}

export function dismissRepeatFocusFirstStepPermanently(): void {
  dismissedForCurrentVisit = true;
  writeStorage(window.localStorage, DISMISSED_STORAGE_KEY, 'true');
}
