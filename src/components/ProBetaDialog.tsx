import { useState } from 'react';
import { track } from '../lib/analytics';

export type ProBetaSource = 'asset_generate' | 'shader_pro_teaser' | 'offline_tutorial';

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
  const isOfflineTutorial = source === 'offline_tutorial';

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
            <div className="pro-beta-confirmation-header">
              <span className="pro-beta-confirmation-mark" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="m5.25 10.25 3.05 3.05 6.45-7.05" />
                </svg>
              </span>
              <div>
                <span className="panel-eyebrow">Request registered</span>
                <small>Mapshroom Pro · Private beta</small>
              </div>
            </div>

            <div className="pro-beta-confirmation-main">
              <span className="pro-beta-confirmation-kicker">Next access window</span>
              <h3 id="pro-beta-title">Your beta window opens tomorrow</h3>
              <p id="pro-beta-copy">
                Your interest is saved. We release a limited number of Pro seats each day to keep
                onboarding focused and support responsive. Return tomorrow to check availability.
              </p>
            </div>

            <div className="pro-beta-confirmation-meta" aria-label="Beta request summary">
              <article>
                <span>Availability</span>
                <strong>Tomorrow</strong>
              </article>
              <article>
                <span>Release</span>
                <strong>Limited seats</strong>
              </article>
              <article>
                <span>Request</span>
                <strong>Saved</strong>
              </article>
            </div>

            <div className="pro-beta-confirmation-footer">
              <p>No additional action is required today.</p>
              <button type="button" className="primary-button pro-beta-join" onClick={onClose}>
                Return to workspace
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pro-beta-intro">
              <span className="panel-eyebrow">Closed beta</span>
              <h3 id="pro-beta-title">
                {isOfflineTutorial
                  ? 'Get the Mapshroom offline tutorial'
                  : 'Modify directly in Mapshroom'}
              </h3>
              <p id="pro-beta-copy">
                {isOfflineTutorial
                  ? 'Join the Pro beta for guided offline setup and early access to the offline-ready Mapshroom experience.'
                  : 'Join the Pro beta to generate and edit assets inside the app—without downloading, switching tools, or uploading them again.'}
              </p>
            </div>

            <div className="pro-beta-feature-grid" aria-label="Mapshroom Pro beta features">
              <article>
                <span>01</span>
                <strong>{isOfflineTutorial ? 'Guided setup' : 'Generate in place'}</strong>
                <small>
                  {isOfflineTutorial
                    ? 'Follow a focused walkthrough built for your device and browser.'
                    : 'Create new visual material beside your mapping canvas.'}
                </small>
              </article>
              <article>
                <span>02</span>
                <strong>{isOfflineTutorial ? 'Readiness check' : 'Edit directly'}</strong>
                <small>
                  {isOfflineTutorial
                    ? 'Confirm every required app resource is ready before disconnecting.'
                    : 'Ask for changes and keep the result in the active project.'}
                </small>
              </article>
              <article>
                <span>03</span>
                <strong>{isOfflineTutorial ? 'Offline launch' : 'Keep your flow'}</strong>
                <small>
                  {isOfflineTutorial
                    ? 'Learn how to launch and verify Mapshroom without a connection.'
                    : 'Skip the download, external editor, and reupload loop.'}
                </small>
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
                {isOfflineTutorial ? 'Join offline beta' : 'Join the beta'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
