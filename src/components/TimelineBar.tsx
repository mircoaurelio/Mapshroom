import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import {
  clampTimelineStepDuration,
  getShaderTimelineDuration,
  resolveShaderTimelineState,
} from '../lib/timeline';
import type {
  AssetKind,
  PlaybackTransport,
  SavedShader,
  TimelineEditorViewMode,
  TimelineSequenceMode,
  TimelineStub,
  TimelineTransitionEffect,
} from '../types';
import { ShaderTimelineEditor } from './ShaderTimelineEditor';

type TimelineBarVariant = 'desktop' | 'dialog';

interface TimelineBarProps {
  assetName: string;
  assetKind: AssetKind | null;
  assetUrl: string | null;
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
  onSequenceEditorViewChange: (editorView: TimelineEditorViewMode) => void;
  onSequenceSharedTransitionChange: (patch: {
    sharedTransitionEffect?: TimelineTransitionEffect;
    sharedTransitionDurationSeconds?: number;
  }) => void;
  onSequenceStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onAddSequenceStep: () => void;
  onRemoveSequenceStep: (stepId: string) => void;
  onMoveSequenceStep: (stepId: string, direction: -1 | 1) => void;
  onResizeSequenceBoundary: (
    leftStepId: string,
    rightStepId: string,
    leftDurationSeconds: number,
    rightDurationSeconds: number,
  ) => void;
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

interface TimelineStepSegment {
  step: TimelineStub['shaderSequence']['steps'][number];
  startRatio: number;
  endRatio: number;
}

interface BoundaryDragState {
  leftStepId: string;
  rightStepId: string;
  startX: number;
  leftDurationSeconds: number;
  rightDurationSeconds: number;
  totalDurationSeconds: number;
  trackWidth: number;
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

function getTimelineStepSegments(
  steps: TimelineStub['shaderSequence']['steps'],
): TimelineStepSegment[] {
  const totalDurationSeconds = getShaderTimelineDuration(steps);
  if (steps.length === 0 || totalDurationSeconds <= 0) {
    return [];
  }

  let cursor = 0;
  return steps.map((step) => {
    const durationSeconds = clampTimelineStepDuration(step.durationSeconds);
    const startRatio = cursor / totalDurationSeconds;
    cursor += durationSeconds;
    return {
      step,
      startRatio,
      endRatio: cursor / totalDurationSeconds,
    };
  });
}

function getSequenceSummaryCopy(sequence: TimelineStub['shaderSequence'], assetKind: AssetKind | null) {
  if (!sequence.enabled) {
    return assetKind === 'video' ? 'Video transport - asset duration' : 'Scene clock - timeline duration';
  }

  if (sequence.mode === 'randomMix') {
    return 'Random mix - shared transition and compact shader list';
  }

  if (sequence.mode === 'random') {
    return 'Random shader flow with transitions - compact editor';
  }

  return 'Sequenced shader flow with transitions - compact editor';
}

export function TimelineBar({
  assetName,
  assetKind,
  assetUrl,
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
  onSequenceEditorViewChange,
  onSequenceSharedTransitionChange,
  onSequenceStepChange,
  onAddSequenceStep,
  onRemoveSequenceStep,
  onMoveSequenceStep,
  onResizeSequenceBoundary,
  variant = 'desktop',
}: TimelineBarProps) {
  const [nowMs, setNowMs] = useState(() => performance.now());
  const [scrubValue, setScrubValue] = useState<string | null>(null);
  const dragStateRef = useRef<BoundaryDragState | null>(null);
  const stepTrackRef = useRef<HTMLDivElement | null>(null);
  const safeDurationSeconds =
    Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;

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

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const pairTotal = dragState.leftDurationSeconds + dragState.rightDurationSeconds;
      const deltaRatio = dragState.trackWidth > 0 ? (event.clientX - dragState.startX) / dragState.trackWidth : 0;
      const deltaSeconds = deltaRatio * dragState.totalDurationSeconds;
      const nextLeftDurationSeconds = Math.max(
        0.5,
        Math.min(pairTotal - 0.5, dragState.leftDurationSeconds + deltaSeconds),
      );
      const nextRightDurationSeconds = pairTotal - nextLeftDurationSeconds;

      onResizeSequenceBoundary(
        dragState.leftStepId,
        dragState.rightStepId,
        nextLeftDurationSeconds,
        nextRightDurationSeconds,
      );
    };

