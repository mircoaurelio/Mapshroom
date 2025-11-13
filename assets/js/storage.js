const SETTINGS_STORAGE_KEY = 'mapshroom-pocket-settings-v1';
const SETTINGS_VERSION = 1;
const DB_NAME = 'mapshroom-pocket';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

const createDefaultSettings = () => ({
  version: SETTINGS_VERSION,
  offsetX: 0,
  offsetY: 0,
  widthAdjust: 0,
  heightAdjust: 0,
  precision: 10,
  overlayActive: false,
  randomPlay: false,
  fadeEnabled: false,
  fadeDuration: 1.5,
  currentIndex: -1,
  playlist: [],
});

const clonePlaylist = (playlist) => playlist.map((item) => ({ ...item }));

const cloneSettings = (settings) => ({
  ...settings,
  playlist: clonePlaylist(settings.playlist || []),
});

const toNumber = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const toBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const toInteger = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  return fallback;
};

const normalizePlaylist = (rawPlaylist) => {
  if (!Array.isArray(rawPlaylist)) {
    return [];
  }

  return rawPlaylist
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const id = typeof item.id === 'string' ? item.id : null;
      if (!id) {
        return null;
      }

      const name = typeof item.name === 'string' ? item.name : '';
      const type = typeof item.type === 'string' ? item.type : undefined;

      return { id, name, ...(type ? { type } : {}) };
    })
    .filter(Boolean);
};

const normalizeSettings = (raw) => {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const normalized = {
    version: SETTINGS_VERSION,
    offsetX: toNumber(raw.offsetX, defaults.offsetX),
    offsetY: toNumber(raw.offsetY, defaults.offsetY),
    widthAdjust: toNumber(raw.widthAdjust, defaults.widthAdjust),
    heightAdjust: toNumber(raw.heightAdjust, defaults.heightAdjust),
    precision: toNumber(raw.precision, defaults.precision),
    overlayActive: toBoolean(raw.overlayActive, defaults.overlayActive),
    randomPlay: toBoolean(raw.randomPlay, defaults.randomPlay),
    fadeEnabled: toBoolean(raw.fadeEnabled, defaults.fadeEnabled),
    fadeDuration: toNumber(raw.fadeDuration, defaults.fadeDuration),
    currentIndex: toInteger(raw.currentIndex, defaults.currentIndex),
    playlist: normalizePlaylist(raw.playlist),
  };

  if (normalized.precision <= 0) {
    normalized.precision = defaults.precision;
  }

  if (normalized.fadeDuration < 0) {
    normalized.fadeDuration = defaults.fadeDuration;
  }

  return normalized;
};

let settingsCache = null;

const readSettingsFromStorage = () => {
  if (settingsCache) {
    return settingsCache;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    settingsCache = raw ? normalizeSettings(JSON.parse(raw)) : createDefaultSettings();
  } catch (error) {
    console.warn('Unable to read persisted settings, using defaults instead.', error);
    settingsCache = createDefaultSettings();
  }

  return settingsCache;
};

const writeSettingsToStorage = (settings) => {
  settingsCache = normalizeSettings(settings);

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsCache));
  } catch (error) {
    console.warn('Unable to persist settings to localStorage.', error);
  }

  return settingsCache;
};

export const loadSettings = () => cloneSettings(readSettingsFromStorage());

export const saveSettings = (partial = {}) => {
  const current = readSettingsFromStorage();
  const merged = {
    ...current,
    ...partial,
    playlist: partial.playlist !== undefined ? partial.playlist : current.playlist,
  };

  const normalized = writeSettingsToStorage(merged);
  return cloneSettings(normalized);
};

export const loadPlaylistMetadata = () => loadSettings().playlist;

export const savePlaylistMetadata = (playlist) => {
  const sanitized = normalizePlaylist(playlist);
  saveSettings({ playlist: sanitized });
  return sanitized;
};

const isIndexedDBAvailable = () => typeof window !== 'undefined' && 'indexedDB' in window;

let dbPromise = null;

const openDatabase = () => {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB not supported in this environment.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
          db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
};

const runVideoStoreTx = async (mode, executor) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, mode);
    const store = tx.objectStore(VIDEO_STORE);

    let request;
    try {
      request = executor(store);
    } catch (error) {
      reject(error);
      return;
    }

    if (request && typeof request.addEventListener === 'function') {
      request.addEventListener('error', () => {
        reject(request.error);
      });
    }

    tx.oncomplete = () => {
      if (request) {
        resolve(request.result);
      } else {
        resolve(undefined);
      }
    };

    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
  });
};

export const saveVideoBlob = async (id, file) => {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available; unable to persist video.');
  }

  const entry = {
    id,
    blob: file,
    name: file.name,
    type: file.type,
    lastModified: typeof file.lastModified === 'number' ? file.lastModified : Date.now(),
  };

  await runVideoStoreTx('readwrite', (store) => store.put(entry));
};

export const readVideoBlob = async (id) => {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available; unable to restore video.');
  }

  const result = await runVideoStoreTx('readonly', (store) => store.get(id));
  return result || null;
};

export const pruneVideoStore = async (idsToKeep) => {
  if (!isIndexedDBAvailable()) {
    return;
  }

  const keepSet = new Set(idsToKeep);

  await runVideoStoreTx('readwrite', (store) => {
    const cursorRequest = store.openKeyCursor();

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        return;
      }

      if (!keepSet.has(cursor.primaryKey)) {
        store.delete(cursor.primaryKey);
      }

      cursor.continue();
    };

    return cursorRequest;
  });
};

export const canPersistVideos = () => isIndexedDBAvailable();


