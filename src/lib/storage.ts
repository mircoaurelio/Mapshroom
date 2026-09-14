import {
  ACTIVE_SESSION_KEY,
  APP_VERSION,
  ASSET_DB_NAME,
  ASSET_DB_VERSION,
  ASSET_STORE_NAME,
  DEFAULT_SHADERS,
  PROJECT_STORE_NAME,
  PROJECT_LIBRARY_STORAGE_KEY,
  PROJECT_STORAGE_PREFIX,
  UI_STORAGE_KEY,
} from '../config';
import {
  BUNDLED_PROJECT_LIBRARY_ENTRIES,
  createBundledProjectDocument,
  isBundledProjectSessionId,
} from './bundledProjects';
import { restoreTransport, snapshotTransport } from './clock';
import { normalizeProjectShaderSources } from './shaderProfile';
import { saveTextFile } from './desktop';
import { scrubApiKeysFromSettings } from './desktopSecrets';
import type {
  ProjectDocument,
  ProjectLibraryEntry,
  SavedShader,
  ShaderUniformValueMap,
  UiPreferences,
} from '../types';

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;
const SHADER_SLIDER_CACHE_PREFIX = 'mapshroom-v3:shader-sliders:';
const MIDI_OUTPUT_STORAGE_PREFIX = 'mapshroom-v3:midi-output:';
const OUTPUT_VIEWPORT_STORAGE_PREFIX = 'mapshroom-v3:output-viewport:';
const APP_STORAGE_PREFIX = 'mapshroom-v3:';
const LOCAL_PROJECT_FALLBACK_MAX_BYTES = 750_000;
const projectWrites = new Map<string, Promise<boolean>>();
let lastSaveStamp = 0;

function stampProject(project: ProjectDocument): ProjectDocument {
  lastSaveStamp = Math.max(Date.now(), lastSaveStamp + 1, (project.persistedAt ?? 0) + 1);
  return { ...createProjectSnapshot(project), persistedAt: lastSaveStamp };
}

/** Used on page hide only: async work alone cannot survive a closing tab. */
export function checkpointProjectDocument(project: ProjectDocument): boolean {
  if (isBundledProjectSessionId(project.sessionId)) return false;
  return writeLocalStorage(getProjectStorageKey(project.sessionId), JSON.stringify(stampProject(project)));
}

/** A template has one editable local project; subsequent opens resume that work. */
export async function openEditableProject(sessionId: string): Promise<ProjectDocument | null> {
  if (!isBundledProjectSessionId(sessionId)) return loadProjectDocument(sessionId);
  // A stable ID also prevents two tabs from creating independent copies at boot.
  const editableId = `editable:${sessionId}`;
  const saved = await loadProjectDocument(editableId);
  if (saved) return saved;
  if (await hasPersistedProject(editableId)) return null;
  const template = createBundledProjectDocument(sessionId);
  if (!template) return null;
  return { ...template, sessionId: editableId, sourceTemplateId: sessionId };
}

function getProjectStorageKey(sessionId: string): string {
  return `${PROJECT_STORAGE_PREFIX}${sessionId}`;
}

function getShaderSliderCacheKey(sessionId: string): string {
  return `${SHADER_SLIDER_CACHE_PREFIX}${sessionId}`;
}

function getRecoverableSessionStorageKeys(sessionId: string): string[] {
  return [
    getShaderSliderCacheKey(sessionId),
    `${MIDI_OUTPUT_STORAGE_PREFIX}${sessionId}`,
    `${OUTPUT_VIEWPORT_STORAGE_PREFIX}${sessionId}`,
  ];
}

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Unable to read localStorage.', error);
    return null;
  }
}

function writeLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('Unable to write localStorage.', error);
    return false;
  }
}

function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Unable to remove localStorage key.', error);
  }
}

function listLocalStorageKeys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(
      (key): key is string => Boolean(key),
    );
  } catch {
    return [];
  }
}

function reclaimRecoverableLocalStorage(keepSessionId?: string): void {
  for (const key of listLocalStorageKeys()) {
    const isRecoverable =
      key.startsWith(SHADER_SLIDER_CACHE_PREFIX) ||
      key.startsWith(MIDI_OUTPUT_STORAGE_PREFIX) ||
      key.startsWith(OUTPUT_VIEWPORT_STORAGE_PREFIX);
    if (!isRecoverable) {
      continue;
    }
    if (keepSessionId && key.endsWith(keepSessionId)) {
      continue;
    }
    removeLocalStorage(key);
  }
}