    const handlePointerUp = () => {
      if (!dragStateRef.current) {
        return;
      }

      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [onResizeSequenceBoundary]);

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
  const timelineState = useMemo(() => {
    if (!sequence.enabled || sequence.steps.length === 0) {
      return null;
    }

    return resolveShaderTimelineState({
      shaders: savedShaders,
      mode: sequence.mode,
      sharedTransitionEffect: sequence.sharedTransitionEffect,
      sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
      steps: sequence.steps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
    });
  }, [
    savedShaders,
    sequence.enabled,
    sequence.mode,
    sequence.sharedTransitionDurationSeconds,
    sequence.sharedTransitionEffect,
    sequence.steps,
    transport.loop,
    transportTimeSeconds,
  ]);
  const stepSegments = useMemo(() => getTimelineStepSegments(sequence.steps), [sequence.steps]);
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

  const beginBoundaryDrag = (
    event: ReactMouseEvent<HTMLButtonElement>,
    leftSegment: TimelineStepSegment,
    rightSegment: TimelineStepSegment,
  ) => {
    const trackWidth = stepTrackRef.current?.clientWidth ?? 0;
    if (trackWidth <= 0) {
      return;
    }

    dragStateRef.current = {
      leftStepId: leftSegment.step.id,
      rightStepId: rightSegment.step.id,
      startX: event.clientX,
      leftDurationSeconds: clampTimelineStepDuration(leftSegment.step.durationSeconds),
      rightDurationSeconds: clampTimelineStepDuration(rightSegment.step.durationSeconds),
      totalDurationSeconds: getShaderTimelineDuration(sequence.steps),
      trackWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className={`timeline-bar timeline-bar-${variant}`}>
      <div className="timeline-bar-header">
        <div className="timeline-bar-meta">
          <span className="timeline-bar-label">Timeline</span>
          <strong className="timeline-bar-title">{assetName}</strong>
          <span className="timeline-bar-copy">{getSequenceSummaryCopy(sequence, assetKind)}</span>
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

      {sequence.enabled && stepSegments.length > 0 ? (
        <div className="timeline-segment-track-shell">
          <div className="timeline-segment-track" ref={stepTrackRef}>
            {stepSegments.map((segment) => {
              const shaderName =
                savedShaders.find((shader) => shader.id === segment.step.shaderId)?.name ?? 'Shader';
              const isCurrent = timelineState?.currentStep.id === segment.step.id;
              const isNext =
                timelineState?.isTransitioning && timelineState.nextStep?.id === segment.step.id;

              return (
                <div
                  key={segment.step.id}
                  className={`timeline-segment-block ${
                    isCurrent ? 'timeline-segment-block-current' : ''
                  } ${isNext ? 'timeline-segment-block-next' : ''}`}
                  style={{
                    left: `${segment.startRatio * 100}%`,
                    width: `${Math.max(0.8, (segment.endRatio - segment.startRatio) * 100)}%`,
                  }}
                  title={`${shaderName} - ${segment.step.durationSeconds.toFixed(1)}s`}
                >
                  <span>{shaderName}</span>
                </div>
              );
            })}

            {stepSegments.slice(0, -1).map((segment, index) => {
              const nextSegment = stepSegments[index + 1];
              const leftShaderName =
                savedShaders.find((shader) => shader.id === segment.step.shaderId)?.name ?? 'Left';
              const rightShaderName =
                savedShaders.find((shader) => shader.id === nextSegment.step.shaderId)?.name ?? 'Right';

              return (
                <button
                  key={`${segment.step.id}:${nextSegment.step.id}`}
                  type="button"
                  className="timeline-segment-pin"
                  aria-label={`Resize ${leftShaderName} and ${rightShaderName}`}
                  title={`Resize ${leftShaderName} and ${rightShaderName}`}
                  style={{ left: `${segment.endRatio * 100}%` }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    beginBoundaryDrag(event, segment, nextSegment);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {!sequence.enabled ? (
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
      ) : null}

      <ShaderTimelineEditor
        assetKind={assetKind}
        assetUrl={assetUrl}
        savedShaders={savedShaders}
        activeShaderId={activeShaderId}
        activeStepId={timelineState?.currentStep.id ?? null}
        transitionStepId={
          timelineState?.isTransitioning ? timelineState.nextStep?.id ?? null : null
        }
        sequence={sequence}
        totalDurationSeconds={durationSeconds}
        onEnabledChange={onSequenceEnabledChange}
        onModeChange={onSequenceModeChange}
        onEditorViewChange={onSequenceEditorViewChange}
        onSharedTransitionChange={onSequenceSharedTransitionChange}
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
