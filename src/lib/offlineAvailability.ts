export type OfflineAvailabilityStatus =
  | 'unsupported'
  | 'checking'
  | 'preparing'
  | 'ready'
  | 'error';

export interface OfflineAvailabilitySnapshot {
  status: OfflineAvailabilityStatus;
  message: string;
  buildId: string;
  persistentStorage: boolean | null;
}

interface OfflineBuildMarker {
  schemaVersion: number;
  buildId: string;
}

const OFFLINE_AVAILABILITY_EVENT = 'mapshroom:offline-availability';
const PREPARATION_TIMEOUT_MS = 3 * 60 * 1000;
const VERIFICATION_INTERVAL_MS = 500;

let currentSnapshot: OfflineAvailabilitySnapshot = {
  status: 'checking',
  message: 'Checking offline availability…',
  buildId: __MAPSHROOM_BUILD_ID__,
  persistentStorage: null,
};
let preparationPromise: Promise<OfflineAvailabilitySnapshot> | null = null;

function publishSnapshot(
  nextSnapshot: Omit<OfflineAvailabilitySnapshot, 'buildId'>,
): OfflineAvailabilitySnapshot {
  currentSnapshot = {
    ...nextSnapshot,
    buildId: __MAPSHROOM_BUILD_ID__,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<OfflineAvailabilitySnapshot>(OFFLINE_AVAILABILITY_EVENT, {
        detail: currentSnapshot,
      }),
    );
  }

  return currentSnapshot;
}

function getAppBaseUrl(): URL {
  return new URL(import.meta.env.BASE_URL, window.location.origin);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function waitForWorkerActivation(worker: ServiceWorker): Promise<void> {
  if (worker.state === 'activated') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const handleStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', handleStateChange);
        resolve();
      } else if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', handleStateChange);
        reject(new Error('The offline worker was replaced before it became active.'));
      }
    };

    worker.addEventListener('statechange', handleStateChange);
  });
}

async function waitForPendingWorker(registration: ServiceWorkerRegistration): Promise<void> {
  const pendingWorker = registration.installing ?? registration.waiting;
  if (!pendingWorker) {
    return;
  }

  await withTimeout(
    waitForWorkerActivation(pendingWorker),
    PREPARATION_TIMEOUT_MS,
    'Downloading the offline application took too long.',
  );
}

async function waitForController(): Promise<ServiceWorker> {
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  return withTimeout(
    new Promise<ServiceWorker>((resolve) => {
      const handleControllerChange = () => {
        if (!navigator.serviceWorker.controller) {
          return;
        }

        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve(navigator.serviceWorker.controller);
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }),
    PREPARATION_TIMEOUT_MS,
    'The offline worker did not take control of this page.',
  );
}

function getCurrentBuildAssetUrls(): string[] {
  const appBaseUrl = getAppBaseUrl();
  const urls = new Set<string>([
    new URL('index.html', appBaseUrl).href,
    new URL('manifest.webmanifest', appBaseUrl).href,
    new URL('offline-ready.json', appBaseUrl).href,
  ]);

  const elements = document.querySelectorAll(
    'script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href], link[rel="manifest"][href]',
  );

  elements.forEach((element) => {
    const source =
      element instanceof HTMLScriptElement
        ? element.src
        : element instanceof HTMLLinkElement
          ? element.href
          : '';

    if (!source) {
      return;
    }

    const url = new URL(source, window.location.href);
    if (
      url.origin === appBaseUrl.origin &&
      url.pathname.startsWith(appBaseUrl.pathname)
    ) {
      urls.add(url.href);
    }
  });

  return [...urls];
}

async function inspectCurrentBuildCache(): Promise<{
  ready: boolean;
  reason: string;
}> {
  const markerUrl = new URL('offline-ready.json', getAppBaseUrl()).href;
  const requiredAssetUrls = getCurrentBuildAssetUrls();
  const cacheNames = await caches.keys();
  const markerBuildIds: string[] = [];

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const markerResponse = await cache.match(markerUrl, { ignoreSearch: true });

    if (!markerResponse?.ok) {
      continue;
    }

    let marker: OfflineBuildMarker;
    try {
      marker = (await markerResponse.clone().json()) as OfflineBuildMarker;
    } catch {
      continue;
    }

    markerBuildIds.push(marker.buildId);

    if (
      marker.schemaVersion !== 1 ||
      marker.buildId !== __MAPSHROOM_BUILD_ID__
    ) {
      continue;
    }

    const cachedResponses = await Promise.all(
      requiredAssetUrls.map((url) => cache.match(url, { ignoreSearch: true })),
    );

    if (cachedResponses.every((response) => Boolean(response?.ok))) {
      return {
        ready: true,
        reason: 'The current build is cached.',
      };
    }

    const missingAssets = requiredAssetUrls
      .filter((_url, index) => !cachedResponses[index]?.ok)
      .map((url) => new URL(url).pathname);

    return {
      ready: false,
      reason: `Missing cached files: ${missingAssets.join(', ')}`,
    };
  }

  if (markerBuildIds.length > 0) {
    return {
      ready: false,
      reason: 'The browser is still replacing an older offline build.',
    };
  }

  return {
    ready: false,
    reason:
      cacheNames.length > 0
        ? 'The offline build marker is missing from Cache Storage.'
        : 'The browser has not created the offline cache.',
  };
}

