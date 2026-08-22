import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmailCaptureForm } from '../components/EmailCaptureForm';
import {
  growthDeleteAccount,
  growthSession,
  growthSetPreferences,
  type PublicGrowthUser,
} from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { track } from '../lib/analytics';

export function ProfileRoute() {
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const [user, setUser] = useState<PublicGrowthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('download-page-active');
    void growthSession().then((result) => {
      setLoading(false);
      if (result.ok) {
        setUser(result.data.user);
      }
    });
    return () => document.body.classList.remove('download-page-active');
  }, []);

  const toggleMarketing = async (next: boolean) => {
    const result = await growthSetPreferences({ marketingOptIn: next });
    if (result.ok) {
      setUser(result.data.user);
      track('newsletter_preference_changed', { marketing_opt_in: next });
      setMessage(next ? 'Newsletter preference saved.' : 'Unsubscribed from marketing emails.');
    } else {
      setMessage(result.error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your Mapshroom email profile? This cannot be undone.')) {
      return;
    }
    const result = await growthDeleteAccount();
    if (result.ok) {
      setUser(null);
      track('profile_deleted');
      setMessage('Profile deleted.');
    } else {
      setMessage(result.error.message);
    }
  };

  return (
    <main className="download-page growth-page">
      <div className="download-page-inner">
        <header className="download-page-header">
          <Link to="/" className="download-page-back">
            ← Workspace
          </Link>
          <p className="download-page-kicker">Mapshroom</p>
          <h1 className="download-page-title">{copy.profileTitle}</h1>
          <p className="download-page-lead">{copy.profileLead}</p>
        </header>

        {message ? <p className="download-actions-message">{message}</p> : null}
        {loading ? <p className="helper-copy">Loading…</p> : null}

        {!loading && !user ? (
          <section className="download-actions">
            <EmailCaptureForm source="profile_register" />
          </section>
        ) : null}

        {user ? (
          <section className="download-status-grid" aria-label="Profile">
            <div className="download-status-card">
              <span className="download-status-label">Email</span>
              <strong className="download-status-value">{user.emailMasked}</strong>
              <p className="download-status-hint">
                {user.verified ? 'Verified passwordless profile' : 'Awaiting verification'}
              </p>
            </div>
            <div className="download-status-card">
              <span className="download-status-label">Newsletter</span>
              <strong className="download-status-value">
                {user.marketingConfirmed || user.marketingOptIn ? 'On' : 'Off'}
              </strong>
              <div className="download-link-actions growth-profile-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void toggleMarketing(!user.marketingOptIn)}
                >
                  {user.marketingOptIn ? 'Unsubscribe' : 'Subscribe'}
                </button>
                <button type="button" className="secondary-button" onClick={() => void handleDelete()}>
                  Delete profile
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
