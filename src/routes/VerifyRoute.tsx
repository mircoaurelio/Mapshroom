import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  growthConfirmVerify,
  growthIssueDownloadGrant,
  growthPeekVerify,
} from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { identifyGrowthUser, track } from '../lib/analytics';

type VerifyStatus = 'loading' | 'ready' | 'invalid' | 'expired' | 'consumed' | 'verified';

export function VerifyRoute() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const [status, setStatus] = useState<VerifyStatus>(() => (token ? 'loading' : 'invalid'));
  const [busy, setBusy] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('download-page-active');
    return () => document.body.classList.remove('download-page-active');
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    void growthPeekVerify(token).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setStatus('invalid');
        return;
      }
      setStatus(result.data.status);
      track('email_verify_viewed', { status: result.data.status });
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    const result = await growthConfirmVerify(token);
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
      setDownloadUrl(`/api/download?grant=${encodeURIComponent(result.data.downloadGrant)}`);
      track('download_ready', { source: result.data.user.source });
    } else if (result.data.user.verified) {
      const grant = await growthIssueDownloadGrant();
      if (grant.ok) {
        setDownloadUrl(grant.data.downloadUrl);
      }
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

          {status === 'verified' && downloadUrl ? (
            <a
              className="primary-button primary-button-hero download-install-button"
              href={downloadUrl}
              onClick={() => track('download_clicked', { surface: 'verify_page' })}
            >
              {copy.downloadCta}
            </a>
          ) : null}

          {status === 'expired' || status === 'invalid' ? (
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
