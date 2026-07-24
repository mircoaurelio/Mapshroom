export const ASSETS_FIRST_STEP_DELAY_MS = 30_000;

const DISMISSED_STORAGE_KEY = 'mapshroom:assets-first-step-dismissed:v1';
const ELAPSED_SESSION_KEY = 'mapshroom:assets-first-step-elapsed-ms:v1';
const ELIGIBLE_SESSION_KEY = 'mapshroom:assets-first-step-eligible:v1';
const STAGE_SESSION_KEY = 'mapshroom:assets-first-step-stage:v1';

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

function removeStorage(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function isAssetsFirstStepDismissed(): boolean {
  return readStorage(window.localStorage, DISMISSED_STORAGE_KEY) === 'true';
}

export function readAssetsFirstStepElapsedMs(): number {
  const elapsedMs = Number(readStorage(window.sessionStorage, ELAPSED_SESSION_KEY));
  return Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
}

export function persistAssetsFirstStepElapsedMs(elapsedMs: number): void {
  writeStorage(
    window.sessionStorage,
    ELAPSED_SESSION_KEY,
    String(Math.max(0, Math.round(elapsedMs))),
  );
}

export function isAssetsFirstStepSessionEligible(): boolean {
  return readStorage(window.sessionStorage, ELIGIBLE_SESSION_KEY) === 'true';
}

export function markAssetsFirstStepSessionEligible(): void {
  writeStorage(window.sessionStorage, ELIGIBLE_SESSION_KEY, 'true');
}

export function isAssetsImportStepPending(): boolean {
  return readStorage(window.sessionStorage, STAGE_SESSION_KEY) === 'import';
}

export function advanceAssetsFirstStepToImport(): void {
  writeStorage(window.sessionStorage, STAGE_SESSION_KEY, 'import');
  removeStorage(window.sessionStorage, ELAPSED_SESSION_KEY);
}

export function dismissAssetsFirstStepPermanently(): void {
  writeStorage(window.localStorage, DISMISSED_STORAGE_KEY, 'true');
  removeStorage(window.sessionStorage, ELAPSED_SESSION_KEY);
  removeStorage(window.sessionStorage, STAGE_SESSION_KEY);
}
