const DISMISSED_STORAGE_KEY = 'mapshroom:mapping-first-step-dismissed:v1';

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isMappingFirstStepDismissed(): boolean {
  return readStorage()?.getItem(DISMISSED_STORAGE_KEY) === 'true';
}

export function dismissMappingFirstStepPermanently(): void {
  try {
    readStorage()?.setItem(DISMISSED_STORAGE_KEY, 'true');
  } catch {
    // The guide can still be dismissed for the current session when storage is unavailable.
  }
}