async function waitForCurrentBuildCache(): Promise<void> {
  const startedAt = Date.now();
  let lastReason = 'The offline cache is incomplete.';
  let lastPublishedReason = '';

  while (Date.now() - startedAt < PREPARATION_TIMEOUT_MS) {
    const inspection = await inspectCurrentBuildCache();
    if (inspection.ready) {
      return;
    }
    lastReason = inspection.reason;
    if (lastReason !== lastPublishedReason) {
      lastPublishedReason = lastReason;
      publishSnapshot({
        status: 'preparing',
        message: lastReason,
        persistentStorage: currentSnapshot.persistentStorage,
      });
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, VERIFICATION_INTERVAL_MS);
    });
  }

  throw new Error(`The browser did not finish caching Mapshroom. ${lastReason}`);
}

async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) {
    return null;
  }

  try {
    if (await navigator.storage.persisted()) {
      return true;
    }

    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

async function runOfflinePreparation(forceUpdate: boolean): Promise<OfflineAvailabilitySnapshot> {
  if (import.meta.env.DEV) {
    return publishSnapshot({
      status: 'unsupported',
      message: 'Offline installation is available in the production build.',
      persistentStorage: null,
    });
  }

  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    return publishSnapshot({
      status: 'unsupported',
      message: 'This browser does not support offline web applications.',
      persistentStorage: null,
    });
  }

  publishSnapshot({
    status: 'preparing',
    message: 'Preparing Mapshroom for offline use…',
    persistentStorage: currentSnapshot.persistentStorage,
  });

  try {
    let registration = await withTimeout(
      navigator.serviceWorker.ready,
      PREPARATION_TIMEOUT_MS,
      'The offline worker did not become ready.',
    );

    if (navigator.onLine || forceUpdate) {
      try {
        registration = await registration.update();
      } catch (error) {
        if (!registration.active) {
          throw error;
        }
      }
    }

    await waitForPendingWorker(registration);
    await waitForController();
    await waitForCurrentBuildCache();

    const persistentStorage = await requestPersistentStorage();
    return publishSnapshot({
      status: 'ready',
      message:
        persistentStorage === false
          ? 'Ready offline. Browser storage may still be cleared automatically.'
          : 'Ready for offline use.',
      persistentStorage,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Mapshroom could not prepare its offline files.';

    return publishSnapshot({
      status: 'error',
      message,
      persistentStorage: currentSnapshot.persistentStorage,
    });
  }
}

export function getOfflineAvailability(): OfflineAvailabilitySnapshot {
  return currentSnapshot;
}

export function onOfflineAvailabilityChange(
  listener: (snapshot: OfflineAvailabilitySnapshot) => void,
): () => void {
  const handleChange = (event: Event) => {
    listener((event as CustomEvent<OfflineAvailabilitySnapshot>).detail);
  };

  window.addEventListener(OFFLINE_AVAILABILITY_EVENT, handleChange);
  return () => window.removeEventListener(OFFLINE_AVAILABILITY_EVENT, handleChange);
}

export function prepareOfflineAvailability(options?: {
  forceUpdate?: boolean;
}): Promise<OfflineAvailabilitySnapshot> {
  if (preparationPromise) {
    return preparationPromise;
  }

  if (currentSnapshot.status === 'ready' && !options?.forceUpdate) {
    return Promise.resolve(currentSnapshot);
  }

  preparationPromise = runOfflinePreparation(Boolean(options?.forceUpdate)).finally(() => {
    preparationPromise = null;
  });

  return preparationPromise;
}

export function reportOfflineRegistrationError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : 'The offline worker could not be registered.';

  publishSnapshot({
    status: 'error',
    message,
    persistentStorage: currentSnapshot.persistentStorage,
  });
}
