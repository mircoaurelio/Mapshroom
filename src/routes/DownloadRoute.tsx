import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapshroomShaderFooter } from '../components/MapshroomShaderFooter';
import { EmailCaptureForm } from '../components/EmailCaptureForm';
import { ProBetaDialog } from '../components/ProBetaDialog';
import {
  getDeferredInstallPrompt,
  isPwaInstalled,
  isStandaloneApp,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwaInstall';
import { isTauri } from '../lib/desktop';
import { getAnalyticsConsent, track, trackAppOpen, trackUiClick } from '../lib/analytics';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';

type InstallState = 'idle' | 'available' | 'installed' | 'manual';
type InstallPlatform = 'ios' | 'android' | 'desktop';
type DesktopStep = 'cta' | 'email';

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
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const [installState, setInstallState] = useState<InstallState>(() =>
    isTauri() || isStandaloneApp()
      ? 'installed'
      : getDeferredInstallPrompt()
        ? 'available'
        : 'idle',
  );
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [betaOpen, setBetaOpen] = useState(false);
  const [desktopStep, setDesktopStep] = useState<DesktopStep>('cta');
  const [showWebInstall, setShowWebInstall] = useState(false);
  const platform = detectPlatform();
  const isDesktop = platform === 'desktop';

  useEffect(() => {
    document.body.classList.add('download-page-active');
    if (getAnalyticsConsent() === 'granted') {
      trackAppOpen({ path: '#/download' });
      track('download_page_viewed', { platform });
    }

    return () => {
      document.body.classList.remove('download-page-active');
    };
  }, [platform]);

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
        setInstallMessage('Installation cancelled. You can retry below.');
        setInstallState('manual');
      } else {
        setInstallState('manual');
        setInstallMessage(getManualInstallHint(platform));
      }
    } finally {
      setInstalling(false);
    }
  };

  const startDesktopEmail = () => {
    trackUiClick('desktop_download_start');
    setDesktopStep('email');
  };

  return (
    <>
      <main className="download-page">
        <div className="download-page-glow" aria-hidden="true" />
        <div className="download-page-inner download-page-inner-compact">
          <header className="download-page-header">
            <Link to="/" className="download-page-back">
              ← Workspace
            </Link>
            <p className="download-page-kicker">Mapshroom V3</p>
            <h1 className="download-page-title">
              {isDesktop ? copy.downloadCtaShort : 'Download Mapshroom'}
            </h1>
          </header>

          {isDesktop ? (
            <section className="download-actions growth-download-block" aria-label="Windows desktop beta">
              {desktopStep === 'cta' ? (
                <>
                  <button
                    type="button"
                    className="primary-button primary-button-hero download-install-button"
                    onClick={startDesktopEmail}
                  >
                    {copy.downloadCta}
                  </button>
                  <button
                    type="button"
                    className="ghost-button download-secondary-link"
                    onClick={() => setShowWebInstall((open) => !open)}
                  >
                    {showWebInstall ? copy.hideWebInstall : copy.preferWebInstall}
                  </button>
                </>
              ) : (
                <>
                  <p className="helper-copy">{copy.desktopEmailPrompt}</p>
                  <EmailCaptureForm source="desktop_download" compact />
                  <button
                    type="button"
                    className="ghost-button download-secondary-link"
                    onClick={() => setDesktopStep('cta')}
                  >
                    ← Back
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="download-actions" aria-label="Install web app">
              <button
                type="button"
                className="primary-button primary-button-hero download-install-button"
                onClick={() => void handleInstall()}
                disabled={installing}
              >
                {installing
                  ? 'Opening installer…'
                  : installState === 'installed'
                    ? 'Explore Mapshroom Pro beta'
                    : 'Install Mapshroom web app'}
              </button>
              {installMessage ? (
                <p className="download-actions-message">{installMessage}</p>
              ) : null}
              {installState === 'manual' ? (
                <p className="download-actions-note download-actions-note-prominent">
                  {getManualInstallHint(platform)}
                </p>
              ) : null}
            </section>
          )}

          {(showWebInstall || !isDesktop) && isDesktop ? (
            <section className="download-actions" aria-label="Install web app">
              <button
                type="button"
                className="secondary-button primary-button-hero download-install-button"
                onClick={() => void handleInstall()}
                disabled={installing}
              >
                {installing ? 'Opening installer…' : 'Install web app instead'}
              </button>
              {installMessage ? (
                <p className="download-actions-message">{installMessage}</p>
              ) : null}
            </section>
          ) : null}

          <MapshroomShaderFooter className="download-page-footer">
            <div className="download-link-actions">
              <Link to="/privacy" className="secondary-button">
                Privacy
              </Link>
              <Link to="/beta-terms" className="secondary-button">
                Beta terms
              </Link>
              <Link to="/" className="secondary-button">
                Workspace
              </Link>
            </div>
          </MapshroomShaderFooter>
        </div>
      </main>

      <ProBetaDialog
        open={betaOpen}
        source="installed_app"
        onClose={() => setBetaOpen(false)}
      />
    </>
  );
}
