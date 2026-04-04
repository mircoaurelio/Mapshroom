import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  getShaderTimelineDuration,
  roundTimelineSeconds,
  resolveShaderTimelineState,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
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
  assetKind: AssetKind | null;
  assetUrl: string | null;
  activeShaderId: string;
  savedShaders: SavedShader[];
  editingStepId: string | null;
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  durationSeconds: number;
  markers: string[];
  tracks: TimelineStub['tracks'];
  onSeek: (seconds: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onToggleSingleStepLoop: () => void;
  onToggleRandomChoice: () => void;
  onSequenceEnabledChange: (enabled: boolean) => void;
  onSequenceModeChange: (mode: TimelineSequenceMode) => void;
  onSequenceEditorViewChange: (editorView: TimelineEditorViewMode) => void;
  onSequenceSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineTransitionEffect;
    sharedTransitionDurationSeconds?: number;
  }) => void;
  onSequenceStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onSequenceDurationChange: (durationSeconds: number) => void;
  onAddSequenceStepsWithShaders: (shaderIds: string[]) => void;
  onDuplicateSequenceStep: (stepId: string) => void;
  onRemoveSequenceStep: (stepId: string) => void;
  onEditSequenceStep: (stepId: string) => void;
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

interface TimelineTransitionSegment {
  stepId: string;
  startRatio: number;
  endRatio: number;
  centerRatio: number;
  durationSeconds: number;
  effect: TimelineTransitionEffect;
}

interface BoundaryDragState {
  leftStepId: string;
  rightStepId: string;
  startX: number;
  leftDurationSeconds: number;
  rightDurationSeconds: number;
  totalDurationSeconds: number;
  trackWidth: number;
  pointerId: number;
  handleElement: HTMLButtonElement;
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

function formatTimelineDurationField(totalSeconds: number): string {
  return roundTimelineSeconds(totalSeconds).toFixed(2);
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

function getTimelineTransitionSegments({
  sequence,
  stepSegments,
}: {
  sequence: TimelineStub['shaderSequence'];
  stepSegments: TimelineStepSegment[];
}): TimelineTransitionSegment[] {
  const totalDurationSeconds = getShaderTimelineDuration(sequence.steps);
  if (stepSegments.length <= 1 || totalDurationSeconds <= 0) {
    return [];
  }

  const usesSharedTransition =
    sequence.mode === 'randomMix' || sequence.sharedTransitionEnabled;

  return stepSegments.slice(0, -1).flatMap((segment) => {
    const baseDurationSeconds = clampTimelineStepDuration(segment.step.durationSeconds);
    const effect =
      usesSharedTransition
        ? sequence.sharedTransitionEffect
        : segment.step.transitionEffect;
    const transitionDurationSeconds = clampTransitionDuration(
      baseDurationSeconds,
      usesSharedTransition
        ? sequence.sharedTransitionDurationSeconds
        : segment.step.transitionDurationSeconds,
    );

    if (transitionDurationSeconds <= 0) {
      return [];
    }

    const transitionRatio = transitionDurationSeconds / totalDurationSeconds;
    const endRatio = segment.endRatio;
    const startRatio = Math.max(segment.startRatio, endRatio - transitionRatio);

    return [
      {
        stepId: segment.step.id,
        startRatio,
        endRatio,
        centerRatio: (startRatio + endRatio) / 2,
        durationSeconds: transitionDurationSeconds,
        effect,
      },
    ];
  });
}

export function TimelineBar({
  assetKind,
  assetUrl,
  activeShaderId,
  savedShaders,
  editingStepId,
  sequence,
  transport,
  durationSeconds,
  markers,
  tracks,
  onSeek,
  onPlayToggle,
  onReset,
  onToggleSingleStepLoop,
  onToggleRandomChoice,
  onSequenceEnabledChange,
  onSequenceModeChange,
  onSequenceEditorViewChange,
  onSequenceSharedTransitionChange,
  onSequenceStepChange,
  onSequenceDurationChange,
  onAddSequenceStepsWithShaders,
  onDuplicateSequenceStep,
  onRemoveSequenceStep,
  onEditSequenceStep,
  onResizeSequenceBoundary,
  variant = 'desktop',
}: TimelineBarProps) {
  const [nowMs, setNowMs] = useState(() => performance.now());
  const [scrubValue, setScrubValue] = useState<string | null>(null);
  const [durationInputValue, setDurationInputValue] = useState<string | null>(null);
  const [activeTransitionEditorStepId, setActiveTransitionEditorStepId] = useState<string | null>(null);
  const dragStateRef = useRef<BoundaryDragState | null>(null);
  const stepTrackRef = useRef<HTMLDivElement | null>(null);
  const baseDurationSeconds =
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
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
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

    const handlePointerUp = (event?: PointerEvent | Event) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      if (
        event instanceof PointerEvent &&
        event.pointerId !== dragState.pointerId
      ) {
        return;
      }

      if (dragState.handleElement.hasPointerCapture(dragState.pointerId)) {
        dragState.handleElement.releasePointerCapture(dragState.pointerId);
      }

      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [onResizeSequenceBoundary]);

  const transportTimeSeconds = getTransportTimeSeconds(transport, nowMs);
  const timelineState = useMemo(() => {
    if (!sequence.enabled || sequence.steps.length === 0) {
      return null;
    }

    return resolveShaderTimelineState({
      shaders: savedShaders,
      mode: sequence.mode,
      focusedStepId: sequence.focusedStepId,
      singleStepLoopEnabled: sequence.singleStepLoopEnabled,
      randomChoiceEnabled: sequence.randomChoiceEnabled,
      sharedTransitionEnabled: sequence.sharedTransitionEnabled,
      sharedTransitionEffect: sequence.sharedTransitionEffect,
      sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
      steps: sequence.steps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
    });
  }, [
    savedShaders,
    sequence.enabled,
    sequence.focusedStepId,
    sequence.mode,
    sequence.randomChoiceEnabled,
    sequence.sharedTransitionEnabled,
    sequence.singleStepLoopEnabled,
    sequence.sharedTransitionDurationSeconds,
    sequence.sharedTransitionEffect,
    sequence.steps,
    transport.loop,
    transportTimeSeconds,
  ]);
  const safeDurationSeconds =
    sequence.enabled && timelineState ? timelineState.totalDurationSeconds : baseDurationSeconds;
  const visibleTimeSeconds = clampTimelineTime(
    transportTimeSeconds,
    safeDurationSeconds,
    transport.loop,
  );
  const markerStops = useMemo(
    () => getMarkerStops(markers, safeDurationSeconds),
    [markers, safeDurationSeconds],
  );
  const stepSegments = useMemo(() => getTimelineStepSegments(sequence.steps), [sequence.steps]);
  const transitionSegments = useMemo(
    () => getTimelineTransitionSegments({ sequence, stepSegments }),
    [sequence, stepSegments],
  );
  const sliderValue = scrubValue ?? String(visibleTimeSeconds);
  const durationFieldValue = durationInputValue ?? formatTimelineDurationField(safeDurationSeconds);
  const markerThresholdSeconds = Math.max(
    0.75,
    safeDurationSeconds / Math.max(markerStops.length * 10, 24),
  );
  const usesSharedTransition =
    sequence.mode === 'randomMix' || sequence.sharedTransitionEnabled;
  const activeTransitionSegment =
    activeTransitionEditorStepId
      ? transitionSegments.find((segment) => segment.stepId === activeTransitionEditorStepId) ?? null
      : null;

  useEffect(() => {
    if (!activeTransitionEditorStepId) {
      return;
    }

    const hasActiveSegment = transitionSegments.some(
      (segment) => segment.stepId === activeTransitionEditorStepId,
    );

    if (!hasActiveSegment) {
      setActiveTransitionEditorStepId(null);
    }
  }, [activeTransitionEditorStepId, transitionSegments]);

  useEffect(() => {
    if (usesSharedTransition && activeTransitionEditorStepId !== null) {
      setActiveTransitionEditorStepId(null);
    }
  }, [activeTransitionEditorStepId, usesSharedTransition]);

  const handleScrubChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTimeSeconds = Number(event.target.value);
    setScrubValue(event.target.value);
    onSeek(nextTimeSeconds);
  };

