import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PlaybackControlsProps {
  canNavigate: boolean;
  hasTimeline: boolean;
  isRepeatEnabled: boolean;
  isTimelinePlaying?: boolean;
  showRepeatFirstStep?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onRepeatToggle: () => void;
  onRepeatFirstStepDismiss?: () => void;
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.65 8A6.15 6.15 0 1 0 16 12.1" />
      <path d="M15.65 3.75V8H11.4" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.25 4.5v11" />
      <path d="m15 5.25-7 4.75 7 4.75Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M14.75 4.5v11" />
      <path d="m5 5.25 7 4.75-7 4.75Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 5 7 5-7 5Z" />
    </svg>
  );
}

export function PlaybackControls({
  canNavigate,
  hasTimeline,
  isRepeatEnabled,
  isTimelinePlaying = true,
  showRepeatFirstStep = false,
  onNext,
  onPrevious,
  onRepeatToggle,
  onRepeatFirstStepDismiss,
}: PlaybackControlsProps) {
  const repeatButtonRef = useRef<HTMLButtonElement | null>(null);
  const repeatCalloutRef = useRef<HTMLElement | null>(null);
  const repeatLabel = isRepeatEnabled
    ? 'Return to full timeline'
    : 'Repeat current shader';
  const handleRepeatClick = () => {
    if (showRepeatFirstStep) {
      onRepeatFirstStepDismiss?.();
    }
    onRepeatToggle();
  };

  useLayoutEffect(() => {
    if (!showRepeatFirstStep) {
      return;
    }

    const repeatButton = repeatButtonRef.current;
    const callout = repeatCalloutRef.current;
    if (!repeatButton || !callout) {
      return;
    }

    const positionCallout = () => {
      const repeatRect = repeatButton.getBoundingClientRect();
      const calloutRect = callout.getBoundingClientRect();
      const viewportMargin = 12;
      const gap = 12;
      const maxLeft = Math.max(
        viewportMargin,
        window.innerWidth - calloutRect.width - viewportMargin,
      );
      const left = Math.min(
        maxLeft,
        Math.max(viewportMargin, repeatRect.left - calloutRect.width * 0.16),
      );
      const fitsAbove = repeatRect.top - gap - calloutRect.height >= viewportMargin;
      const top = fitsAbove
        ? repeatRect.top - calloutRect.height - gap
        : Math.min(
            window.innerHeight - calloutRect.height - viewportMargin,
            repeatRect.bottom + gap,
          );
      const arrowLeft = Math.min(
        calloutRect.width - 28,
        Math.max(16, repeatRect.left + repeatRect.width / 2 - left - 6),
      );

      callout.style.setProperty('--repeat-callout-top', `${Math.max(viewportMargin, top)}px`);
      callout.style.setProperty('--repeat-callout-left', `${left}px`);
      callout.style.setProperty('--repeat-callout-arrow-left', `${arrowLeft}px`);
      callout.dataset.placement = fitsAbove ? 'above' : 'below';
      callout.style.visibility = 'visible';
    };

    positionCallout();
    window.addEventListener('resize', positionCallout);
    window.addEventListener('scroll', positionCallout, true);
    return () => {
      window.removeEventListener('resize', positionCallout);
      window.removeEventListener('scroll', positionCallout, true);
    };
  }, [showRepeatFirstStep]);

  return (
    <section
      className={`playback-controls ${
        showRepeatFirstStep ? 'playback-controls-guide-active' : ''
      }`}
      role="group"
      aria-label="Timeline playback controls"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={repeatButtonRef}
        type="button"
        className="playback-control-button"
        disabled={!canNavigate}
        aria-label="Previous timeline shader"
        title="Previous shader"
        onClick={onPrevious}
      >
        <PreviousIcon />
      </button>

      <button
        type="button"
        className={`playback-control-button playback-control-mode ${
          isRepeatEnabled ? 'playback-control-editing' : ''
        }`}
        disabled={!hasTimeline}
        aria-label={repeatLabel}
        aria-pressed={isRepeatEnabled}
        aria-describedby={showRepeatFirstStep ? 'repeat-first-step-description' : undefined}
        title={repeatLabel}
        onClick={handleRepeatClick}
      >
        <RepeatIcon />
      </button>

      <button
        type="button"
        className="playback-control-button"
        disabled={!canNavigate}
        aria-label="Next timeline shader"
        title="Next shader"
        onClick={onNext}
      >
        <NextIcon />
      </button>

      {showRepeatFirstStep ? createPortal(
        <aside
          ref={repeatCalloutRef}
          className="playback-repeat-callout"
          role="dialog"
          aria-labelledby="repeat-first-step-title"
          aria-describedby="repeat-first-step-description"
        >
          <span className="playback-repeat-callout-arrow" aria-hidden="true" />
          <button
            type="button"
            className="playback-repeat-callout-close"
            aria-label="Close focused repeat tip"
            onClick={onRepeatFirstStepDismiss}
          >
            ×
          </button>
          <span className="playback-repeat-callout-kicker">Focused repeat</span>
          <h2 id="repeat-first-step-title">The red border means this shader is repeating</h2>
          <p id="repeat-first-step-description">
            Mapshroom holds this shader while you edit it. Click the red repeat control to
            return to the full timeline.
          </p>

          <div className="playback-repeat-guide-flow" aria-hidden="true">
            <span className="playback-repeat-guide-step">
              <span className="playback-repeat-guide-canvas">
                <span className="playback-repeat-guide-canvas-trace" />
              </span>
              <small>Red border</small>
            </span>
            <span className="playback-repeat-guide-arrow">→</span>
            <span className="playback-repeat-guide-step">
              <span className="playback-repeat-guide-control playback-repeat-guide-control-repeat">
                <RepeatIcon />
              </span>
              <small>Click repeat</small>
            </span>
            <span className="playback-repeat-guide-arrow">→</span>
            <span className="playback-repeat-guide-step">
              <span className="playback-repeat-guide-control playback-repeat-guide-control-play">
                <PlayIcon />
              </span>
              <small>{isTimelinePlaying ? 'Timeline plays' : 'Press play'}</small>
            </span>
          </div>

          <p className="playback-repeat-callout-note">
            {isTimelinePlaying
              ? 'The timeline will continue after the highlighted shader finishes.'
              : 'The timeline is paused. Press Play in the top bar after leaving repeat.'}
          </p>
          <button
            type="button"
            className="primary-button playback-repeat-callout-cta"
            onClick={handleRepeatClick}
          >
            <RepeatIcon />
            <span>Continue full timeline</span>
          </button>
        </aside>,
        document.body,
      ) : null}
    </section>
  );
}
