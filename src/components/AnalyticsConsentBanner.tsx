import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
  ONBOARDING_COMPLETE_EVENT,
  signalOnboardingComplete,
} from '../lib/analytics';
import { ANALYTICS_CONSENT_COPY, resolveAppLocale } from '../lib/privacyCopy';

const CONSENT_APPEAR_DELAY_MS = 900;
const NON_WORKSPACE_READY_DELAY_MS = 400;

export function AnalyticsConsentBanner() {
  const location = useLocation();
  const [consent, setConsent] = useState(() => getAnalyticsConsent());
  const [locale] = useState(() => resolveAppLocale());
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const copy = ANALYTICS_CONSENT_COPY[locale];
  const isWorkspaceRoute = location.pathname === '/';

  useEffect(() => {
    if (consent !== null) {
      return;
    }

    const markReady = () => setOnboardingReady(true);
    window.addEventListener(ONBOARDING_COMPLETE_EVENT, markReady);

    // Privacy / download / other routes have no onboarding flow.
    let fallbackId = 0;
    if (!isWorkspaceRoute) {
      fallbackId = window.setTimeout(() => {
        signalOnboardingComplete();
      }, NON_WORKSPACE_READY_DELAY_MS);
    }

    return () => {
      window.removeEventListener(ONBOARDING_COMPLETE_EVENT, markReady);
      if (fallbackId) {
        window.clearTimeout(fallbackId);
      }
    };
  }, [consent, isWorkspaceRoute]);

  useEffect(() => {
    if (consent !== null || !onboardingReady || visible) {
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
  }, [consent, onboardingReady, visible]);

  if (consent !== null || !onboardingReady) {
    return null;
  }

  return (
    <div
      className={`analytics-consent-banner ${visible ? 'analytics-consent-banner-visible' : ''}`}
      role="dialog"
      aria-label={copy.dialogLabel}
      aria-hidden={!visible}
    >
      <div className="analytics-consent-copy">
        <strong>{copy.title}</strong>
        <p>{copy.lead}</p>
        <p>{copy.ask}</p>
        <ul className="analytics-consent-list">
          {copy.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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
