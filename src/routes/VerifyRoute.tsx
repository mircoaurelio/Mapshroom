import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  growthConfirmVerify,
  growthSession,
  growthPeekVerify,
} from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { identifyGrowthUser, track } from '../lib/analytics';
import { WindowsDownloadButton } from '../components/WindowsDownloadButton';

type VerifyStatus = 'loading' | 'ready' | 'invalid' | 'expired' | 'consumed' | 'verified';

export function VerifyRoute() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const [status, setStatus] = useState<VerifyStatus>(() => (token ? 'loading' : 'invalid'));
  const [busy, setBusy] = useState(false);
  const [downloadGrant, setDownloadGrant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('download-page-active');
    return () => document.body.classList.remove('download-page-active');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = token ? await growthPeekVerify(token) : null;
      if (cancelled) return;
      // A fresh link can verify a different address even if a session exists.
      if (result?.ok && result.data.status === 'ready') {
        setStatus('ready');
        return;
      }
      const session = await growthSession();
      if (cancelled) return;
      if (session.ok && session.data.user?.verified) {
        setStatus('verified');
        return;
      }
      if (cancelled) {
        return;
      }
      if (!result?.ok) {
        setStatus('invalid');
        return;
      }
      setStatus(result.data.status);
      track('email_verify_viewed', { status: result.data.status });
    })().catch(() => {
      if (!cancelled) { setStatus('invalid'); setError('Unable to check this link. Please try again.'); }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    let result;
    try {
      result = await growthConfirmVerify(token);
    } catch {
      setBusy(false);
      setError('Unable to verify right now. Please try again.');
      return;
    }
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    identifyGrowthUser(result.data.user.id);
    track('email_verified', {
      source: result.data.user.source,
      marketing_opt_in: result.data.user.marketingOptIn,
    });
    setStatus('verified');
    if (result.data.downloadGrant) {
      setDownloadGrant(result.data.downloadGrant);
      track('download_ready', { source: result.data.user.source });
    }
  };

  return (
    <main className="download-page growth-page">
      <div className="download-page-inner">
        <header className="download-page-header">
          <Link to="/download" className="download-page-back">
            ← Download
          </Link>
          <p className="download-page-kicker">Mapshroom</p>
          <h1 className="download-page-title">
            {status === 'verified' ? copy.verifySuccess : copy.verifyReadyTitle}
          </h1>
          <p className="download-page-lead">
            {status === 'ready'
              ? copy.verifyReadyBody
              : status === 'expired'
                ? copy.verifyExpired
                : status === 'consumed'
                  ? copy.verifyConsumed
                  : status === 'invalid'
                    ? copy.verifyInvalid
                    : status === 'verified'
                      ? copy.verifySuccess
                      : 'Checking verification link…'}
          </p>
        </header>

        <section className="download-actions">
          {status === 'ready' ? (
            <button
              type="button"
              className="primary-button primary-button-hero download-install-button"
              disabled={busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? copy.sending : copy.verifyConfirm}
            </button>
          ) : null}

          {status === 'verified' ? <WindowsDownloadButton initialGrant={downloadGrant} /> : null}

          {status === 'expired' || status === 'invalid' || status === 'consumed' ? (
            <Link to="/download" className="secondary-button">
              Back to download
            </Link>
          ) : null}

          {error ? <p className="growth-form-error">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
