import {
  ACTIVE_SESSION_KEY,
  APP_VERSION,
  ASSET_DB_NAME,
  ASSET_DB_VERSION,
  ASSET_STORE_NAME,
  PROJECT_STORAGE_PREFIX,
  UI_STORAGE_KEY,
} from '../config';
import { restoreTransport, snapshotTransport } from './clock';
import type { ProjectDocument, UiPreferences } from '../types';

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function getProjectStorageKey(sessionId: string): string {
  return `${PROJECT_STORAGE_PREFIX}${sessionId}`;
}

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  localStorage.setItem(ACTIVE_SESSION_KEY, next);
  return next;
}

export function persistActiveSessionId(sessionId: string): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export function loadProjectDocument(sessionId: string): ProjectDocument | null {
  const raw = localStorage.getItem(getProjectStorageKey(sessionId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectDocument;
    if (parsed.version !== APP_VERSION) {
      return null;
    }
    return {
      ...parsed,
      playback: {
        ...parsed.playback,
        transport: restoreTransport(parsed.playback.transport),
      },
    };
  } catch (error) {
    console.warn('Unable to parse persisted project document.', error);
    return null;
  }
}

export function saveProjectDocument(project: ProjectDocument): void {
  const snapshot = {
    ...project,
    playback: {
      ...project.playback,
      transport: snapshotTransport(project.playback.transport),
    },
  };

  localStorage.setItem(getProjectStorageKey(project.sessionId), JSON.stringify(snapshot));
}

export function loadUiPreferences<T extends UiPreferences>(fallback: T): T {
  const raw = localStorage.getItem(UI_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(raw) as Partial<T>),
    };
  } catch (error) {
    console.warn('Unable to parse UI preferences.', error);
    return fallback;
  }
}

export function saveUiPreferences(preferences: UiPreferences): void {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(preferences));
}

export async function clearPersistedSiteData(): Promise<void> {
  const localStorageKeys = Array.from({ length: localStorage.length }, (_, index) =>
    localStorage.key(index),
  ).filter((key): key is string => Boolean(key));

  for (const key of localStorageKeys) {
    if (
      key === ACTIVE_SESSION_KEY ||
      key === UI_STORAGE_KEY ||
      key.startsWith(PROJECT_STORAGE_PREFIX)
    ) {
      localStorage.removeItem(key);
    }
  }

  sessionStorage.clear();

  let openDatabaseHandle: IDBDatabase | null = null;
  try {
    openDatabaseHandle = await openDatabase();
  } catch (error) {
    console.warn('Unable to access IndexedDB before clearing site data.', error);
  }

  openDatabaseHandle?.close();
  cachedDbPromise = null;

  if ('indexedDB' in window) {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(ASSET_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Unable to delete IndexedDB while clearing site data.', request.error);
        resolve();
      };
      request.onblocked = () => {
        console.warn('IndexedDB deletion was blocked while clearing site data.');
        resolve();
      };
    });
  }

  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    } catch (error) {
      console.warn('Unable to clear Cache Storage while clearing site data.', error);
    }
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  if (!('indexedDB' in window)) {
    cachedDbPromise = Promise.resolve(null);
    return cachedDbPromise;
  }

  cachedDbPromise = new Promise((resolve) => {
    const request = indexedDB.open(ASSET_DB_NAME, ASSET_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
        database.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('Unable to open IndexedDB, blob persistence is disabled.', request.error);
      resolve(null);
    };
  });

  return cachedDbPromise;
}

async function withStore(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => void,
): Promise<boolean> {
  const database = await openDatabase();
  if (!database) {
    return false;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(ASSET_STORE_NAME, mode);
    const store = transaction.objectStore(ASSET_STORE_NAME);
    callback(store);

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => {
      console.warn('IndexedDB transaction failed.', transaction.error);
      resolve(false);
    };
  });
}

export async function putAssetBlob(id: string, blob: Blob): Promise<boolean> {
  return withStore('readwrite', (store) => {
    store.put({ id, blob });
  });
}

export async function deleteAssetBlob(id: string): Promise<boolean> {
  return withStore('readwrite', (store) => {
    store.delete(id);
  });
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(ASSET_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ASSET_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result;
      resolve(record?.blob instanceof Blob ? record.blob : null);
    };
    request.onerror = () => {
      console.warn('Unable to read blob from IndexedDB.', request.error);
      resolve(null);
    };
  });
}
