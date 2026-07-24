type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALL_AVAILABLE_EVENT = 'mapshroom:install-available';
const APP_INSTALLED_EVENT = 'mapshroom:app-installed';
const INSTALLED_HINT_KEY = 'mapshroom:pwa-installed';
const LEGACY_OFFLINE_CACHE_PREFIXES = [
  'workbox-precache',
  'mapshroom-runtime-assets',
  'google-fonts-stylesheets',
  'google-fonts-webfonts',
];

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersRegistered = false;

function writeInstalledHint(installed: boolean) {
  try {
    if (installed) {
      window.localStorage.setItem(INSTALLED_HINT_KEY, 'true');
    } else {
      window.localStorage.removeItem(INSTALLED_HINT_KEY);
    }
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function readInstalledHint(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_HINT_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function clearLegacyOfflineCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => registration.scope.startsWith(window.location.origin))
          .map((registration) => registration.unregister()),
      );
    } catch {
      // Registration cleanup is best-effort and must never block the online app.
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) =>
            LEGACY_OFFLINE_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
          )
          .map((cacheName) => caches.delete(cacheName)),
      );
    } catch {
      // Cache cleanup is best-effort and must never block the online app.
    }
  }
}

export function captureInstallPrompt() {
  if (listenersRegistered || typeof window === 'undefined') {
    return;
  }

  listenersRegistered = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    writeInstalledHint(false);
    window.dispatchEvent(new Event(INSTALL_AVAILABLE_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    writeInstalledHint(true);
    window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
  });

  void clearLegacyOfflineCaches();
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt;
  if (!prompt) {
    return 'unavailable';
  }

  await prompt.prompt();
  const choice = await prompt.userChoice;
  clearDeferredInstallPrompt();
  return choice.outcome;
}

export function onInstallAvailable(listener: () => void) {
  window.addEventListener(INSTALL_AVAILABLE_EVENT, listener);
  return () => window.removeEventListener(INSTALL_AVAILABLE_EVENT, listener);
}

export function onAppInstalled(listener: () => void) {
  window.addEventListener(APP_INSTALLED_EVENT, listener);
  return () => window.removeEventListener(APP_INSTALLED_EVENT, listener);
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export async function isPwaInstalled(): Promise<boolean> {
  if (isStandaloneApp()) {
    return true;
  }

  const navigatorWithRelatedApps = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform: string }>>;
  };

  if (navigatorWithRelatedApps.getInstalledRelatedApps) {
    try {
      const relatedApps = await navigatorWithRelatedApps.getInstalledRelatedApps();
      const installed = relatedApps.some((app) => app.platform === 'webapp');
      writeInstalledHint(installed);
      return installed;
    } catch {
      // Fall back to the installation event hint below.
    }
  }

  return readInstalledHint();
}
