import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  growthResend,
  growthSignup,
  getTurnstileSiteKey,
  readUtmFromLocation,
  type SignupSource,
} from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { TurnstileWidget } from '../lib/useTurnstileToken';
import { track } from '../lib/analytics';

type EmailCaptureFormProps = {
  source: SignupSource;
  className?: string;
  /** `card` matches download-page cards; `plain` fits nested dialogs like Pro beta. */
  variant?: 'card' | 'plain';
  /** Shorter labels and less chrome for progressive download UX. */
  compact?: boolean;
  onQueued?: () => void;
};

export function EmailCaptureForm({
  source,
  className,
  variant = 'card',
  compact = false,
  onQueued,
}: EmailCaptureFormProps) {
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const siteKey = useMemo(() => getTurnstileSiteKey(), []);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(() => !siteKey);
  const resetRef = useRef<(() => void) | null>(null);
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utm = useMemo(() => readUtmFromLocation(), []);

  const onToken = useCallback((value: string) => setToken(value), []);
  const onReady = useCallback(() => setReady(true), []);
  const registerReset = useCallback((resetFn: () => void) => {
    resetRef.current = resetFn;
  }, []);

  const resetTurnstile = () => {
    setToken('');
    resetRef.current?.();
  };

  const submitLabel =
    source === 'newsletter'
      ? copy.submitNewsletter
      : source === 'pro_beta'
        ? copy.submitProBeta
        : source === 'profile_register'
          ? copy.submitProfile
          : compact
            ? copy.submitDownloadCompact
            : copy.submitDownload;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (siteKey && !token) {
      setError('Complete the human verification challenge.');
      return;
    }
    setBusy(true);
    track('email_capture_submitted', { source, marketing_opt_in: marketingOptIn });
    const result = await growthSignup({
      email,
      marketingOptIn,
      source,
      locale,
      turnstileToken: token || undefined,
      utm,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      resetTurnstile();
      return;
    }
    setQueued(true);
    track('email_capture_queued', { source });
    onQueued?.();
  };

  const handleResend = async () => {
    setBusy(true);
    setError(null);
    const result = await growthResend({
      email,
      locale,
      turnstileToken: token || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
    }
    resetTurnstile();
  };

  const shellClass =
    variant === 'card' ? 'download-link-card growth-form' : 'growth-form growth-form-plain';

  if (queued) {
    return (
      <div className={`${shellClass} growth-form-success ${className ?? ''}`} role="status">
        <span className="download-link-label">{copy.successTitle}</span>
        <p className="helper-copy">{compact ? copy.successBodyCompact : copy.successBody}</p>
        <div className="download-link-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => void handleResend()}
          >
            {copy.resend}
          </button>
        </div>
        {error ? <p className="growth-form-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <form
      className={`${shellClass} ${compact ? 'growth-form-compact' : ''} ${className ?? ''}`}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label className="growth-field">
        <span className="download-link-label">{copy.emailLabel}</span>
        <input
          className="text-field"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          placeholder={copy.emailPlaceholder}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <p className="helper-copy growth-legal">
        {copy.privacyNoteBefore}
        <Link to="/privacy">{copy.privacyLink}</Link>
        {copy.privacyNoteMiddle}
        <Link to="/beta-terms">{copy.betaLink}</Link>
        {copy.privacyNoteAfter}
      </p>

      {siteKey ? (
        <TurnstileWidget
          siteKey={siteKey}
          onToken={onToken}
          onReady={onReady}
          registerReset={registerReset}
        />
      ) : null}

      <label className={`growth-check-widget ${marketingOptIn ? 'growth-check-widget-on' : ''}`}>
        <span className="growth-check-control" aria-hidden="true">
          <span className="growth-check-mark" />
        </span>
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(event) => setMarketingOptIn(event.target.checked)}
        />
        <span className="growth-check-copy">
          <strong>{compact ? copy.marketingTitleCompact : copy.marketingTitle}</strong>
          <small>{compact ? copy.marketingLabelCompact : copy.marketingLabel}</small>
        </span>
      </label>

      <button
        type="submit"
        className="primary-button primary-button-hero download-install-button"
        disabled={busy || !ready}
      >
        {busy ? copy.sending : submitLabel}
      </button>
      {error ? <p className="growth-form-error">{error}</p> : null}
    </form>
  );
}
