export interface OutputViewportSnapshot {
  width: number;
  height: number;
  devicePixelRatio: number;
  updatedAt: number;
}

const OUTPUT_VIEWPORT_STORAGE_PREFIX = 'mapshroom-v3:output-viewport:';
const OUTPUT_VIEWPORT_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function getOutputViewportStorageKey(sessionId: string): string {
  return `${OUTPUT_VIEWPORT_STORAGE_PREFIX}${sessionId}`;
}

function isUsableDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function saveOutputViewportSnapshot(sessionId: string): void {
  if (!sessionId) {
    return;
  }

  const snapshot: OutputViewportSnapshot = {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(getOutputViewportStorageKey(sessionId), JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Unable to save output viewport snapshot.', error);
  }
}

export function loadOutputViewportSnapshot(sessionId: string): OutputViewportSnapshot | null {
  if (!sessionId) {
    return null;
  }

  const raw = localStorage.getItem(getOutputViewportStorageKey(sessionId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OutputViewportSnapshot>;
    if (
      !isUsableDimension(parsed.width) ||
      !isUsableDimension(parsed.height) ||
      !isUsableDimension(parsed.devicePixelRatio) ||
      !isUsableDimension(parsed.updatedAt) ||
      Date.now() - parsed.updatedAt > OUTPUT_VIEWPORT_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      width: parsed.width,
      height: parsed.height,
      devicePixelRatio: parsed.devicePixelRatio,
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.warn('Unable to load output viewport snapshot.', error);
    return null;
  }
}
