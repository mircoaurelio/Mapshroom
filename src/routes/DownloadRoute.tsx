import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapshroomShaderFooter } from '../components/MapshroomShaderFooter';
import { EmailCaptureForm } from '../components/EmailCaptureForm';
import { getAnalyticsConsent, track, trackAppOpen, trackUiClick } from '../lib/analytics';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';

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

export function DownloadRoute() {
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const [desktopStep, setDesktopStep] = useState<DesktopStep>('cta');
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

  const startDesktopEmail = () => {
    trackUiClick('desktop_download_start');
    setDesktopStep('email');
  };

  return (
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
                <Link to="/" className="ghost-button download-secondary-link">
                  {copy.stayOnline}
                </Link>
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
          <section className="download-actions" aria-label="Open Mapshroom">
            <p className="helper-copy">{copy.onlineLead}</p>
            <Link to="/" className="primary-button primary-button-hero download-install-button">
              {copy.stayOnline}
            </Link>
          </section>
        )}

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
  );
}
