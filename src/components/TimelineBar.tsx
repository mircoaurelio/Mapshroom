import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import type {
  AssetKind,
  PlaybackTransport,
  SavedShader,
  TimelineSequenceMode,
  TimelineStub,
} from '../types';
import { ShaderTimelineEditor } from './ShaderTimelineEditor';

type TimelineBarVariant = 'desktop' | 'dialog';

interface TimelineBarProps {
  assetName: string;
  assetKind: AssetKind | null;
  activeShaderId: string;
  savedShaders: SavedShader[];
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  durationSeconds: number;
  markers: string[];
  tracks: TimelineStub['tracks'];
  onSeek: (seconds: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onToggleLoop: () => void;
  onSequenceEnabledChange: (enabled: boolean) => void;
  onSequenceModeChange: (mode: TimelineSequenceMode) => void;
  onSequenceStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onAddSequenceStep: () => void;
  onRemoveSequenceStep: (stepId: string) => void;
  onMoveSequenceStep: (stepId: string, direction: -1 | 1) => void;
  variant?: TimelineBarVariant;
}

interface TimelineDialogProps extends Omit<TimelineBarProps, 'variant'> {
  open: boolean;
  onClose: () => void;
}

interface TimelineMarkerStop {
  label: string;
  timeSeconds: number;
  ratio: number;
}

function clampTimelineTime(
  timeSeconds: number,
  durationSeconds: number,
  loop: boolean,
): number {
  if (!Number.isFinite(timeSeconds)) {
    return 0;
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return Math.max(0, timeSeconds);
  }

  if (loop) {
    const wrapped = timeSeconds % durationSeconds;
    return wrapped >= 0 ? wrapped : wrapped + durationSeconds;
  }

  return Math.max(0, Math.min(timeSeconds, durationSeconds));
}

function formatTimelineTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getMarkerStops(markers: string[], durationSeconds: number): TimelineMarkerStop[] {
  if (markers.length === 0) {
    return [];
  }

  return markers.map((label, index) => {
    const ratio = markers.length === 1 ? 0.5 : index / (markers.length - 1);
    return {
      label,
      timeSeconds: durationSeconds * ratio,
      ratio,
    };
  });
}

export function TimelineBar({
  assetName,
  assetKind,
  activeShaderId,
  savedShaders,
  sequence,
  transport,
  durationSeconds,
  markers,
  tracks,
  onSeek,
  onPlayToggle,
  onReset,
  onToggleLoop,
  onSequenceEnabledChange,
  onSequenceModeChange,
  onSequenceStepChange,
  onAddSequenceStep,
  onRemoveSequenceStep,
  onMoveSequenceStep,
  variant = 'desktop',
}: TimelineBarProps) {
  const [nowMs, setNowMs] = useState(() => performance.now());
  const [scrubValue, setScrubValue] = useState<string | null>(null);
  const safeDurationSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : 1;

  useEffect(() => {
    if (!transport.isPlaying) {
      setNowMs(performance.now());
      return;
    }

    let frameId = 0;
    const tick = (timestamp: number) => {
      setNowMs(timestamp);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [transport.anchorTimestampMs, transport.isPlaying, transport.playbackRate]);

  const transportTimeSeconds = getTransportTimeSeconds(transport, nowMs);
  const visibleTimeSeconds = clampTimelineTime(
    transportTimeSeconds,
    safeDurationSeconds,
    transport.loop,
  );
  const markerStops = useMemo(
    () => getMarkerStops(markers, safeDurationSeconds),
    [markers, safeDurationSeconds],
  );
  const sliderValue = scrubValue ?? String(visibleTimeSeconds);
  const markerThresholdSeconds = Math.max(
    0.75,
    safeDurationSeconds / Math.max(markerStops.length * 10, 24),
  );

  const handleScrubChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTimeSeconds = Number(event.target.value);
    setScrubValue(event.target.value);
    onSeek(nextTimeSeconds);
  };

  const handleMarkerJump = (timeSeconds: number) => {
    setScrubValue(null);
    onSeek(timeSeconds);
  };

  return (
    <div className={`timeline-bar timeline-bar-${variant}`}>
      <div className="timeline-bar-header">
        <div className="timeline-bar-meta">
          <span className="timeline-bar-label">Timeline</span>
          <strong className="timeline-bar-title">{assetName}</strong>
          <span className="timeline-bar-copy">
            {sequence.enabled
              ? sequence.mode === 'random'
                ? 'Random shader flow with transitions'
                : 'Sequenced shader flow with transitions'
              : assetKind === 'video'
                ? 'Video transport'
                : 'Scene clock'}{' '}
            -{' '}
            {sequence.enabled
              ? 'simple timeline editor'
              : assetKind === 'video'
                ? 'asset duration'
                : 'timeline duration'}
          </span>
        </div>

        <div className="timeline-bar-actions">
          <button type="button" className="secondary-button" onClick={onPlayToggle}>
            {transport.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="secondary-button" onClick={onReset}>
            Reset
          </button>
          <button
            type="button"
            className={`toggle-chip ${transport.loop ? 'toggle-chip-active' : ''}`}
            onClick={onToggleLoop}
          >
            Loop
          </button>
        </div>
      </div>

      <div className="timeline-bar-scrub">
        <span className="timeline-timecode">{formatTimelineTime(Number(sliderValue))}</span>

        <div className="timeline-range-shell">
          <input
            className="timeline-range"
            type="range"
            min={0}
            max={safeDurationSeconds}
            step={0.01}
            value={sliderValue}
            aria-label="Timeline position"
            onChange={handleScrubChange}
            onMouseUp={() => setScrubValue(null)}
            onTouchEnd={() => setScrubValue(null)}
            onBlur={() => setScrubValue(null)}
          />

          {markerStops.length ? (
            <div className="timeline-range-markers" aria-hidden="true">
              {markerStops.map((marker) => (
                <span
                  key={marker.label}
                  className="timeline-range-marker"
                  style={{ left: `${marker.ratio * 100}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <span className="timeline-timecode">{formatTimelineTime(safeDurationSeconds)}</span>
      </div>

      <div className="timeline-bar-footer">
        <div className="timeline-chip-row">
          {markerStops.map((marker) => (
            <button
              key={marker.label}
              type="button"
              className={`timeline-marker-button ${
                Math.abs(visibleTimeSeconds - marker.timeSeconds) <= markerThresholdSeconds
                  ? 'timeline-marker-button-active'
                  : ''
              }`}
              onClick={() => handleMarkerJump(marker.timeSeconds)}
            >
              {marker.label}
            </button>
          ))}
        </div>

        <div className="timeline-chip-row timeline-chip-row-secondary">
          {tracks.map((track) => (
            <span key={track.id} className="timeline-track-chip">
              {track.label}
              <small>{track.type}</small>
            </span>
          ))}
        </div>
      </div>

      <ShaderTimelineEditor
        savedShaders={savedShaders}
        activeShaderId={activeShaderId}
        sequence={sequence}
        totalDurationSeconds={durationSeconds}
        onEnabledChange={onSequenceEnabledChange}
        onModeChange={onSequenceModeChange}
        onStepChange={onSequenceStepChange}
        onAddStep={onAddSequenceStep}
        onRemoveStep={onRemoveSequenceStep}
        onMoveStep={onMoveSequenceStep}
      />
    </div>
  );
}

export function TimelineDialog({
  open,
  onClose,
  ...timelineProps
}: TimelineDialogProps) {
  if (!open) {
    return null;
  }

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
        className="dialog-panel timeline-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeline-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <span className="timeline-dialog-label">Timeline</span>
            <h2 id="timeline-dialog-title" className="dialog-title">
              Transport and Markers
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body timeline-dialog-body">
          <TimelineBar {...timelineProps} variant="dialog" />
        </div>
      </section>
    </div>
  );
}
