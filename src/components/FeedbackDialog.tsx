import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { growthSubmitFeedback, getTurnstileSiteKey } from '../lib/growthApi';
import { growthCopy } from '../lib/growthCopy';
import { resolveAppLocale } from '../lib/privacyCopy';
import { TurnstileWidget } from '../lib/useTurnstileToken';
import { isTauri } from '../lib/desktop';
import { isStandaloneApp } from '../lib/pwaInstall';
import { track } from '../lib/analytics';

type FeedbackDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const locale = useMemo(() => resolveAppLocale(), []);
  const copy = growthCopy(locale);
  const siteKey = useMemo(() => getTurnstileSiteKey(), []);
  const [token, setToken] = useState('');
  const resetRef = useRef<(() => void) | null>(null);
  const [category, setCategory] = useState<'bug' | 'feature' | 'praise' | 'other'>('feature');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onToken = useCallback((value: string) => setToken(value), []);
  const onReady = useCallback(() => undefined, []);
  const registerReset = useCallback((resetFn: () => void) => {
    resetRef.current = resetFn;
  }, []);

  if (!open) {
    return null;
  }

  const surface = isTauri() ? 'desktop' : isStandaloneApp() ? 'pwa' : 'web';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (siteKey && !token) {
      setError('Complete the human verification challenge.');
      return;
    }
    setBusy(true);
    track('feedback_submitted', { category, rating, surface });
    const result = await growthSubmitFeedback({
      category,
      rating,
      message,
      email: email || undefined,
      appVersion: '3.0.0',
      surface,
      route: window.location.hash || '#/',
      turnstileToken: token || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      setToken('');
      resetRef.current?.();
      return;
    }
    setDone(true);
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="dialog-panel share-dialog growth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Feedback</span>
            <h2 id="feedback-title" className="dialog-title">
              {copy.feedbackTitle}
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        {done ? (
          <>
            <div className="dialog-body">
              <div className="dialog-section" role="status">
                <p className="helper-copy">{copy.feedbackThanks}</p>
              </div>
            </div>
            <footer className="dialog-footer">
              <button type="button" className="primary-button" onClick={onClose}>
                Close
              </button>
            </footer>
          </>
        ) : (
          <form
            className="growth-dialog-form"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="dialog-body growth-form">
              <p className="dialog-note">{copy.feedbackLead}</p>

              <label className="growth-field">
                <span className="download-link-label">Category</span>
                <select
                  className="select-field"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as 'bug' | 'feature' | 'praise' | 'other')
                  }
                >
                  <option value="bug">{copy.categoryBug}</option>
                  <option value="feature">{copy.categoryFeature}</option>
                  <option value="praise">{copy.categoryPraise}</option>
                  <option value="other">{copy.categoryOther}</option>
                </select>
              </label>

              <label className="growth-field">
                <span className="download-link-label">{copy.ratingLabel}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                />
                <span className="helper-copy">{rating} / 5</span>
              </label>

              <label className="growth-field">
                <span className="download-link-label">{copy.messageLabel}</span>
                <textarea
                  className="prompt-field"
                  required
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>

              <label className="growth-field">
                <span className="download-link-label">{copy.optionalEmailLabel}</span>
                <input
                  className="text-field"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.emailPlaceholder}
                />
              </label>

              {siteKey ? (
                <TurnstileWidget
                  siteKey={siteKey}
                  onToken={onToken}
                  onReady={onReady}
                  registerReset={registerReset}
                />
              ) : null}

              {error ? <p className="growth-form-error">{error}</p> : null}
            </div>

            <footer className="dialog-footer">
              <button type="button" className="secondary-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? copy.sending : copy.feedbackSubmit}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
