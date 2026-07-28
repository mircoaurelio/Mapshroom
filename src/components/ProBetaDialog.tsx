import { useState } from 'react';
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

  const handleJoin = () => {
    track('pro_beta_join_requested', { source });
    setHasRequestedAccess(true);
  };
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
          </>
        ) : (
          <>
            <div className="pro-beta-share-card" aria-hidden="true">
              <div className="pro-beta-share-card-mark">
                <img
                  src={`${import.meta.env.BASE_URL}assets/icons/mapshroom-icon-transparent-512.png`}
                  alt=""
                />
              </div>
              <div className="pro-beta-share-card-copy">
                <div className="pro-beta-share-card-name">
                  <strong>Mapshroom</strong>
                  <span>Pro</span>
                </div>
                <p>Projection mapping studio</p>
                <i />
                <small>
                  {isMusicExportOffer
                    ? 'Export motion and music in sync'
                    : 'Create, animate and perform in one workspace'}
                </small>
              </div>
              <div className="pro-beta-share-card-output">
                <span className="pro-beta-share-card-wave">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Video + Audio</strong>
              </div>
            </div>

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
              <div className="pro-beta-value-line" aria-label="Pro beta availability">
                <span aria-hidden="true" />
                Limited private beta access
              </div>
            </div>

            <div className="pro-beta-feature-grid" aria-label="Mapshroom Pro beta features">
              <article>
                <span>01</span>
                <strong>Move with the music</strong>
                <small>Map bass, mids, highs, beats, and tempo to the visuals.</small>
              </article>
              <article>
                <span>02</span>
                <strong>Export video + music</strong>
                <small>Deliver one synchronized performance file from your timeline.</small>
              </article>
              <article>
                <span>03</span>
                <strong>Keep the creative flow</strong>
                <small>Generate, edit, map, and finish without switching tools.</small>
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
                {isMusicExportOffer ? 'Unlock music export' : 'Join the beta'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
