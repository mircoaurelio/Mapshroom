import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from '../lib/analytics';
import { PRIVACY_PAGE_COPY, resolveAppLocale } from '../lib/privacyCopy';

export function PrivacyRoute() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());
  const [locale] = useState(() => resolveAppLocale());
  const copy = PRIVACY_PAGE_COPY[locale];

  const choiceLabel =
    consent === 'granted'
      ? copy.choiceGranted
      : consent === 'denied'
        ? copy.choiceDenied
        : copy.choiceNone;

  return (
    <main className="privacy-page" lang={locale}>
      <div className="privacy-page-inner">
        <p className="panel-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="helper-copy">{copy.intro}</p>

        <section className="privacy-section">
          <h2>{copy.promisesTitle}</h2>
          <ul className="privacy-list">
            {copy.promises.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{copy.analyticsTitle}</h2>
          <p className="helper-copy">
            {copy.analyticsIntroBefore}
            <strong>PostHog Cloud EU</strong>
            {copy.analyticsIntroAfter}
          </p>
          <ul className="privacy-list">
            {copy.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="helper-copy">
            {copy.neverCollectBefore}
            <strong>{copy.neverCollectEmphasis}</strong>
            {copy.neverCollectAfter}
          </p>
        </section>

        <section className="privacy-section">
          <h2>{copy.choiceTitle}</h2>
          <p className="helper-copy">{copy.choiceIntro}</p>
          <div className="analytics-consent-actions privacy-consent-actions">
            <button
              type="button"
              className={`secondary-button ${consent === 'denied' ? 'toolbar-menu-button-active' : ''}`}
              onClick={() => {
                denyAnalyticsConsent();
                setConsent('denied');
              }}
            >
              {copy.decline}
            </button>
            <button
              type="button"
              className={`primary-button ${consent === 'granted' ? 'toolbar-menu-button-active' : ''}`}
              onClick={() => {
                grantAnalyticsConsent();
                setConsent('granted');
              }}
            >
              {copy.accept}
            </button>
          </div>
          <p className="helper-copy">
            {copy.currentChoice} <strong>{choiceLabel}</strong>
          </p>
        </section>

        <section className="privacy-section">
          <h2>{copy.processorsTitle}</h2>
          <p className="helper-copy">{copy.processorsBody}</p>
        </section>

        <p className="privacy-back">
          <Link to="/" className="secondary-button">
            {copy.back}
          </Link>
        </p>
      </div>
    </main>
  );
}
