type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALL_AVAILABLE_EVENT = 'mapshroom:install-available';
const APP_INSTALLED_EVENT = 'mapshroom:app-installed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersRegistered = false;

export function captureInstallPrompt() {
  if (listenersRegistered || typeof window === 'undefined') {
    return;
  }

  listenersRegistered = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_AVAILABLE_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
  });
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