function downloadJsonFile(filename: string, contents: string): void {
  void saveTextFile({
    defaultFileName: filename,
    contents,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
}

function sanitizeBackupFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

export function getOrCreateSessionId(): string {
  const existing = readLocalStorage(ACTIVE_SESSION_KEY);
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  writeLocalStorage(ACTIVE_SESSION_KEY, next);
  return next;
}

export function persistActiveSessionId(sessionId: string): void {
  writeLocalStorage(ACTIVE_SESSION_KEY, sessionId);
}

function normalizePersistedProject(value: unknown): ProjectDocument | null {
  const parsed = value as ProjectDocument | null;
  if (!parsed || typeof parsed !== 'object' || !parsed.studio || !parsed.sessionId) {
    return null;
  }

  try {
    return normalizeProjectShaderSources({
      ...parsed,
      version: APP_VERSION,
      playback: {
        ...parsed.playback,
        transport: restoreTransport(parsed.playback.transport),
      },
    });
  } catch (error) {
    console.warn('Unable to normalize persisted project document.', error);
    return null;
  }
}

function readLocalStorageProject(sessionId: string): ProjectDocument | null {
  const raw = readLocalStorage(getProjectStorageKey(sessionId));
  if (!raw) {
    return null;
  }

  try {
    return normalizePersistedProject(JSON.parse(raw));
  } catch (error) {
    console.warn('Unable to parse persisted project document.', error);
    return null;
  }
}

export async function hasPersistedProject(sessionId: string): Promise<boolean> {
  if (isBundledProjectSessionId(sessionId) || createBundledProjectDocument(sessionId)) {
    return true;
  }
  if (await getIndexedProjectDocument(sessionId)) {
    return true;
  }
  return readLocalStorage(getProjectStorageKey(sessionId)) !== null;
}

export function parseProjectBackupContents(raw: string): ProjectDocument | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'project' in parsed) {
      return normalizePersistedProject((parsed as { project: unknown }).project);
    }
    return normalizePersistedProject(parsed);
  } catch (error) {
    console.warn('Unable to parse project file.', error);
    return null;
  }
}

export interface BrowserStorageUsage {
  usageBytes: number | null;
  quotaBytes: number | null;
  persisted: boolean | null;
}

export async function readBrowserStorageUsage(): Promise<BrowserStorageUsage> {
  try {
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    const persisted = (await globalThis.navigator?.storage?.persisted?.()) ?? null;
    return {
      usageBytes: typeof estimate?.usage === 'number' ? estimate.usage : null,
      quotaBytes: typeof estimate?.quota === 'number' ? estimate.quota : null,
      persisted,
    };
  } catch {
    return { usageBytes: null, quotaBytes: null, persisted: null };
  }
}

export function browserStorageHasRoom(
  usage: BrowserStorageUsage,
  extraBytes: number,
  reserveBytes = 8 * 1024 * 1024,
): boolean {
  if (usage.usageBytes == null || usage.quotaBytes == null || usage.quotaBytes <= 0) {
    return true;
  }
  return usage.quotaBytes - usage.usageBytes - extraBytes > reserveBytes;
}

export function downloadProjectBackup(project: ProjectDocument): void {
  const snapshot = createProjectSnapshot(project);
  downloadJsonFile(
    `mapshroom-project-${sanitizeBackupFilename(snapshot.name)}-${snapshot.sessionId}.json`,
    JSON.stringify(
      {
        savedShaderCount: snapshot.studio.savedShaders.length,
        project: snapshot,
      },
      null,
      2,
    ),
  );
}

export function downloadRawPersistedProject(sessionId: string): boolean {
  const raw = readLocalStorage(getProjectStorageKey(sessionId));
  if (!raw) {
    return false;
  }
  downloadJsonFile(`mapshroom-project-raw-${sessionId}.json`, raw);
  return true;
}

export async function loadProjectDocument(sessionId: string): Promise<ProjectDocument | null> {
  const bundledProject = createBundledProjectDocument(sessionId);
  if (bundledProject) {
    return bundledProject;
  }

  const indexedProject = normalizePersistedProject(await getIndexedProjectDocument(sessionId));
  const localProject = readLocalStorageProject(sessionId);
  const chosenProject = pickPreferredPersistedProject(indexedProject, localProject);
  if (!chosenProject) {
    return null;
  }
  lastSaveStamp = Math.max(lastSaveStamp, chosenProject.persistedAt ?? 0);
  // Do not write while loading: a migration racing an autosave can overwrite it.
  // The next save repairs both replicas using the same save stamp.

  return chosenProject;
}

function sortSerializableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortSerializableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortSerializableValue(nestedValue)]),
    );
  }

  return value;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortSerializableValue(value));
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUnmodifiedDefaultPreset(shader: SavedShader): boolean {
  const defaultPreset = DEFAULT_SHADERS[shader.id];
  if (!defaultPreset) {
    return false;
  }

  const defaultUniformValues = defaultPreset.uniformValues ?? {};
  const shaderUniformValues = shader.uniformValues ?? {};
  const shaderLastValidUniformValues = shader.lastValidUniformValues ?? shaderUniformValues;

  return (
    shader.name === defaultPreset.name &&
    shader.code === defaultPreset.code &&
    normalizeOptionalText(shader.description) === normalizeOptionalText(defaultPreset.description) &&
    (shader.template ?? defaultPreset.template) === defaultPreset.template &&
    (shader.group ?? defaultPreset.group) === defaultPreset.group &&
    (shader.inputAssetId ?? null) === null &&
    stableSerialize(shaderUniformValues) === stableSerialize(defaultUniformValues) &&
    (shader.lastValidCode ?? shader.code) === defaultPreset.code &&
    stableSerialize(shaderLastValidUniformValues) === stableSerialize(defaultUniformValues) &&
    !shader.isTemporary &&
    !shader.isDirty &&
    !shader.sourceShaderId &&
    !shader.ownerTimelineStepId &&
    !shader.pendingAiJobCount &&
    !shader.hasUnreadAiResult &&
    !shader.compileError
  );
}

export function createProjectSnapshot(
  project: ProjectDocument,
  retainShaderIds: Iterable<string> = [],
): ProjectDocument {
  // The workspace keeps the complete built-in catalog in memory so presets can
  // be selected without another lookup. Canonicalizing that whole catalog on
  // every autosave is expensive (and blocks pointer input on the main thread),
  // even though unchanged built-ins are removed from the persisted snapshot.
  // Compact first, then normalize only the shaders that are actually written.
  const retainedShaderIds = new Set([
    project.studio.activeShaderId,
    ...project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
    ...retainShaderIds,
  ]);
  const compactProject = {
    ...project,
    studio: {
      ...project.studio,
      savedShaders: project.studio.savedShaders.filter(
        (shader) =>
          retainedShaderIds.has(shader.id) || !isUnmodifiedDefaultPreset(shader),
      ),
    },
  };
  const normalizedProject = normalizeProjectShaderSources(compactProject);
  return {
    ...normalizedProject,
    playback: {
      ...normalizedProject.playback,
      transport: snapshotTransport(normalizedProject.playback.transport),
    },
    studio: {
      ...normalizedProject.studio,
      savedShaders: normalizedProject.studio.savedShaders,
    },
    ai: {
      ...normalizedProject.ai,
      settings: scrubApiKeysFromSettings(normalizedProject.ai.settings),
    },
  };
}

export function isDestructiveProjectOverwrite(
  existing: ProjectDocument,
  next: ProjectDocument,
): boolean {
  const existingShaders = existing.studio.savedShaders.length;
  const nextShaders = next.studio.savedShaders.length;
  const existingSteps = existing.timeline.stub.shaderSequence.steps.length;
  const nextSteps = next.timeline.stub.shaderSequence.steps.length;
  return (
    (existingShaders >= 10 && nextShaders <= 2 && nextShaders < existingShaders / 2) ||
    (existingSteps >= 10 && nextSteps <= 2 && nextSteps < existingSteps / 2)
  );
}

export function pickPreferredPersistedProject(
  indexedProject: ProjectDocument | null,
  localProject: ProjectDocument | null,
): ProjectDocument | null {
  if (indexedProject && localProject) {
    if (indexedProject.persistedAt || localProject.persistedAt) {
      return (localProject.persistedAt ?? 0) > (indexedProject.persistedAt ?? 0)
        ? localProject : indexedProject;
    }
    // Preserve the recovery heuristic only for old, unstamped documents.
    if (isDestructiveProjectOverwrite(localProject, indexedProject)) {
      return localProject;
    }
    if (isDestructiveProjectOverwrite(indexedProject, localProject)) {
      return indexedProject;
    }
    return indexedProject;
  }

  return indexedProject ?? localProject;
}

async function requestPersistentStorage(): Promise<void> {
  try {
    await globalThis.navigator?.storage?.persist?.();
  } catch {
    // Persistence is best-effort. A denied prompt must not block autosave.
  }
}

