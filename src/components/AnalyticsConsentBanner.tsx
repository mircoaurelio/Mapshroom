import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from '../lib/analytics';

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());

  if (consent !== null) {
    return null;
  }

  return (
    <div className="analytics-consent-banner" role="dialog" aria-label="Analytics consent">
      <div className="analytics-consent-copy">
        <strong>Optional usage analytics</strong>
        <p>
          Help improve Mapshroom with anonymous product analytics (features used, return visits,
          country). Creative content, prompts, and API keys stay on your device. Details in the{' '}
          <Link to="/privacy">Privacy</Link> note.
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
          Decline
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            grantAnalyticsConsent();
            setConsent('granted');
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
