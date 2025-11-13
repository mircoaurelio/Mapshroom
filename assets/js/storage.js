const STORAGE_KEY = 'mapshroom-pocket:v1';
const DB_NAME = 'mapshroom-pocket';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

const defaultSettings = () => ({
  version: 1,
  transform: {
    offsetX: 0,
    offsetY: 0,
    widthAdjust: 0,
    heightAdjust: 0,
  },
  options: {
    precision: 10,
    randomPlay: false,
    fadeEnabled: false,
    fadeDuration: 1.5,
    currentIndex: -1,
    moveMode: false,
  },
  ai: {
    runwayApiKey: '',
    preferredModel: 'gen4_aleph',
    preferredRatio: '1280:720',
    useEphemeralUploads: true,
    primaryVideoId: '',
    seed: null,
  },
  playlist: [],
});

let cachedSettings = null;
let dbPromise = null;

const normalizeNumber = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

const normalizeString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const normalizeSettings = (rawSettings) => {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return defaultSettings();
  }

  const defaults = defaultSettings();
  const normalized = { ...defaults, ...rawSettings };

  const transform = {
    offsetX: normalizeNumber(normalized.transform?.offsetX, defaults.transform.offsetX),
    offsetY: normalizeNumber(normalized.transform?.offsetY, defaults.transform.offsetY),
    widthAdjust: normalizeNumber(normalized.transform?.widthAdjust, defaults.transform.widthAdjust),
    heightAdjust: normalizeNumber(normalized.transform?.heightAdjust, defaults.transform.heightAdjust),
  };

  const options = {
    precision: normalizeNumber(normalized.options?.precision, defaults.options.precision),
    randomPlay: Boolean(normalized.options?.randomPlay),
    fadeEnabled: Boolean(normalized.options?.fadeEnabled),
    fadeDuration: normalizeNumber(normalized.options?.fadeDuration, defaults.options.fadeDuration),
    currentIndex: normalizeNumber(normalized.options?.currentIndex, defaults.options.currentIndex),
    moveMode: Boolean(normalized.options?.moveMode),
  };

  const ai = {
    runwayApiKey: normalizeString(normalized.ai?.runwayApiKey, defaults.ai.runwayApiKey),
    preferredModel: normalizeString(normalized.ai?.preferredModel, defaults.ai.preferredModel) || defaults.ai.preferredModel,
    preferredRatio: normalizeString(normalized.ai?.preferredRatio, defaults.ai.preferredRatio) || defaults.ai.preferredRatio,
    useEphemeralUploads: Boolean(
      typeof normalized.ai?.useEphemeralUploads === 'boolean'
        ? normalized.ai.useEphemeralUploads
        : defaults.ai.useEphemeralUploads,
    ),
    primaryVideoId: normalizeString(normalized.ai?.primaryVideoId, defaults.ai.primaryVideoId),
    seed:
      typeof normalized.ai?.seed === 'number' && Number.isFinite(normalized.ai.seed) ? normalized.ai.seed : defaults.ai.seed,
  };

  const playlist = Array.isArray(normalized.playlist)
    ? normalized.playlist
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          if (!item.id || typeof item.id !== 'string') {
            return null;
          }
          return {
            id: item.id,
            name: typeof item.name === 'string' ? item.name : 'Video',
            type: typeof item.type === 'string' ? item.type : '',
            size: normalizeNumber(item.size, 0),
            lastModified: normalizeNumber(item.lastModified, Date.now()),
          };
        })
        .filter(Boolean)
    : [];

  return {
    version: 1,
    transform,
    options,
    ai,
    playlist,
  };
};

const readSettings = () => {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedSettings = defaultSettings();
      return cachedSettings;
    }

    const parsed = JSON.parse(raw);
    cachedSettings = normalizeSettings(parsed);
    return cachedSettings;
  } catch (error) {
    console.warn('Unable to read persisted settings, using defaults.', error);
    cachedSettings = defaultSettings();
    return cachedSettings;
  }
};

const writeSettings = (settings) => {
  cachedSettings = settings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Unable to persist settings.', error);
  }
};

