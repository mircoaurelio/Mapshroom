import { useState } from 'react';
import { EmailCaptureForm } from './EmailCaptureForm';
import { track } from '../lib/analytics';

export type ProBetaSource =
  | 'asset_generate'
  | 'shader_pro_teaser'
  | 'installed_app'
  | 'export_with_music';

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

  const isMusicExportOffer = source === 'export_with_music';

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

        {hasRequestedAccess ? (
          <>
            <ProBrandLockup />
            <div className="pro-beta-confirmation" role="status" aria-live="polite">
              <div className="pro-beta-confirmation-header">
                <span className="pro-beta-confirmation-mark" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="m5.25 10.25 3.05 3.05 6.45-7.05" />
                  </svg>
                </span>
                <div>
                  <span className="panel-eyebrow">Check your email</span>
                  <small>Mapshroom Pro · Private beta</small>
                </div>
              </div>

              <div className="pro-beta-confirmation-main">
                <span className="pro-beta-confirmation-kicker">Verification sent</span>
                <h3 id="pro-beta-title">Confirm your email to join the waitlist</h3>
                <p id="pro-beta-copy">
                  We saved your interest and emailed a verification link. Confirm it to lock your
                  place on the Pro waitlist.
                </p>
              </div>

              <div className="pro-beta-confirmation-footer">
                <button type="button" className="primary-button pro-beta-join" onClick={onClose}>
                  Return to workspace
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pro-beta-intro">
              <span className="panel-eyebrow">Pro private beta</span>
              <h3 id="pro-beta-title">
                {isMusicExportOffer
                  ? 'Export the show, not just the frames'
                  : 'Build the complete show in Mapshroom'}
              </h3>
              <p id="pro-beta-copy">
                {isMusicExportOffer
                  ? 'Join the Pro beta for synchronized video and music export, ready to present, share, or take to the stage.'
                  : 'Unlock audio-reactive creation, direct asset tools, and finished video exports with music in one focused workflow.'}
              </p>
            </div>

            <EmailCaptureForm
              source="pro_beta"
              variant="plain"
              onQueued={() => {
                track('pro_beta_join_requested', { source });
                setHasRequestedAccess(true);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