export async function saveProjectDocument(project: ProjectDocument): Promise<boolean> {
  if (isBundledProjectSessionId(project.sessionId)) {
    return false;
  }
  const snapshot = stampProject(project);
  const previous = projectWrites.get(project.sessionId) ?? Promise.resolve(true);
  const write = previous.catch(() => false).then(async () => {
    const locks = globalThis.navigator?.locks;
    return locks
      ? locks.request(`mapshroom-project:${project.sessionId}`, () => persistProjectSnapshot(snapshot))
      : persistProjectSnapshot(snapshot);
  }).catch((error) => {
    console.warn('Unable to persist project document.', error);
    return false;
  });
  projectWrites.set(project.sessionId, write);
  try {
    return await write;
  } finally {
    if (projectWrites.get(project.sessionId) === write) projectWrites.delete(project.sessionId);
  }
}

async function persistProjectSnapshot(snapshot: ProjectDocument): Promise<boolean> {
  const storageKey = getProjectStorageKey(snapshot.sessionId);
  const existing = pickPreferredPersistedProject(
    normalizePersistedProject(await getIndexedProjectDocument(snapshot.sessionId)),
    readLocalStorageProject(snapshot.sessionId),
  );
  // A page-hide checkpoint or another tab may already contain a newer revision.
  if ((existing?.persistedAt ?? 0) > snapshot.persistedAt!) return true;

  reclaimRecoverableLocalStorage(snapshot.sessionId);
  if (await putIndexedProjectDocument(snapshot)) {
    if ((readLocalStorageProject(snapshot.sessionId)?.persistedAt ?? 0) <= snapshot.persistedAt!) {
      const raw = JSON.stringify(snapshot);
      if (raw.length <= LOCAL_PROJECT_FALLBACK_MAX_BYTES) {
        writeLocalStorage(storageKey, raw);
      } else {
        removeLocalStorage(storageKey);
      }
      for (const key of getRecoverableSessionStorageKeys(snapshot.sessionId)) {
        removeLocalStorage(key);
      }
    }
    void requestPersistentStorage();
    return true;
  }

  if ((readLocalStorageProject(snapshot.sessionId)?.persistedAt ?? 0) > snapshot.persistedAt!) return true;
  if (writeLocalStorage(storageKey, JSON.stringify(snapshot))) {
    removeLocalStorage(getShaderSliderCacheKey(snapshot.sessionId));
    return true;
  }

  reclaimRecoverableLocalStorage();
  console.warn('Unable to persist project document.');
  return false;
}

