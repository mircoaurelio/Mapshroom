import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallState = 'idle' | 'available' | 'installed' | 'unsupported';
type OfflineState = 'checking' | 'ready' | 'pending';

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

export function DownloadRoute() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [offlineState, setOfflineState] = useState<OfflineState>('checking');
  const [installing, setInstalling] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    document.body.classList.add('download-page-active');
    return () => {
      document.body.classList.remove('download-page-active');
    };
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (standalone) {
      setInstallState('installed');
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState('available');
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstallState('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const unsupportedTimer = window.setTimeout(() => {
      setInstallState((current) => (current === 'idle' ? 'unsupported' : current));
    }, 1500);

    return () => {
      window.clearTimeout(unsupportedTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkOfflineReady = async () => {
      if (!('serviceWorker' in navigator)) {
        if (!cancelled) {
          setOfflineState('pending');
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (cancelled) {
          return;
        }

        if (registration.active) {
          setOfflineState('ready');
          return;
        }
      } catch {
        // Fall through to pending.
      }

      if (!cancelled) {
        setOfflineState('pending');
      }
    };

    void checkOfflineReady();

    const handleOfflineReady = () => {
      setOfflineState('ready');
    };

    window.addEventListener('mapshroom:offline-ready', handleOfflineReady);
    return () => {
      cancelled = true;
      window.removeEventListener('mapshroom:offline-ready', handleOfflineReady);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallState('installed');
      }
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <main className="download-page">
      <div className="download-page-glow" aria-hidden="true" />
      <div className="download-page-inner">
        <header className="download-page-header">
          <Link to="/" className="download-page-back">
            ← Workspace
          </Link>
          <p className="download-page-kicker">Mapshroom V3</p>
          <h1 className="download-page-title">Install offline</h1>
          <p className="download-page-lead">
            Cache Mapshroom on this device and open it like a native app — no store, no network
            required after the first install.
          </p>
        </header>

        <section className="download-status-grid" aria-label="Install status">
          <div className="download-status-card">
            <span className="download-status-label">Offline cache</span>
            <strong className="download-status-value">
              {offlineState === 'ready'
                ? 'Ready'
                : offlineState === 'checking'
                  ? 'Checking…'
                  : 'Caching…'}
            </strong>
            <p className="download-status-hint">
              {offlineState === 'ready'
                ? 'App shell is cached for offline use.'
                : 'Open this page once online so assets can finish downloading.'}
            </p>
          </div>
          <div className="download-status-card">
            <span className="download-status-label">Install</span>
            <strong className="download-status-value">
              {installState === 'installed'
                ? 'Installed'
                : installState === 'available'
                  ? 'Available'
                  : installState === 'unsupported'
                    ? 'Manual'
                    : 'Detecting…'}
            </strong>
            <p className="download-status-hint">
              {installState === 'installed'
                ? 'Mapshroom is already installed on this device.'
                : 'Use the button below or follow the platform steps.'}
            </p>
          </div>
        </section>

        <section className="download-actions">
          {installState === 'available' ? (
            <button
              type="button"
              className="primary-button primary-button-hero download-install-button"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              {installing ? 'Installing…' : 'Install Mapshroom'}
            </button>
          ) : null}

          {installState === 'installed' ? (
            <Link to="/" className="primary-button primary-button-hero download-install-button">
              Open workspace
            </Link>
          ) : null}

          {installState === 'unsupported' || installState === 'idle' ? (
            <p className="download-actions-note">
              Your browser may not show a one-click install prompt. Use the steps for your platform
              below — the offline cache still works after this visit.
            </p>
          ) : null}
        </section>

        <section className="download-steps" aria-label="Platform install steps">
          <h2 className="download-steps-title">How to install</h2>

          <article
            className={`download-step-card ${platform === 'desktop' ? 'download-step-card-active' : ''}`}
          >
            <h3>Desktop (Chrome / Edge)</h3>
            <ol>
              <li>Visit Mapshroom while online so the offline cache can finish.</li>
              <li>Click the install icon in the address bar, or use the Install button above.</li>
              <li>Open Mapshroom from your desktop or app launcher — it runs offline.</li>
            </ol>
          </article>

          <article
            className={`download-step-card ${platform === 'android' ? 'download-step-card-active' : ''}`}
          >
            <h3>Android (Chrome)</h3>
            <ol>
              <li>Open this page in Chrome while online.</li>
              <li>Tap the menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Launch Mapshroom from the home screen icon for the standalone offline app.</li>
            </ol>
          </article>

          <article
            className={`download-step-card ${platform === 'ios' ? 'download-step-card-active' : ''}`}
          >
            <h3>iPhone / iPad (Safari)</h3>
            <ol>
              <li>Open Mapshroom in Safari while online.</li>
              <li>Tap Share → <strong>Add to Home Screen</strong>.</li>
              <li>Open the home screen icon — Safari caches the app for offline use.</li>
            </ol>
          </article>
        </section>

        <footer className="download-page-footer">
          <p>
            Projects and media stay on this device (local storage). AI features still need a network
            connection when you use them.
          </p>
          <Link to="/" className="secondary-button">
            Back to workspace
          </Link>
        </footer>
      </div>
    </main>
  );
}