  const handleMarkerJump = (timeSeconds: number) => {
    setScrubValue(null);
    onSeek(timeSeconds);
  };

  const commitDurationInput = () => {
    if (durationInputValue === null) {
      return;
    }

    const nextDurationSeconds = Number(durationInputValue);
    setDurationInputValue(null);

    if (!Number.isFinite(nextDurationSeconds) || nextDurationSeconds <= 0) {
      return;
    }

    onSequenceDurationChange(nextDurationSeconds);
  };

  const beginBoundaryDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
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
      pointerId: event.pointerId,
      handleElement: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.blur();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className={`timeline-bar timeline-bar-${variant}`}>
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

        <div className="timeline-duration-shell">
          <span className="timeline-timecode">{formatTimelineTime(safeDurationSeconds)}</span>
          <label className="timeline-duration-field">
            <span>Length</span>
            <input
              className="text-field"
              type="number"
              min={0.5}
              step={0.01}
              value={durationFieldValue}
              onChange={(event) => setDurationInputValue(event.target.value)}
              onBlur={commitDurationInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDurationInput();
                } else if (event.key === 'Escape') {
                  setDurationInputValue(null);
                }
              }}
            />
          </label>
        </div>
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
                  data-focused={segment.step.id === sequence.focusedStepId ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: `${segment.startRatio * 100}%`,
                    width: `${Math.max(0.8, (segment.endRatio - segment.startRatio) * 100)}%`,
                  }}
                  title={`${shaderName} - ${roundTimelineSeconds(segment.step.durationSeconds).toFixed(2)}s`}
                  onClick={() => onEditSequenceStep(segment.step.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onEditSequenceStep(segment.step.id);
                    }
                  }}
                >
                  <span className="timeline-segment-block-name">{shaderName}</span>
                  <small className="timeline-segment-block-duration">
                    {roundTimelineSeconds(segment.step.durationSeconds).toFixed(2)}s
                  </small>
                </div>
              );
            })}

            {transitionSegments.map((segment) => {
              const isActive = activeTransitionEditorStepId === segment.stepId;
              const title = `${segment.effect} - ${roundTimelineSeconds(segment.durationSeconds).toFixed(2)}s`;

              return (
                <button
                  key={`transition-range:${segment.stepId}`}
                  type="button"
                  className={`timeline-transition-range timeline-transition-range-${segment.effect} ${
                    isActive ? 'timeline-transition-range-active' : ''
                  }`}
                  style={{
                    left: `${segment.startRatio * 100}%`,
                    width: `${Math.max(1.5, (segment.endRatio - segment.startRatio) * 100)}%`,
                  }}
                  title={title}
                  onClick={() => {
                    if (usesSharedTransition) {
                      return;
                    }

                    setActiveTransitionEditorStepId((currentValue) =>
                      currentValue === segment.stepId ? null : segment.stepId,
                    );
                  }}
                />
              );
            })}

            {transitionSegments.map((segment) => (
              <button
                key={`transition-pin:${segment.stepId}`}
                type="button"
                className={`timeline-transition-pin ${
                  activeTransitionEditorStepId === segment.stepId ? 'timeline-transition-pin-active' : ''
                }`}
                style={{
                  left: `${segment.endRatio * 100}%`,
                }}
                title={`${segment.effect} - ${roundTimelineSeconds(segment.durationSeconds).toFixed(2)}s`}
                onClick={() => {
                  if (usesSharedTransition) {
                    return;
                  }

                  setActiveTransitionEditorStepId((currentValue) =>
                    currentValue === segment.stepId ? null : segment.stepId,
                  );
                }}
              >
                <span className="timeline-transition-pin-label">{segment.effect}</span>
              </button>
            ))}

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
                  onPointerDown={(event) => {
                    event.preventDefault();
                    beginBoundaryDrag(event, segment, nextSegment);
                  }}
                />
              );
            })}
          </div>

          {activeTransitionSegment && !usesSharedTransition ? (
            <div
              className="timeline-transition-editor"
              style={{ left: `${Math.min(84, Math.max(16, activeTransitionSegment.endRatio * 100))}%` }}
            >
              <label className="field timeline-compact-field timeline-transition-editor-field">
                <span>Fx</span>
                <select
                  className="select-field"
                  value={
                    usesSharedTransition
                      ? sequence.sharedTransitionEffect
                      : sequence.steps.find((step) => step.id === activeTransitionSegment.stepId)
                          ?.transitionEffect ?? 'mix'
                  }
                  onChange={(event) => {
                    if (usesSharedTransition) {
                      onSequenceSharedTransitionChange({
                        sharedTransitionEffect: event.target.value as TimelineTransitionEffect,
                      });
                      return;
                    }

                    onSequenceStepChange(activeTransitionSegment.stepId, {
                      transitionEffect: event.target.value as TimelineTransitionEffect,
                    });
                  }}
                >
                  {TIMELINE_TRANSITION_EFFECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field timeline-compact-field timeline-transition-editor-field">
                <span>Mix</span>
                <input
                  className="text-field"
                  type="number"
                  min={0}
                  step={0.01}
                  value={
                    usesSharedTransition
                      ? sequence.sharedTransitionDurationSeconds
                      : sequence.steps.find((step) => step.id === activeTransitionSegment.stepId)
                          ?.transitionDurationSeconds ?? 0
                  }
                  onChange={(event) => {
                    const nextDurationSeconds = Number(event.target.value);
                    if (usesSharedTransition) {
                      onSequenceSharedTransitionChange({
                        sharedTransitionDurationSeconds: nextDurationSeconds,
                      });
                      return;
                    }

                    onSequenceStepChange(activeTransitionSegment.stepId, {
                      transitionDurationSeconds: nextDurationSeconds,
                    });
                  }}
                />
              </label>
            </div>
          ) : null}
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
        editingStepId={editingStepId}
        activeStepId={timelineState?.currentStep.id ?? null}
        transitionStepId={
          timelineState?.isTransitioning ? timelineState.nextStep?.id ?? null : null
        }
        sequence={sequence}
        totalDurationSeconds={durationSeconds}
        onEnabledChange={onSequenceEnabledChange}
        onModeChange={onSequenceModeChange}
        onEditorViewChange={onSequenceEditorViewChange}
        isPlaying={transport.isPlaying}
        onPlayToggle={onPlayToggle}
        onReset={onReset}
        onToggleSingleStepLoop={onToggleSingleStepLoop}
        onToggleRandomChoice={onToggleRandomChoice}
        onSharedTransitionChange={onSequenceSharedTransitionChange}
        onStepChange={onSequenceStepChange}
        onAddStepsWithShaders={onAddSequenceStepsWithShaders}
        onDuplicateStep={onDuplicateSequenceStep}
        onRemoveStep={onRemoveSequenceStep}
        onEditStep={onEditSequenceStep}
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
