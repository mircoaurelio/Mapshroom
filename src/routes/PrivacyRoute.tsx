import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from '../lib/analytics';

export function PrivacyRoute() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());

  return (
    <main className="privacy-page">
      <div className="privacy-page-inner">
        <p className="panel-eyebrow">Mapshroom Pocket</p>
        <h1>Privacy</h1>
        <p className="helper-copy">
          Mapshroom is built to keep your creative work on-device. Projects, shaders, assets, and
          API keys live in your browser storage unless you explicitly share or export them.
        </p>

        <section className="privacy-section">
          <h2>Optional usage analytics</h2>
          <p className="helper-copy">
            If you accept analytics, Mapshroom sends anonymous product events to help understand
            how the app is used. Events go through a first-party Cloudflare Worker on mapshroom.dev
            and are stored in <strong>PostHog Cloud EU</strong>.
          </p>
          <ul className="privacy-list">
            <li>Anonymous visitor ID (localStorage)</li>
            <li>Feature and button usage (for example export, share, presets)</li>
            <li>Whether an AI provider or local model is configured (not the key itself)</li>
            <li>LLM request counts (provider / success / fail — never the prompt text)</li>
            <li>App presence heartbeats while the tab is visible</li>
            <li>Country derived at the edge (not precise location)</li>
          </ul>
          <p className="helper-copy">
            We do <strong>not</strong> collect prompts, shader source, project files, API keys, or
            account emails (the app has no login).
          </p>
        </section>

        <section className="privacy-section">
          <h2>Your choice</h2>
          <p className="helper-copy">
            Analytics are off until you Accept. You can change your mind anytime below. Declining
            or withdrawing stops new events; an anonymous ID may remain in local storage until you
            clear site data.
          </p>
          <div className="analytics-consent-actions privacy-consent-actions">
            <button
              type="button"
              className={`secondary-button ${consent === 'denied' ? 'toolbar-menu-button-active' : ''}`}
              onClick={() => {
                denyAnalyticsConsent();
                setConsent('denied');
              }}
            >
              Decline analytics
            </button>
            <button
              type="button"
              className={`primary-button ${consent === 'granted' ? 'toolbar-menu-button-active' : ''}`}
              onClick={() => {
                grantAnalyticsConsent();
                setConsent('granted');
              }}
            >
              Accept analytics
            </button>
          </div>
          <p className="helper-copy">
            Current choice:{' '}
            <strong>
              {consent === 'granted' ? 'Accepted' : consent === 'denied' ? 'Declined' : 'Not chosen yet'}
            </strong>
          </p>
        </section>

        <section className="privacy-section">
          <h2>Processors</h2>
          <p className="helper-copy">
            Hosting and edge proxy: Cloudflare. Product analytics processor: PostHog (EU region).
            See their privacy documentation for processor terms.
          </p>
        </section>

        <p className="privacy-back">
          <Link to="/" className="secondary-button">
            Back to workspace
          </Link>
        </p>
      </div>
    </main>
  );
}
