import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createServer } from 'vite';

import type { ProjectDocument, SavedShader } from '../src/types.ts';

const LOCAL_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

function createMemoryLocalStorage() {
  const data = new Map<string, string>();
  const storage = {
    get length() {
      return data.size;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(String(key), String(value));
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
  return { storage, data };
}

function createMemoryIndexedDB() {
  const stores = new Map<string, Map<string, unknown>>([
    ['asset-blobs', new Map()],
    ['project-documents', new Map()],
  ]);
  let putShouldFail = false;
  let quotaError: Error | null = null;

  const fire = (callback: (() => void) | null | undefined) => {
    queueMicrotask(() => callback?.());
  };

  const db = {
    objectStoreNames: {
      contains(name: string) {
        return stores.has(name);
      },
    },
    transaction(storeName: string) {
      const storeMap = stores.get(storeName) ?? new Map();
      let aborted = false;
      const transaction: {
        error: Error | null;
        oncomplete: (() => void) | null;
        onerror: (() => void) | null;
        objectStore: () => {
          put: (value: { id?: string; sessionId?: string }) => void;
          delete: (key: string) => void;
          get: (key: string) => {
            result: unknown;
            error: Error | null;
            onsuccess: (() => void) | null;
            onerror: (() => void) | null;
          };
        };
      } = {
        error: null,
        oncomplete: null,
        onerror: null,
        objectStore() {
          return {
            put(value) {
              if (putShouldFail) {
                aborted = true;
                transaction.error = quotaError ?? new Error('IndexedDB quota exceeded');
                fire(() => transaction.onerror?.());
                return;
              }
              const key = value.sessionId ?? value.id;
              if (!key) {
                throw new Error('IndexedDB record is missing a key.');
              }
              storeMap.set(key, value);
            },
            delete(key: string) {
              storeMap.delete(key);
            },
            get(key: string) {
              const request: {
                result: unknown;
                error: Error | null;
                onsuccess: (() => void) | null;
                onerror: (() => void) | null;
              } = {
                result: undefined,
                error: null,
                onsuccess: null,
                onerror: null,
              };
              fire(() => {
                request.result = storeMap.get(key);
                request.onsuccess?.();
              });
              return request;
            },
          };
        },
      };
      fire(() => {
        if (!aborted && !transaction.error) {
          transaction.oncomplete?.();
        }
      });
      return transaction;
    },
    close() {},
  };

  const indexedDB = {
    open() {
      const request: {
        result: typeof db;
        error: Error | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        onupgradeneeded: (() => void) | null;
      } = {
        result: db,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      fire(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    deleteDatabase() {
      for (const store of stores.values()) {
        store.clear();
      }
      const request: {
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        onblocked: (() => void) | null;
      } = {
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      fire(() => request.onsuccess?.());
      return request;
    },
  };

  return {
    indexedDB,
    stores,
    failPuts(error?: Error) {
      putShouldFail = true;
      quotaError = error ?? null;
    },
    allowPuts() {
      putShouldFail = false;
      quotaError = null;
    },
  };
}

function installBrowserPersistenceMocks() {
  const { storage } = createMemoryLocalStorage();
  const memoryDb = createMemoryIndexedDB();
  const windowLike = {
    localStorage: storage,
    indexedDB: memoryDb.indexedDB,
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: windowLike,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: memoryDb.indexedDB,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: createMemoryLocalStorage().storage,
  });

  return memoryDb;
}

function withCustomShaders(project: ProjectDocument, count: number): ProjectDocument {
  const shaders: SavedShader[] = Array.from({ length: count }, (_, index) => ({
    id: `custom-shader-${index}`,
    name: `Custom Shader ${index}`,
    code: `void main() { gl_FragColor = vec4(${index}.0 / 255.0, 0.0, 0.0, 1.0); }`,
    description: 'custom persistence fixture',
    group: 'Saved',
    uniformValues: {},
    lastValidUniformValues: {},
  }));

  return {
    ...project,
    name: `Fixture ${count} shaders`,
    studio: {
      ...project.studio,
      activeShaderId: shaders[0]!.id,
      activeShaderName: shaders[0]!.name,
      activeShaderCode: shaders[0]!.code,
      savedShaders: shaders,
    },
    timeline: {
      ...project.timeline,
      stub: {
        ...project.timeline.stub,
        shaderSequence: {
          ...project.timeline.stub.shaderSequence,
          steps: shaders.slice(0, Math.min(count, 12)).map((shader, index) => ({
            ...project.timeline.stub.shaderSequence.steps[0]!,
            id: `step-${index}`,
            shaderId: shader.id,
          })),
        },
      },
    },
  };
}

test('project persistence round-trips, refuses stub overwrites, and keeps bundled templates read-only', async () => {
  const memoryDb = installBrowserPersistenceMocks();
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    root: process.cwd(),
    server: { middlewareMode: true, watch: null },
  });

  try {
    const [{ createDefaultProject }, bundledProjects, storage, config] = await Promise.all([
      server.ssrLoadModule('/src/config.ts'),
      server.ssrLoadModule('/src/lib/bundledProjects.ts'),
      server.ssrLoadModule('/src/lib/storage.ts'),
      server.ssrLoadModule('/src/config.ts'),
    ]);

    const firstStarter = createDefaultProject('starter-a') as ProjectDocument;
    const secondStarter = createDefaultProject('starter-b') as ProjectDocument;
    const firstSnapshot = storage.createProjectSnapshot(firstStarter) as ProjectDocument;
    const firstSnapshotBytes = Buffer.byteLength(JSON.stringify(firstSnapshot), 'utf8');

    assert.equal(firstStarter.timeline.stub.shaderSequence.steps.length, 8);
    assert.notDeepEqual(
      firstStarter.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
      secondStarter.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
    );
    assert.ok(
      firstSnapshotBytes < LOCAL_STORAGE_QUOTA_BYTES,
      `starter snapshot should fit in localStorage, got ${firstSnapshotBytes} bytes`,
    );
    assert.ok(
      firstSnapshot.studio.savedShaders.length <= firstStarter.studio.savedShaders.length,
      'unchanged built-in presets must be stripped from the persisted snapshot',
    );

    const sessionId = 'user-project-session';
    const namedProject = {
      ...withCustomShaders(firstStarter, 12),
      sessionId,
      name: 'User Show',
    };
    assert.equal(await storage.saveProjectDocument(namedProject), true);
    const loaded = (await storage.loadProjectDocument(sessionId)) as ProjectDocument;
    assert.equal(loaded.name, 'User Show');
    assert.equal(loaded.studio.savedShaders.length, 12);

    const stubReplacement = withCustomShaders(namedProject, 2);
    assert.equal(await storage.saveProjectDocument(stubReplacement), false);
    const stillLoaded = (await storage.loadProjectDocument(sessionId)) as ProjectDocument;
    assert.equal(stillLoaded.studio.savedShaders.length, 12);
    assert.equal(stillLoaded.name, 'User Show');

    const libraryAfterDocumentSave = storage.loadProjectLibrary() as Array<{
      sessionId: string;
      name: string;
    }>;
    assert.equal(
      libraryAfterDocumentSave.some((entry) => entry.sessionId === sessionId),
      false,
      'saveProjectDocument must not add a library card by itself',
    );

    storage.saveProjectToLibrary(namedProject, namedProject.name);
    const libraryAfterExplicitSave = storage.loadProjectLibrary() as Array<{
      sessionId: string;
      name: string;
      bundled?: boolean;
    }>;
    assert.equal(
      libraryAfterExplicitSave.some((entry) => entry.sessionId === sessionId && entry.name === 'User Show'),
      true,
    );
    assert.ok(libraryAfterExplicitSave.some((entry) => entry.bundled));

    const bundledSessionId = bundledProjects.BUNDLED_STATUE_PROJECT_SESSION_ID as string;
    const bundledTemplate = bundledProjects.createBundledProjectDocument(bundledSessionId) as ProjectDocument;
    const bundledAgain = bundledProjects.createBundledProjectDocument(bundledSessionId) as ProjectDocument;
    assert.deepEqual(
      bundledTemplate.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
      bundledAgain.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
    );
    const mutatedBundled = {
      ...bundledTemplate,
      name: 'Mutated statue that must not persist',
      studio: {
        ...bundledTemplate.studio,
        savedShaders: bundledTemplate.studio.savedShaders.slice(0, 1),
      },
    };
    await storage.saveProjectDocument(mutatedBundled);
    const reloadedBundled = (await storage.loadProjectDocument(bundledSessionId)) as ProjectDocument;
    assert.equal(reloadedBundled.name, bundledTemplate.name);
    assert.notEqual(reloadedBundled.name, 'Mutated statue that must not persist');
    assert.equal(
      reloadedBundled.timeline.stub.shaderSequence.steps.length,
      bundledTemplate.timeline.stub.shaderSequence.steps.length,
    );

    const stubIndexed = withCustomShaders(namedProject, 1);
    memoryDb.stores.get('project-documents')?.set(sessionId, stubIndexed);
    const recoveredFromFallback = (await storage.loadProjectDocument(sessionId)) as ProjectDocument;
    assert.equal(recoveredFromFallback.studio.savedShaders.length, 12);
    assert.equal(recoveredFromFallback.name, 'User Show');

    memoryDb.failPuts(new Error('IndexedDB quota exceeded'));
    const quotaProject = {
      ...withCustomShaders(secondStarter, 4),
      sessionId: 'quota-fallback-session',
      name: 'Quota Fallback',
    };
    assert.equal(await storage.saveProjectDocument(quotaProject), true);
    const localRaw = localStorage.getItem(`${config.PROJECT_STORAGE_PREFIX}quota-fallback-session`);
    assert.ok(localRaw, 'when IndexedDB is full, the project must still land in localStorage');
    memoryDb.allowPuts();
    const loadedQuotaProject = (await storage.loadProjectDocument('quota-fallback-session')) as ProjectDocument;
    assert.equal(loadedQuotaProject.name, 'Quota Fallback');

    const historical = JSON.parse(
      readFileSync(
        new URL(
          '../docs/backups/mapshroom-v3-backup-902e74dc-028b-4136-8b55-d7c7d121b01f.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as { project: ProjectDocument };
    const historicalSnapshot = storage.createProjectSnapshot(historical.project) as ProjectDocument;
    const historicalBytes = Buffer.byteLength(JSON.stringify(historicalSnapshot), 'utf8');
    assert.ok(
      historicalBytes > 1_000_000,
      `real user projects can exceed 1MB even after compaction, got ${historicalBytes}`,
    );
    const parsedBackup = storage.parseProjectBackupContents(
      JSON.stringify({ savedShaderCount: historical.project.studio.savedShaders.length, project: historical.project }),
    ) as ProjectDocument;
    assert.equal(parsedBackup.sessionId, historical.project.sessionId);
    assert.equal(
      storage.browserStorageHasRoom(
        { usageBytes: 90 * 1024 * 1024, quotaBytes: 100 * 1024 * 1024, persisted: false },
        20 * 1024 * 1024,
      ),
      false,
    );
    assert.equal(
      storage.browserStorageHasRoom(
        { usageBytes: 10 * 1024 * 1024, quotaBytes: 400 * 1024 * 1024, persisted: true },
        1024 * 1024,
      ),
      true,
    );
  } finally {
    await server.close();
  }
});

test('boot keeps bundled sessions and lists autosaved work in the project library', () => {
  const workspace = readFileSync(new URL('../src/routes/WorkspaceRoute.tsx', import.meta.url), 'utf8');
  const bundled = readFileSync(new URL('../src/lib/bundledProjects.ts', import.meta.url), 'utf8');
  const storage = readFileSync(new URL('../src/lib/storage.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(
    workspace,
    /Existing installs that still point at the huge bundled Statue timeline/,
  );
  assert.match(workspace, /saveProjectToLibrary\(project, project\.name\)/);
  assert.match(workspace, /saveProjectToLibrary\(nextProject, nextProject\.name\)/);
  assert.match(workspace, /libraryEntry/);
  assert.match(workspace, /parseProjectBackupContents/);
  assert.match(workspace, /beforeunload/);
  assert.match(workspace, /confirmReplaceCurrentWorkspace/);
  assert.doesNotMatch(
    workspace,
    /setSavedProjects\(removeProjectFromLibrary\(sessionId\)\)/,
  );
  assert.match(storage, /pickPreferredPersistedProject/);
  assert.match(storage, /LOCAL_PROJECT_FALLBACK_MAX_BYTES/);
  assert.match(storage, /requestPersistentStorage/);
  assert.match(
    bundled,
    /pickStableShaderPresets\(/,
  );
});

test('bundled photo library keeps only statue, default stage, and vertical stage', () => {
  const assets = readFileSync(new URL('../src/lib/bundledAssets.ts', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../src/routes/WorkspaceRoute.tsx', import.meta.url), 'utf8');
  const serviceWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(assets, /id: BUNDLED_STATUE_ASSET_ID/);
  assert.match(assets, /id: BUNDLED_STAGE_ASSET_ID/);
  assert.match(assets, /id: BUNDLED_VERTICAL_STAGE_ASSET_ID/);
  assert.doesNotMatch(assets, /name: 'Green Eyes Statue'/);
  assert.doesNotMatch(assets, /defaults-statue-green-eyes\.png/);
  assert.doesNotMatch(assets, /defaults-stage-1b\.png/);
  assert.doesNotMatch(assets, /defaults-basestatue-depth\.png/);
  assert.match(assets, /RETIRED_BUNDLED_ASSET_FALLBACKS/);
  assert.match(workspace, /resolveLiveBundledAssetId/);
  assert.match(workspace, /Home-screen bookmarks can drop uploaded images/);
  assert.match(serviceWorker, /cacheNames\.map\(\(cacheName\) => self\.caches\.delete\(cacheName\)\)/);
});
