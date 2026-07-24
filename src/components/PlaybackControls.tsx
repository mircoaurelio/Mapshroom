interface PlaybackControlsProps {
  canNavigate: boolean;
  hasTimeline: boolean;
  isRepeatEnabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onRepeatToggle: () => void;
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

export function PlaybackControls({
  canNavigate,
  hasTimeline,
  isRepeatEnabled,
  onNext,
  onPrevious,
  onRepeatToggle,
}: PlaybackControlsProps) {
  const repeatLabel = isRepeatEnabled
    ? 'Return to full timeline'
    : 'Repeat current shader';

  return (
    <section
      className="playback-controls"
      role="group"
      aria-label="Timeline playback controls"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
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
        title={repeatLabel}
        onClick={onRepeatToggle}
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
    </section>
  );
}
