import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getDeferredInstallPrompt,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';
import { track, trackAppOpen, trackUiClick, getAnalyticsConsent } from '../lib/analytics';

type InstallState = 'idle' | 'available' | 'installed' | 'manual';
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

function getManualInstallHint(platform: ReturnType<typeof detectPlatform>): string {
  if (platform === 'ios') {
    return 'Tap Share in Safari, then choose Add to Home Screen.';
  }
  if (platform === 'android') {
    return 'Open the browser menu (⋮) and choose Install app or Add to Home screen.';
  }
  return 'Click the install icon in the Chrome or Edge address bar (⊕ or computer icon).';
}

export function DownloadRoute() {
  const navigate = useNavigate();
  const [installState, setInstallState] = useState<InstallState>(() =>
    getDeferredInstallPrompt() ? 'available' : 'idle',
  );
  const [offlineState, setOfflineState] = useState<OfflineState>('checking');
  const [installing, setInstalling] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const platform = detectPlatform();
  const appUrl = useMemo(
    () => new URL(import.meta.env.BASE_URL, window.location.origin).href,
    [],
  );
  const downloadPageUrl = `${appUrl}#/download`;

  useEffect(() => {
    if (isStandaloneApp()) {
      navigate('/', { replace: true });
      return;
    }

    document.body.classList.add('download-page-active');
    if (getAnalyticsConsent() === 'granted') {
      trackAppOpen({ path: '#/download' });
    }
    return () => {
      document.body.classList.remove('download-page-active');
    };
  }, [navigate]);

  useEffect(() => {
    if (isStandaloneApp()) {
      setInstallState('installed');
      return;
    }

    const unsubscribeAvailable = onInstallAvailable(() => {
      setInstallState('available');
      setInstallMessage(null);
    });

    const unsubscribeInstalled = onAppInstalled(() => {
      setInstallState('installed');
      navigate('/', { replace: true });
    });
    const manualTimer = window.setTimeout(() => {
      setInstallState((current) => (current === 'idle' ? 'manual' : current));
    }, 4000);

    return () => {
      window.clearTimeout(manualTimer);
      unsubscribeAvailable();
      unsubscribeInstalled();
    };
  }, [navigate]);

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
    trackUiClick('install_offline');
    track('install_offline');
    if (!getDeferredInstallPrompt()) {
      setInstallState('manual');
      setInstallMessage(getManualInstallHint(platform));
      document.getElementById('install-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstallState('installed');
        track('install_offline', { outcome: 'accepted' });
        navigate('/', { replace: true });
      } else if (outcome === 'dismissed') {
        setInstallMessage('Install cancelled. Use the manual steps below.');
        setInstallState('manual');
      } else {
        setInstallState('manual');
        setInstallMessage(getManualInstallHint(platform));
      }
    } finally {
      setInstalling(false);
    }
  };
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadPageUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      window.prompt('Copy this link to install Mapshroom offline:', downloadPageUrl);
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
            Install Mapshroom on this device like a native app. After the first visit, the editor
            keeps working without a network connection.
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
                ? 'App files are cached on this device.'
                : 'Stay on this page online until caching finishes.'}
            </p>
          </div>
          <div className="download-status-card">
            <span className="download-status-label">Install</span>
            <strong className="download-status-value">
              {installState === 'installed'
                ? 'Installed'
                : installState === 'available'
                  ? 'Ready'
                  : installState === 'manual'
                    ? 'Manual'
                    : 'Preparing…'}
            </strong>
            <p className="download-status-hint">
              {installState === 'installed'
                ? 'Launch Mapshroom from your home screen or app launcher.'
                : installState === 'available'
                  ? 'One-click install is available on this browser.'
                  : 'Use the install button, then follow the steps for your device.'}
            </p>
          </div>
        </section>

        <section className="download-actions" aria-label="Install actions">
          {installState === 'installed' ? (
            <Link to="/" replace className="primary-button primary-button-hero download-install-button">
              Open Mapshroom
            </Link>
          ) : (            <button
              type="button"
              className="primary-button primary-button-hero download-install-button"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              {installing
                ? 'Installing…'
                : installState === 'available'
                  ? 'Install Mapshroom'
                  : 'Install Mapshroom offline'}
            </button>
          )}

          {installMessage ? <p className="download-actions-message">{installMessage}</p> : null}

          {installState === 'manual' ? (
            <p className="download-actions-note download-actions-note-prominent">
              {getManualInstallHint(platform)}
            </p>
          ) : null}

          <div className="download-link-card">
            <span className="download-link-label">Share install link</span>
            <span className="download-page-direct-link">{downloadPageUrl}</span>
            <div className="download-link-actions">
              <button type="button" className="secondary-button" onClick={() => void handleCopyLink()}>
                {copyState === 'copied' ? 'Copied' : 'Copy link'}
              </button>
              <Link to="/" className="secondary-button download-link-open-app">
                Open workspace
              </Link>
            </div>
          </div>
        </section>

        <section
          id="install-steps"
          className="download-steps"
          aria-label="Platform install steps"
        >
          <h2 className="download-steps-title">How to install</h2>

          <article
            className={`download-step-card ${platform === 'desktop' ? 'download-step-card-active' : ''}`}
          >
            <h3>Desktop (Chrome / Edge)</h3>
            <ol>
              <li>Stay on this page until offline cache shows Ready.</li>
              <li>Click <strong>Install Mapshroom offline</strong> above, or use the install icon in the address bar.</li>
              <li>Launch Mapshroom from your desktop or app launcher.</li>
            </ol>
          </article>

          <article
            className={`download-step-card ${platform === 'android' ? 'download-step-card-active' : ''}`}
          >
            <h3>Android (Chrome)</h3>
            <ol>
              <li>Stay on this page while online until caching finishes.</li>
              <li>Tap the menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Open Mapshroom from the home screen icon.</li>
            </ol>
          </article>

          <article
            className={`download-step-card ${platform === 'ios' ? 'download-step-card-active' : ''}`}
          >
            <h3>iPhone / iPad (Safari)</h3>
            <ol>
              <li>Open this page in Safari while online.</li>
              <li>Tap Share → <strong>Add to Home Screen</strong>.</li>
              <li>Open the home screen icon to launch Mapshroom.</li>
            </ol>
          </article>
        </section>

        <footer className="download-page-footer">
          <p>
            Projects and media stay on this device. AI features still need a network connection when
            you use them.
          </p>
          <Link to="/" className="secondary-button">
            Back to workspace
          </Link>
        </footer>
      </div>
    </main>
  );
}