export function loadProjectLibrary(): ProjectLibraryEntry[] {
  const raw = readLocalStorage(PROJECT_LIBRARY_STORAGE_KEY);
  if (!raw) {
    return BUNDLED_PROJECT_LIBRARY_ENTRIES;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectLibraryEntry[];
    if (!Array.isArray(parsed)) {
      return BUNDLED_PROJECT_LIBRARY_ENTRIES;
    }

    const persistedEntries = parsed
      .filter(
        (entry): entry is ProjectLibraryEntry =>
          Boolean(
            entry &&
              typeof entry.sessionId === 'string' &&
              typeof entry.name === 'string' &&
              typeof entry.createdAt === 'string' &&
              typeof entry.updatedAt === 'string',
          ),
      )
      .filter((entry) => !isBundledProjectSessionId(entry.sessionId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return [
      ...persistedEntries,
      ...BUNDLED_PROJECT_LIBRARY_ENTRIES.filter((template) =>
        !persistedEntries.some((entry) => entry.sourceTemplateId === template.sessionId)),
    ];
  } catch (error) {
    console.warn('Unable to parse project library.', error);
    return BUNDLED_PROJECT_LIBRARY_ENTRIES;
  }
}

function saveProjectLibrary(entries: ProjectLibraryEntry[]): void {
  writeLocalStorage(
    PROJECT_LIBRARY_STORAGE_KEY,
    JSON.stringify(
      entries.filter(
        (entry) => !entry.bundled && !isBundledProjectSessionId(entry.sessionId),
      ),
    ),
  );
}

export function saveProjectToLibrary(
  project: ProjectDocument,
  name: string,
): ProjectLibraryEntry[] {
  const trimmedName = name.trim() || 'Untitled Project';
  const now = new Date().toISOString();
  const currentEntries = loadProjectLibrary();
  const existingEntry = currentEntries.find((entry) => entry.sessionId === project.sessionId);
  const nextEntry: ProjectLibraryEntry = {
    sessionId: project.sessionId,
    name: trimmedName,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
    sourceTemplateId: project.sourceTemplateId,
  };
  const nextEntries = [
    nextEntry,
    ...currentEntries.filter((entry) => entry.sessionId !== project.sessionId),
  ];
  saveProjectLibrary(nextEntries);
  return loadProjectLibrary();
}

export function removeProjectFromLibrary(sessionId: string): ProjectLibraryEntry[] {
  const nextEntries = loadProjectLibrary().filter((entry) => entry.sessionId !== sessionId);
  saveProjectLibrary(nextEntries);
  return nextEntries;
}

export async function deletePersistedProject(
  sessionId: string,
): Promise<ProjectLibraryEntry[]> {
  await deleteIndexedProjectDocument(sessionId);
  localStorage.removeItem(getProjectStorageKey(sessionId));
  for (const key of getRecoverableSessionStorageKeys(sessionId)) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(`mapshroom-v3:audio-reactive:${sessionId}`);
  return removeProjectFromLibrary(sessionId);
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
  writeLocalStorage(UI_STORAGE_KEY, JSON.stringify(preferences));
}

export function loadShaderSliderCache(
  sessionId: string,
): Record<string, ShaderUniformValueMap> {
  const raw = localStorage.getItem(getShaderSliderCacheKey(sessionId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, ShaderUniformValueMap>;
  } catch (error) {
    console.warn('Unable to parse shader slider cache.', error);
    return {};
  }
}

export function saveShaderSliderCache(
  sessionId: string,
  cache: Record<string, ShaderUniformValueMap>,
): void {
  try {
    localStorage.setItem(getShaderSliderCacheKey(sessionId), JSON.stringify(cache));
  } catch (error) {
    // Slider values are also part of the project snapshot. A full localStorage
    // cache must never prevent live output/session synchronization.
    console.warn('Unable to persist shader slider cache.', error);
  }
}

export async function clearPersistedSiteData(): Promise<void> {
  const localStorageKeys = Array.from({ length: localStorage.length }, (_, index) =>
    localStorage.key(index),
  ).filter((key): key is string => Boolean(key));

  for (const key of localStorageKeys) {
    if (key.startsWith(APP_STORAGE_PREFIX)) {
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
    let abandoned = false;

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
        database.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME, { keyPath: 'sessionId' });
      }
    };

    request.onsuccess = () => {
      if (abandoned) { request.result.close(); return; }
      request.result.onversionchange = () => {
        request.result.close();
        cachedDbPromise = null;
      };
      resolve(request.result);
    };
    request.onblocked = () => {
      abandoned = true;
      cachedDbPromise = null;
      resolve(null);
    };
    request.onerror = () => {
      console.warn('Unable to open IndexedDB, blob persistence is disabled.', request.error);
      resolve(null);
      cachedDbPromise = null;
    };
  });

  return cachedDbPromise;
}

async function withStore(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => void,
): Promise<boolean> {
  const database = await openDatabase();
  if (!database) {
    return false;
  }

  return new Promise((resolve) => {
    try {
      if (!database.objectStoreNames.contains(storeName)) {
        resolve(false);
        return;
      }
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      callback(store);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => {
        console.warn('IndexedDB transaction failed.', transaction.error);
        resolve(false);
      };
      transaction.onabort = () => resolve(false);
    } catch (error) {
      console.warn('IndexedDB transaction failed.', error);
      resolve(false);
    }
  });
}

export async function putAssetBlob(id: string, blob: Blob): Promise<boolean> {
  return withStore(ASSET_STORE_NAME, 'readwrite', (store) => {
    store.put({ id, blob });
  });
}

export async function deleteAssetBlob(id: string): Promise<boolean> {
  return withStore(ASSET_STORE_NAME, 'readwrite', (store) => {
    store.delete(id);
  });
}

async function putIndexedProjectDocument(project: ProjectDocument): Promise<boolean> {
  return withStore(PROJECT_STORE_NAME, 'readwrite', (store) => {
    store.put(project);
  });
}

async function deleteIndexedProjectDocument(sessionId: string): Promise<boolean> {
  return withStore(PROJECT_STORE_NAME, 'readwrite', (store) => {
    store.delete(sessionId);
  });
}

async function getIndexedProjectDocument(sessionId: string): Promise<ProjectDocument | null> {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(PROJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        resolve((request.result as ProjectDocument | undefined) ?? null);
      };
      request.onerror = () => {
        console.warn('Unable to read project from IndexedDB.', request.error);
        resolve(null);
      };
    } catch (error) {
      console.warn('Unable to read project from IndexedDB.', error);
      resolve(null);
    }
  });
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
    return null;
  }

  return new Promise((resolve) => {
    try {
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
    } catch (error) {
      console.warn('Unable to read blob from IndexedDB.', error);
      resolve(null);
    }
  });
}