const updateSettings = (updater) => {
  const current = readSettings();
  const next = updater({ ...current });
  writeSettings(next);
  return next;
};

const openDatabase = () => {
  if (dbPromise) {
    return dbPromise;
  }

  if (!('indexedDB' in window)) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(VIDEO_STORE)) {
        database.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.warn('IndexedDB error, video persistence disabled.', request.error);
      resolve(null);
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked.');
    };
  });

  return dbPromise;
};

const withStore = async (mode, callback) => {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE, mode);
    const store = transaction.objectStore(VIDEO_STORE);

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => {
      console.warn('IndexedDB transaction failed.', transaction.error);
      reject(transaction.error);
    };

    callback(store);
  }).catch((error) => {
    console.warn('IndexedDB operation failed.', error);
    return null;
  });
};

const storeVideo = async (id, file) => {
  if (!(file instanceof File) || !id) {
    return false;
  }

  try {
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });

    const success = await withStore('readwrite', (store) => {
      store.put({ id, blob });
    });
    return Boolean(success);
  } catch (error) {
    console.warn('Unable to store video in IndexedDB.', error);
    return false;
  }
};

const deleteVideo = async (id) => {
  if (!id) {
    return false;
  }

  try {
    const success = await withStore('readwrite', (store) => {
      store.delete(id);
    });
    return Boolean(success);
  } catch (error) {
    console.warn('Unable to delete video from IndexedDB.', error);
    return false;
  }
};

const readVideoBlob = async (id) => {
  if (!id) {
    return null;
  }

  const database = await openDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(VIDEO_STORE, 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result;
      if (record && record.blob instanceof Blob) {
        resolve(record.blob);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      console.warn('Unable to read video from IndexedDB.', request.error);
      resolve(null);
    };
  });
};

export const loadPersistedData = async () => {
  const settings = readSettings();
  const playlist = [];

  for (const item of settings.playlist) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await readVideoBlob(item.id);
    if (!blob) {
      continue;
    }

    const url = URL.createObjectURL(blob);
    playlist.push({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size,
      lastModified: item.lastModified,
      url,
      blob,
    });
  }

  return {
    state: {
      offsetX: settings.transform.offsetX,
      offsetY: settings.transform.offsetY,
      widthAdjust: settings.transform.widthAdjust,
      heightAdjust: settings.transform.heightAdjust,
      precision: settings.options.precision,
      randomPlay: settings.options.randomPlay,
      fadeEnabled: settings.options.fadeEnabled,
      fadeDuration: settings.options.fadeDuration,
      currentIndex: settings.options.currentIndex,
      moveMode: settings.options.moveMode,
    },
    playlist,
    ai: {
      ...settings.ai,
    },
  };
};

export const saveTransformState = (state) => {
  if (!state) {
    return;
  }

  updateSettings((current) => ({
    ...current,
    transform: {
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      widthAdjust: state.widthAdjust,
      heightAdjust: state.heightAdjust,
    },
  }));
};

export const saveOptionsState = (partialOptions) => {
  if (!partialOptions || typeof partialOptions !== 'object') {
    return;
  }

  updateSettings((current) => ({
    ...current,
    options: {
      ...current.options,
      ...partialOptions,
    },
  }));
};

export const savePlaylistMetadata = (playlist) => {
  if (!Array.isArray(playlist)) {
    return;
  }

  const metadata = playlist.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type || '',
    size: item.size || 0,
    lastModified: item.lastModified || Date.now(),
  }));

  updateSettings((current) => ({
    ...current,
    playlist: metadata,
  }));
};

export const persistVideoFile = storeVideo;
export const deleteVideoFile = deleteVideo;

export const readAiSettings = () => {
  const settings = readSettings();
  return { ...settings.ai };
};

export const saveAiSettings = (partialAi) => {
  if (!partialAi || typeof partialAi !== 'object') {
    return;
  }

  updateSettings((current) => ({
    ...current,
    ai: {
      ...current.ai,
      ...partialAi,
    },
  }));
};

