import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ANALYTICS_CONSENT_LATER_KEY,
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
  initAnalytics,
  ONBOARDING_COMPLETE_EVENT,
  shouldOfferAnalyticsConsent,
} from '../lib/analytics';
import { ANALYTICS_CONSENT_COPY, resolveAppLocale } from '../lib/privacyCopy';
import './AnalyticsConsentBanner.css';

const CONSENT_APPEAR_DELAY_MS = 900;

function readLaterDismissed() {
  try {
    return sessionStorage.getItem(ANALYTICS_CONSENT_LATER_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLaterDismissed() {
  try {
    sessionStorage.setItem(ANALYTICS_CONSENT_LATER_KEY, '1');
  } catch {
    // Ignore storage failures.
  }
}

function detectSurface(): 'web' | 'pwa' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'web';
  }
  if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
    return 'desktop';
  }
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return standalone ? 'pwa' : 'web';
}

export function AnalyticsConsentBanner() {
  const location = useLocation();
  const [consent, setConsent] = useState(() => getAnalyticsConsent());
  const [locale] = useState(() => resolveAppLocale());
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [laterDismissed, setLaterDismissed] = useState(() => readLaterDismissed());
  const copy = ANALYTICS_CONSENT_COPY[locale];
  const offerConsent = shouldOfferAnalyticsConsent({
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    pathname: location.pathname,
    hash: `#${location.pathname}${location.search}`,
    surface: detectSurface(),
  });

  useEffect(() => {
    initAnalytics();
  }, [location.pathname]);

  useEffect(() => {
    if (consent !== null || !offerConsent || laterDismissed) {
      return;
    }

    const markReady = () => setOnboardingReady(true);
    window.addEventListener(ONBOARDING_COMPLETE_EVENT, markReady);

    return () => {
      window.removeEventListener(ONBOARDING_COMPLETE_EVENT, markReady);
    };
  }, [consent, laterDismissed, offerConsent]);

  useEffect(() => {
    if (consent !== null || !offerConsent || !onboardingReady || laterDismissed || visible) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, CONSENT_APPEAR_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [consent, laterDismissed, offerConsent, onboardingReady, visible]);

  if (consent !== null || !offerConsent || !onboardingReady || laterDismissed) {
    return null;
  }

  return (
    <div
      className={`analytics-consent-banner analytics-consent-banner-compact ${visible ? 'analytics-consent-banner-visible' : ''}`}
      role="region"
      aria-label={copy.dialogLabel}
      aria-hidden={!visible}
    >
      <div className="analytics-consent-copy">
        <strong>{copy.title}</strong>
        <p>{copy.lead}</p>
        <p>
          {copy.privacyBeforeLink}
          <Link to="/privacy">{copy.privacyLink}</Link>
          {copy.privacyAfterLink}
        </p>
      </div>
      <div className="analytics-consent-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            writeLaterDismissed();
            setLaterDismissed(true);
          }}
        >
          {copy.later}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            denyAnalyticsConsent();
            setConsent('denied');
          }}
        >
          {copy.decline}
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            grantAnalyticsConsent();
            setConsent('granted');
          }}
        >
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
