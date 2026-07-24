import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getDeferredInstallPrompt,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';

const FIRST_ACCESS_KEY = 'mapshroom:pwa-first-access-at:v1';
const DISMISSED_KEY = 'mapshroom:pwa-install-callout-dismissed:v1';
const SHOWN_THIS_SESSION_KEY = 'mapshroom:pwa-install-callout-shown:v1';
const INSTALL_CALLOUT_DELAY_MS = 2 * 60 * 1000;

type CalloutPlatform = 'ios' | 'android' | 'desktop';

function detectCalloutPlatform(): CalloutPlatform {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // The callout remains usable when storage is unavailable.
  }
}

function getOrCreateFirstAccessTime(): number {
  const storedValue = Number(readStorage(window.localStorage, FIRST_ACCESS_KEY));

  if (Number.isFinite(storedValue) && storedValue > 0) {
    return storedValue;
  }

  const firstAccessTime = Date.now();
  writeStorage(window.localStorage, FIRST_ACCESS_KEY, String(firstAccessTime));
  return firstAccessTime;
}

function dismissPermanently() {
  writeStorage(window.localStorage, DISMISSED_KEY, 'true');
}

function getCalloutCopy(platform: CalloutPlatform) {
  if (platform === 'ios') {
    return {
      title: 'Keep Mapshroom on this device',
      body: 'Tap Share in Safari, then choose Add to Home Screen. The installed editor can open without an internet connection.',
    };
  }

  if (platform === 'android') {
    return {
      title: 'Install Mapshroom for offline use',
      body: 'Open the Chrome menu and choose Install app or Add to Home screen. The editor will then be available without internet.',
    };
  }

  return {
    title: 'Install Mapshroom for offline use',
    body: 'Click the install icon on the right side of the address bar — it looks like a small screen with a downward arrow. Once cached, the editor opens without internet.',
  };
}

export function InstallAppCallout() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(() =>
    Boolean(getDeferredInstallPrompt()),
  );
  const [installing, setInstalling] = useState(false);
  const [platform] = useState<CalloutPlatform>(() => detectCalloutPlatform());
  const copy = getCalloutCopy(platform);

  useEffect(() => {
    if (
      isStandaloneApp() ||
      readStorage(window.localStorage, DISMISSED_KEY) === 'true' ||
      readStorage(window.sessionStorage, SHOWN_THIS_SESSION_KEY) === 'true'
    ) {
      return;
    }

    const firstAccessTime = getOrCreateFirstAccessTime();
    const remainingDelay = Math.max(
      0,
      firstAccessTime + INSTALL_CALLOUT_DELAY_MS - Date.now(),
    );

    const timeoutId = window.setTimeout(() => {
      writeStorage(window.sessionStorage, SHOWN_THIS_SESSION_KEY, 'true');
      setVisible(true);
    }, remainingDelay);

    const unsubscribeAvailable = onInstallAvailable(() => {
      setInstallAvailable(true);
    });

    const unsubscribeInstalled = onAppInstalled(() => {
      dismissPermanently();
      setVisible(false);
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_KEY && event.newValue === 'true') {
        setVisible(false);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribeAvailable();
      unsubscribeInstalled();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleClose = () => {
    dismissPermanently();
    setVisible(false);
  };

  const handleInstall = async () => {
    setInstalling(true);

    try {
      const outcome = await promptInstall();

      if (outcome === 'accepted') {
        dismissPermanently();
        setVisible(false);
        return;
      }

      setInstallAvailable(false);
    } finally {
      setInstalling(false);
    }
  };

  if (
    !visible ||
    location.pathname !== '/' ||
    isStandaloneApp()
  ) {
    return null;
  }

  return (
    <aside
      className={`install-app-callout install-app-callout-${platform}`}
      role="dialog"
      aria-labelledby="install-app-callout-title"
      aria-describedby="install-app-callout-description"
    >
      {platform === 'desktop' ? (
        <span className="install-app-callout-arrow" aria-hidden="true" />
      ) : null}
      <button
        type="button"
        className="install-app-callout-close"
        aria-label="Close install tip"
        onClick={handleClose}
      >
        ×
      </button>
      <span className="install-app-callout-kicker">Use it anywhere</span>
      <strong id="install-app-callout-title">{copy.title}</strong>
      <p id="install-app-callout-description">{copy.body}</p>
      <div className="install-app-callout-actions">
        {installAvailable ? (
          <button
            type="button"
            className="primary-button"
            disabled={installing}
            onClick={() => void handleInstall()}
          >
            {installing ? 'Opening installer…' : 'Install now'}
          </button>
        ) : (
          <Link to="/download" className="primary-button">
            Show install steps
          </Link>
        )}
        <button type="button" className="secondary-button" onClick={handleClose}>
          Not now
        </button>
      </div>
    </aside>
  );
}
