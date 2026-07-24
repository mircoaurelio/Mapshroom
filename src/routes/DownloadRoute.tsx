import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProBetaDialog } from '../components/ProBetaDialog';
import {
  getDeferredInstallPrompt,
  isPwaInstalled,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';
import { getAnalyticsConsent, trackAppOpen, trackUiClick } from '../lib/analytics';

type InstallState = 'idle' | 'available' | 'installed' | 'manual';
type InstallPlatform = 'ios' | 'android' | 'desktop';

function detectPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  if (/android/.test(userAgent)) {
    return 'android';
  }
  return 'desktop';
}

function getManualInstallHint(platform: InstallPlatform): string {
  if (platform === 'ios') {
    return 'In Safari, tap Share, choose Add to Home Screen, enable Open as Web App, then tap Add.';
  }
  if (platform === 'android') {
    return 'Open the browser menu (⋮) and choose Install app or Add to Home screen.';
  }
  return 'Use the install icon in the Chrome or Edge address bar.';
}

export function DownloadRoute() {
  const [installState, setInstallState] = useState<InstallState>(() =>
    isStandaloneApp()
      ? 'installed'
      : getDeferredInstallPrompt()
        ? 'available'
        : 'idle',
  );
  const [installing, setInstalling] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [betaOpen, setBetaOpen] = useState(false);
  const platform = detectPlatform();
  const appUrl = useMemo(
    () => new URL(import.meta.env.BASE_URL, window.location.origin).href,
    [],
  );
  const downloadPageUrl = `${appUrl}#/download`;

  useEffect(() => {
    document.body.classList.add('download-page-active');
    if (getAnalyticsConsent() === 'granted') {
      trackAppOpen({ path: '#/download' });
    }

    return () => {
      document.body.classList.remove('download-page-active');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void isPwaInstalled().then((installed) => {
      if (!cancelled && installed) {
        setInstallState('installed');
      }
    });

    const unsubscribeAvailable = onInstallAvailable(() => {
      setInstallState('available');
      setInstallMessage(null);
    });
    const unsubscribeInstalled = onAppInstalled(() => {
      setInstallState('installed');
      setInstallMessage('Mapshroom is installed and ready to launch.');
    });
    const manualTimer = window.setTimeout(() => {
      setInstallState((current) => (current === 'idle' ? 'manual' : current));
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(manualTimer);
      unsubscribeAvailable();
      unsubscribeInstalled();
    };
  }, []);

  const handleInstall = async () => {
    if (installState === 'installed' || (await isPwaInstalled())) {
      setInstallState('installed');
      setBetaOpen(true);
      return;
    }

    trackUiClick('install_app');
    if (!getDeferredInstallPrompt()) {
      setInstallState('manual');
      setInstallMessage(getManualInstallHint(platform));
      document
        .getElementById('install-steps')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstallState('installed');
        setInstallMessage('Mapshroom is installed and ready to launch.');
        trackUiClick('install_app', { outcome: 'accepted' });
      } else if (outcome === 'dismissed') {
        setInstallMessage('Installation cancelled. You can retry or use the device steps below.');
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
      window.prompt('Copy this link to install Mapshroom:', downloadPageUrl);
    }
  };

  return (
    <>
      <main className="download-page">
        <div className="download-page-glow" aria-hidden="true" />
        <div className="download-page-inner">
          <header className="download-page-header">
            <Link to="/" className="download-page-back">
              ← Workspace
            </Link>
            <p className="download-page-kicker">Mapshroom V3</p>
            <h1 className="download-page-title">Install Mapshroom</h1>
            <p className="download-page-lead">
              Keep Mapshroom in your dock, desktop, or home screen and open it in its own app
              window. Mapshroom remains an online web app and requires an internet connection.
            </p>
          </header>

          <section className="download-status-grid" aria-label="Install status">
            <div className="download-status-card">
              <span className="download-status-label">App mode</span>
              <strong className="download-status-value">Online</strong>
              <p className="download-status-hint">
                Always opens the current Mapshroom version from the web.
              </p>
            </div>
            <div className="download-status-card">
              <span className="download-status-label">Installation</span>
              <strong className="download-status-value">
                {installState === 'installed'
                  ? 'Installed'
                  : installState === 'available'
                    ? 'One click'
                    : installState === 'manual'
                      ? 'Device steps'
                      : 'Checking…'}
              </strong>
              <p className="download-status-hint">
                {installState === 'installed'
                  ? 'Mapshroom is already installed on this device.'
                  : installState === 'available'
                    ? 'Your browser can open the native install dialog.'
                    : 'Installation options depend on your browser and device.'}
              </p>
            </div>
          </section>

          <section className="download-actions" aria-label="Install actions">
            <button
              type="button"
              className="primary-button primary-button-hero download-install-button"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              {installing
                ? 'Opening installer…'
                : installState === 'installed'
                  ? 'Download for offline mode'
                  : 'Install Mapshroom'}
            </button>

            {installMessage ? (
              <p className="download-actions-message">{installMessage}</p>
            ) : null}

            {installState === 'manual' ? (
              <p className="download-actions-note download-actions-note-prominent">
                {getManualInstallHint(platform)}
              </p>
            ) : null}

            <div className="download-link-card">
              <span className="download-link-label">Share install link</span>
              <span className="download-page-direct-link">{downloadPageUrl}</span>
              <div className="download-link-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCopyLink()}
                >
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
            <h2 className="download-steps-title">Install on your device</h2>

            <article
              className={`download-step-card ${
                platform === 'desktop' ? 'download-step-card-active' : ''
              }`}
            >
              <h3>Desktop · Chrome or Edge</h3>
              <ol>
                <li>Click <strong>Install Mapshroom</strong> above.</li>
                <li>Confirm <strong>Install</strong> in the browser dialog.</li>
                <li>Launch Mapshroom from your desktop, dock, or app launcher.</li>
              </ol>
            </article>

            <article
              className={`download-step-card ${
                platform === 'android' ? 'download-step-card-active' : ''
              }`}
            >
              <h3>Android · Chrome</h3>
              <ol>
                <li>Tap <strong>Install Mapshroom</strong> above.</li>
                <li>If no dialog appears, open the menu (⋮) and choose <strong>Install app</strong>.</li>
                <li>Open Mapshroom from your home screen.</li>
              </ol>
            </article>

            <article
              className={`download-step-card ${
                platform === 'ios' ? 'download-step-card-active' : ''
              }`}
            >
              <h3>iPhone or iPad · Safari</h3>
              <ol>
                <li>Open this page in Safari and tap <strong>Share</strong>.</li>
                <li>Choose <strong>Add to Home Screen</strong> and enable <strong>Open as Web App</strong>.</li>
                <li>Tap <strong>Add</strong>, then launch Mapshroom from your home screen.</li>
              </ol>
            </article>
          </section>

          <footer className="download-page-footer">
            <p>
              Your projects and imported media remain in this browser. Internet access is required
              to open and use Mapshroom.
            </p>
            <Link to="/" className="secondary-button">
              Back to workspace
            </Link>
          </footer>
        </div>
      </main>

      <ProBetaDialog
        open={betaOpen}
        source="offline_tutorial"
        onClose={() => setBetaOpen(false)}
      />
    </>
  );
}
