interface PlaybackControlsProps {
  canNavigate: boolean;
  hasTimeline: boolean;
  isEditing: boolean;
  isFocused: boolean;
  isPlaying: boolean;
  primaryActionLabel?: string;
  onFocusToggle: () => void;
  onNext: () => void;
  onPlayToggle: () => void;
  onPrevious: () => void;
}

function FocusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 3H4a1 1 0 0 0-1 1v3M13 3h3a1 1 0 0 1 1 1v3M7 17H4a1 1 0 0 1-1-1v-3M13 17h3a1 1 0 0 0 1-1v-3" />
      <circle cx="10" cy="10" r="2.25" />
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 5.25v9.5L14.5 10Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.25 5.25v9.5M12.75 5.25v9.5" />
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
  isEditing,
  isFocused,
  isPlaying,
  primaryActionLabel,
  onFocusToggle,
  onNext,
  onPlayToggle,
  onPrevious,
}: PlaybackControlsProps) {
  const focusLabel =
    isFocused || isEditing ? 'Return to full timeline' : 'Focus current shader';
  const playLabel = primaryActionLabel ?? (isPlaying ? 'Pause timeline' : 'Play timeline');

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
        className="playback-control-button playback-control-primary"
        aria-label={playLabel}
        title={playLabel}
        onClick={onPlayToggle}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <button
        type="button"
        className={`playback-control-button playback-control-mode ${
          isFocused ? 'playback-control-active' : ''
        } ${isEditing ? 'playback-control-editing' : ''}`}
        disabled={!hasTimeline}
        aria-label={focusLabel}
        aria-pressed={isFocused || isEditing}
        title={focusLabel}
        onClick={onFocusToggle}
      >
        <FocusIcon />
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
