import { useState } from 'react';
import { growthIssueDownloadGrant } from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { track } from '../lib/analytics';

export function WindowsDownloadButton({ initialGrant }: { initialGrant?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = resolveAppLocale();
  const copy = growthCopy(locale);
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      // Get a fresh link on each click, including after a long-open tab or retry.
      const result = await growthIssueDownloadGrant();
      const url = result.ok ? result.data.downloadUrl : initialGrant
        ? `/api/download?grant=${encodeURIComponent(initialGrant)}` : null;
      if (!url) throw new Error(result.ok ? 'Download unavailable.' : result.error.message);
      const check = await fetch(url, { method: 'HEAD', credentials: 'include', cache: 'no-store' });
      if (!check.ok) throw new Error(locale === 'it'
        ? 'Download non disponibile. Riprova o richiedi un nuovo link.'
        : 'Download unavailable. Try again or request a new verification link.');
      track('download_clicked', { surface: 'download_button' });
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Download unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <>
    <button type="button" className="primary-button primary-button-hero download-install-button" disabled={busy} onClick={() => void download()}>
      {busy ? (locale === 'it' ? 'Preparazione download…' : 'Preparing download…') : copy.downloadCta}
    </button>
    {error ? <p role="alert" className="growth-form-error">{error}</p> : null}
  </>;
}
