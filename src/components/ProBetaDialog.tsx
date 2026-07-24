import { useState } from 'react';
import { track } from '../lib/analytics';

export type ProBetaSource = 'asset_generate' | 'shader_pro_teaser';

interface ProBetaDialogProps {
  open: boolean;
  source: ProBetaSource;
  onClose: () => void;
}

function ProBrandLockup() {
  return (
    <div className="pro-beta-brand-lockup" aria-label="Mapshroom Pro">
      <span className="pro-beta-brand-icon" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}assets/icons/mapshroom-icon-transparent-512.png`}
          alt=""
        />
      </span>
      <span className="pro-beta-brand-name">Mapshroom</span>
      <span className="pro-beta-brand-badge">Pro</span>
    </div>
  );
}

export function ProBetaDialog({ open, source, onClose }: ProBetaDialogProps) {
  const [hasRequestedAccess, setHasRequestedAccess] = useState(false);

  if (!open) {
    return null;
  }

  const handleJoin = () => {
    track('pro_beta_join_requested', { source });
    setHasRequestedAccess(true);
  };

  return (
    <div
      className="dialog-backdrop pro-beta-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`pro-beta-panel ${hasRequestedAccess ? 'pro-beta-panel-confirmed' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-beta-title"
        aria-describedby="pro-beta-copy"
      >
        <button
          type="button"
          className="pro-beta-close"
          onClick={onClose}
          aria-label="Close Mapshroom Pro beta"
          title="Close"
        >
          ×
        </button>

        <ProBrandLockup />

        {hasRequestedAccess ? (
          <div className="pro-beta-confirmation" role="status" aria-live="polite">
            <span className="pro-beta-confirmation-mark" aria-hidden="true">
              ✓
            </span>
            <span className="panel-eyebrow">Interest received</span>
            <h3 id="pro-beta-title">Come back tomorrow to join the beta</h3>
            <p id="pro-beta-copy">
              We saved your interest. Mapshroom Pro is opening a few closed-beta spots each day,
              so check back tomorrow for the next release.
            </p>
            <button type="button" className="primary-button pro-beta-join" onClick={onClose}>
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="pro-beta-intro">
              <span className="panel-eyebrow">Closed beta</span>
              <h3 id="pro-beta-title">Modify directly in Mapshroom</h3>
              <p id="pro-beta-copy">
                Join the Pro beta to generate and edit assets inside the app—without downloading,
                switching tools, or uploading them again.
              </p>
            </div>

            <div className="pro-beta-feature-grid" aria-label="Mapshroom Pro beta features">
              <article>
                <span>01</span>
                <strong>Generate in place</strong>
                <small>Create new visual material beside your mapping canvas.</small>
              </article>
              <article>
                <span>02</span>
                <strong>Edit directly</strong>
                <small>Ask for changes and keep the result in the active project.</small>
              </article>
              <article>
                <span>03</span>
                <strong>Keep your flow</strong>
                <small>Skip the download, external editor, and reupload loop.</small>
              </article>
            </div>

            <div className="pro-beta-actions">
              <button type="button" className="secondary-button" onClick={onClose}>
                Not now
              </button>
              <button
                type="button"
                className="primary-button pro-beta-join"
                onClick={handleJoin}
                autoFocus
              >
                Join the beta
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
