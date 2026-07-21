import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from '../lib/analytics';
import { ANALYTICS_CONSENT_COPY, resolveAppLocale } from '../lib/privacyCopy';

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());
  const [locale] = useState(() => resolveAppLocale());
  const copy = ANALYTICS_CONSENT_COPY[locale];

  if (consent !== null) {
    return null;
  }

  return (
    <div className="analytics-consent-banner" role="dialog" aria-label={copy.dialogLabel}>
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
