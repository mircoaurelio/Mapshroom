import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  getShaderTimelineDuration,
  getEffectiveTimelinePlaybackSteps,
  isTimelineStepEnabled,
  roundTimelineSeconds,
  resolveShaderTimelineState,
  shouldUseSharedTransition,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import type {
  AssetRecord,
  AssetKind,
  PlaybackTransport,
  SavedShader,
  TimelineSequenceMode,
  TimelineStub,
  TimelineTransitionEffect,
} from '../types';
import { ShaderTimelineEditor } from './ShaderTimelineEditor';

type TimelineBarVariant = 'desktop' | 'dialog';

interface TimelineBarProps {
  assets: AssetRecord[];
  assetKind: AssetKind | null;
  assetUrl: string | null;
  activeShaderId: string;
  savedShaders: SavedShader[];
  editingStepId: string | null;
  pinnedStepId: string | null;
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  durationSeconds: number;
  midiTimelineControlActive?: boolean;
  midiManualMixArmed?: boolean;
  markers: string[];
  tracks: TimelineStub['tracks'];
  onSeek: (seconds: number) => void;
  onRepeatSectionSelect: (stepId: string, seconds: number) => void;
  onPlayToggle: () => void;
  onSequenceModeChange: (mode: TimelineSequenceMode) => void;
  onSequenceSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineTransitionEffect;
    sharedTransitionDurationSeconds?: number;
    sharedSectionDurationSeconds?: number;
  }) => void;
  onSequenceMixDurationChange: (mixDurationSeconds: number) => void;
  onSequenceStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onSequencePinnedStepToggle: (stepId: string) => void;
  onAssignSequenceStepAsset: (stepId: string, assetId: string | null) => void;
  onImportSequenceAsset: (stepId: string) => void;
  assetPickerRequestStepId: string | null;
  assetPickerRequestToken: number;
  onAssetPickerRequestHandled: () => void;
  onSequenceDurationChange: (durationSeconds: number) => void;
  onDuplicateSequenceStep: (stepId: string) => void;
  onRemoveSequenceStep: (stepId: string) => void;
  onEditSequenceStep: (stepId: string) => void;
  onAddSequenceStep?: () => void;
  scrollToStepRequest?: { stepId: string; token: number } | null;
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
  onMobileEqualDurationChange: (durationSeconds: number) => void;
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

interface TimelineDisplayStepSegment extends TimelineStepSegment {
  isDisabled: boolean;
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

interface TransitionDragState {
  stepId: string;
  stepStartRatio: number;
  stepEndRatio: number;
  baseDurationSeconds: number;
  totalDurationSeconds: number;
  trackWidth: number;
  trackLeft: number;
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
  const enabledSteps = steps.filter(isTimelineStepEnabled);
  const totalDurationSeconds = getShaderTimelineDuration(enabledSteps);
  if (enabledSteps.length === 0 || totalDurationSeconds <= 0) {
    return [];
  }

  let cursor = 0;
  return enabledSteps.map((step) => {
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

function getTimelineDisplayStepSegments(
  steps: TimelineStub['shaderSequence']['steps'],
): TimelineDisplayStepSegment[] {
  const totalDurationSeconds = steps.reduce(
    (total, step) => total + clampTimelineStepDuration(step.durationSeconds),
    0,
  );
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
      isDisabled: Boolean(step.disabled),
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
  const totalDurationSeconds = getShaderTimelineDuration(
    stepSegments.map((segment) => segment.step),
  );
  if (sequence.mode === 'double' || stepSegments.length <= 1 || totalDurationSeconds <= 0) {
    return [];
  }

  const usesSharedTransition =
    sequence.mode === 'randomMix' || sequence.sharedTransitionEnabled;

  return stepSegments.flatMap((segment, index) => {
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
    const endRatio = index === stepSegments.length - 1 ? 1 : segment.endRatio;
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
  assets,
  assetKind,
  assetUrl,
  activeShaderId,
  savedShaders,
  editingStepId,
  pinnedStepId,
  sequence,
  transport,
  durationSeconds,
  midiTimelineControlActive = false,
  midiManualMixArmed = false,
  markers,
  tracks,
  onSeek,
  onRepeatSectionSelect,
  onSequenceModeChange,
  onSequenceSharedTransitionChange,
  onSequenceMixDurationChange,
  onSequenceStepChange,
  onSequencePinnedStepToggle,
  onAssignSequenceStepAsset,
  onImportSequenceAsset,
  assetPickerRequestStepId,
  assetPickerRequestToken,
  onAssetPickerRequestHandled,
  onSequenceDurationChange,
  onDuplicateSequenceStep,
  onRemoveSequenceStep,
  onEditSequenceStep,
  onAddSequenceStep,
  scrollToStepRequest = null,
  onResizeSequenceBoundary,
  variant = 'desktop',
}: TimelineBarProps) {
  const [nowMs, setNowMs] = useState(() => performance.now());
  const [scrubValue, setScrubValue] = useState<string | null>(null);
  const [durationInputValue, setDurationInputValue] = useState<string | null>(null);
  const [activeTransitionEditorStepId, setActiveTransitionEditorStepId] = useState<string | null>(null);
  const dragStateRef = useRef<BoundaryDragState | null>(null);
  const transitionDragStateRef = useRef<TransitionDragState | null>(null);
  const rangeScrubActiveRef = useRef(false);
  const stepTrackRef = useRef<HTMLDivElement | null>(null);
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const baseDurationSeconds =
    Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
  const usesSharedTransition = shouldUseSharedTransition(
    sequence.mode,
    sequence.sharedTransitionEnabled,
  );

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

    const handleTransitionPointerMove = (event: PointerEvent) => {
      const dragState = transitionDragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      const cursorRatio =
        dragState.trackWidth > 0 ? (event.clientX - dragState.trackLeft) / dragState.trackWidth : 0;
      const clampedStartRatio = Math.max(
        dragState.stepStartRatio,
        Math.min(dragState.stepEndRatio, cursorRatio),
      );
      const nextDurationSeconds = clampTransitionDuration(
        dragState.baseDurationSeconds,
        (dragState.stepEndRatio - clampedStartRatio) * dragState.totalDurationSeconds,
      );

      if (usesSharedTransition) {
        onSequenceSharedTransitionChange({
          sharedTransitionDurationSeconds: nextDurationSeconds,
        });
        return;
      }

      onSequenceStepChange(dragState.stepId, {
        transitionDurationSeconds: nextDurationSeconds,
      });
    };

    const handlePointerUp = (event?: PointerEvent | Event) => {
      const dragState = dragStateRef.current;
      if (dragState) {
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
      }

      const transitionDragState = transitionDragStateRef.current;
      if (transitionDragState) {
        if (
          event instanceof PointerEvent &&
          event.pointerId !== transitionDragState.pointerId
        ) {
          return;
        }

        if (transitionDragState.handleElement.hasPointerCapture(transitionDragState.pointerId)) {
          transitionDragState.handleElement.releasePointerCapture(transitionDragState.pointerId);
        }

        transitionDragStateRef.current = null;
      }

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointermove', handleTransitionPointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointermove', handleTransitionPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [onResizeSequenceBoundary, onSequenceSharedTransitionChange, onSequenceStepChange, usesSharedTransition]);

  const transportTimeSeconds = getTransportTimeSeconds(transport, nowMs);
  const playbackDisplaySteps = useMemo(
    () =>
      getEffectiveTimelinePlaybackSteps({
        mode: sequence.mode,
        randomChoiceEnabled: sequence.randomChoiceEnabled,
        steps: sequence.steps,
        sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
        sharedTransitionEnabled: sequence.sharedTransitionEnabled,
        sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
        pinnedStepId,
      }),
    [
      pinnedStepId,
      sequence.mode,
      sequence.randomChoiceEnabled,
      sequence.sharedSectionDurationSeconds,
      sequence.sharedTransitionEnabled,
      sequence.sharedTransitionDurationSeconds,
      sequence.steps,
    ],
  );
  const timelineState = useMemo(() => {
    if (playbackDisplaySteps.length === 0) {
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
      sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
      steps: playbackDisplaySteps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
    });
  }, [
    playbackDisplaySteps,
    savedShaders,
    sequence.focusedStepId,
    sequence.mode,
    sequence.randomChoiceEnabled,
    sequence.sharedTransitionEnabled,
    sequence.singleStepLoopEnabled,
    sequence.sharedSectionDurationSeconds,
    sequence.sharedTransitionDurationSeconds,
    sequence.sharedTransitionEffect,
    transport.loop,
    transportTimeSeconds,
  ]);
  const safeDurationSeconds = timelineState ? timelineState.totalDurationSeconds : baseDurationSeconds;
  const stepSegments = useMemo(
    () => getTimelineStepSegments(playbackDisplaySteps),
    [playbackDisplaySteps],
  );
  const displayStepSegments = useMemo(
    () => getTimelineDisplayStepSegments(playbackDisplaySteps),
    [playbackDisplaySteps],
  );
  const repeatedDisplaySegment =
    sequence.singleStepLoopEnabled && sequence.focusedStepId
      ? stepSegments.find((segment) => segment.step.id === sequence.focusedStepId) ?? null
      : null;
  const visibleTimeSeconds =
    repeatedDisplaySegment && timelineState
      ? timelineState.stepStartSeconds + timelineState.localTimeSeconds
      : clampTimelineTime(
          transportTimeSeconds,
          safeDurationSeconds,
          transport.loop,
        );
  const markerStops = useMemo(
    () => getMarkerStops(markers, safeDurationSeconds),
    [markers, safeDurationSeconds],
  );
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

  useEffect(() => {
    if (!transport.isPlaying || scrubValue === null || rangeScrubActiveRef.current) {
      return;
    }

    setScrubValue(null);
  }, [transport.isPlaying, transportTimeSeconds, scrubValue]);

  const clearRangeScrub = () => {
    rangeScrubActiveRef.current = false;
    setScrubValue(null);
  };

  const seekTimelinePosition = (nextTimeSeconds: number) => {
    const boundedTimeSeconds = Math.max(
      0,
      Math.min(safeDurationSeconds, nextTimeSeconds),
    );

    if (repeatedDisplaySegment && stepSegments.length > 0) {
      const targetRatio =
        safeDurationSeconds > 0
          ? Math.min(1, boundedTimeSeconds / safeDurationSeconds)
          : 0;
      const remainsInsideRepeatedSection =
        targetRatio >= repeatedDisplaySegment.startRatio &&
        targetRatio <= repeatedDisplaySegment.endRatio;
      if (remainsInsideRepeatedSection) {
        onSeek(boundedTimeSeconds);
        return;
      }
      const targetSegment =
        stepSegments.find(
          (segment, index) =>
            targetRatio >= segment.startRatio &&
            (targetRatio < segment.endRatio || index === stepSegments.length - 1),
        ) ?? repeatedDisplaySegment;

      if (targetSegment.step.id !== repeatedDisplaySegment.step.id) {
        onRepeatSectionSelect(targetSegment.step.id, boundedTimeSeconds);
        return;
      }
    }

    onSeek(boundedTimeSeconds);
  };

  const handleScrubChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTimeSeconds = Number(event.target.value);
    if (rangeScrubActiveRef.current) {
      setScrubValue(event.target.value);
    } else {
      setScrubValue(null);
    }
    seekTimelinePosition(nextTimeSeconds);
  };

  const handleScrubKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    handleVerticalRangeKey(event, (nextTimeSeconds) => {
      setScrubValue(null);
      seekTimelinePosition(nextTimeSeconds);
    });
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
      totalDurationSeconds: getShaderTimelineDuration(playbackDisplaySteps),
      trackWidth,
      pointerId: event.pointerId,
      handleElement: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.blur();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const beginTransitionDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    segment: TimelineTransitionSegment,
  ) => {
    const trackElement = stepTrackRef.current;
    const trackWidth = trackElement?.clientWidth ?? 0;
    const trackLeft = trackElement?.getBoundingClientRect().left ?? 0;
    const stepSegment = stepSegments.find((item) => item.step.id === segment.stepId);
    if (!trackElement || trackWidth <= 0 || !stepSegment) {
      return;
    }

    transitionDragStateRef.current = {
      stepId: segment.stepId,
      stepStartRatio: stepSegment.startRatio,
      stepEndRatio: segment.endRatio,
      baseDurationSeconds: clampTimelineStepDuration(stepSegment.step.durationSeconds),
      totalDurationSeconds: getShaderTimelineDuration(playbackDisplaySteps),
      trackWidth,
      trackLeft,
      pointerId: event.pointerId,
      handleElement: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.blur();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const durationLengthField = (
    <label className="timeline-duration-field">
      <span>Length</span>
      <input
        className="text-field"
        type="number"
        min={0.5}
        step={1}
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
  );

  return (
    <div className={`timeline-bar timeline-bar-${variant}`}>
      <div className="timeline-rail-grid">
        <div className="timeline-rail-leading">
          <span className="timeline-timecode">{formatTimelineTime(Number(sliderValue))}</span>
        </div>

        <div
          className={`timeline-range-shell ${
            repeatedDisplaySegment ? 'timeline-range-shell-repeat' : ''
          }`}
        >
          {displayStepSegments.length > 1 ? (
            <div className="timeline-range-step-overlay" aria-hidden="true">
              {displayStepSegments.slice(0, -1).map((segment, index) => {
                const nextSegment = displayStepSegments[index + 1];
                const touchesDisabledSegment =
                  Boolean(segment?.isDisabled) || Boolean(nextSegment?.isDisabled);

                return (
                  <span
                    key={`range-divider:${segment.step.id}`}
                    className={`timeline-range-step-divider ${
                      touchesDisabledSegment ? 'timeline-range-step-divider-disabled' : ''
                    }`}
                    style={{ left: `${segment.endRatio * 100}%` }}
                  />
                );
              })}
            </div>
          ) : null}

          {repeatedDisplaySegment ? (
            <span
              className="timeline-range-repeat-window"
              aria-hidden="true"
              style={{
                left: `${repeatedDisplaySegment.startRatio * 100}%`,
                width: `${Math.max(
                  0.8,
                  (repeatedDisplaySegment.endRatio - repeatedDisplaySegment.startRatio) * 100,
                )}%`,
              }}
            />
          ) : null}

          <input
            className={`timeline-range ${
              repeatedDisplaySegment ? 'timeline-range-repeated-section' : ''
            }`}
            type="range"
            min={0}
            max={safeDurationSeconds}
            step={0.01}
            value={sliderValue}
            aria-label={
              repeatedDisplaySegment
                ? 'Repeated shader section position'
                : 'Timeline position'
            }
            onPointerDown={() => {
              rangeScrubActiveRef.current = true;
            }}
            onChange={handleScrubChange}
            onKeyDown={handleScrubKeyDown}
            onPointerUp={clearRangeScrub}
            onPointerCancel={clearRangeScrub}
            onBlur={clearRangeScrub}
          />

          {markerStops.length && displayStepSegments.length === 0 ? (
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

        {displayStepSegments.length === 0 ? (
          <div className="timeline-duration-shell">
            <span className="timeline-timecode">{formatTimelineTime(safeDurationSeconds)}</span>
            {durationLengthField}
          </div>
        ) : null}

        {displayStepSegments.length > 0 ? (
          <div className="timeline-duration-shell timeline-duration-shell-track timeline-duration-shell-track-left">
            {durationLengthField}
          </div>
        ) : null}

        {displayStepSegments.length > 0 ? (
          <div className="timeline-segment-track-shell">
          <div className="timeline-segment-track" ref={stepTrackRef}>
            {displayStepSegments.map((segment) => {
              const shader =
                savedShaders.find((savedShader) => savedShader.id === segment.step.shaderId) ?? null;
              const shaderName = shader?.name ?? 'Shader';
              const assignedAsset = shader?.inputAssetId
                ? assetMap.get(shader.inputAssetId) ?? null
                : null;
              const hasAssignedAsset = Boolean(shader?.inputAssetId);
              const isCurrent = !segment.isDisabled && timelineState?.currentStep.id === segment.step.id;
              const isEditing = segment.step.id === editingStepId;
              const isNext =
                !segment.isDisabled &&
                timelineState?.isTransitioning &&
                timelineState.nextStep?.id === segment.step.id;

              return (
                <div
                  key={segment.step.id}
                  className={`timeline-segment-block ${
                    isCurrent ? 'timeline-segment-block-current' : ''
                  } ${isEditing ? 'timeline-segment-block-editing' : ''} ${
                    isNext ? 'timeline-segment-block-next' : ''
                  } ${segment.isDisabled ? 'timeline-segment-block-disabled' : ''}`}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: `${segment.startRatio * 100}%`,
                    width: `${Math.max(0.8, (segment.endRatio - segment.startRatio) * 100)}%`,
                  }}
                  title={`${shaderName} - ${roundTimelineSeconds(segment.step.durationSeconds).toFixed(2)}s${
                    hasAssignedAsset
                      ? ` - overlay: ${assignedAsset?.name ?? 'assigned asset missing'}`
                      : ''
                  }${segment.isDisabled ? ' - disabled' : ''}`}
                  onClick={() => onEditSequenceStep(segment.step.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onEditSequenceStep(segment.step.id);
                    }
                  }}
                >
                  <span className="timeline-segment-block-name">{shaderName}</span>
                  {hasAssignedAsset ? (
                    <small
                      className="timeline-segment-block-badge"
                      title={assignedAsset ? assignedAsset.name : 'Assigned asset missing'}
                    >
                      Img
                    </small>
                  ) : null}
                  {segment.isDisabled ? (
                    <small className="timeline-segment-block-badge timeline-segment-block-badge-disabled">
                      Off
                    </small>
                  ) : null}
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
                    setActiveTransitionEditorStepId((currentValue) =>
                      currentValue === segment.stepId ? null : segment.stepId,
                    );
                  }}
                >
                  <span className="timeline-transition-range-handle" aria-hidden="true" />
                </button>
              );
            })}

            {transitionSegments.map((segment) => (
              <button
                key={`transition-range-handle:${segment.stepId}`}
                type="button"
                className="timeline-transition-range-drag-handle"
                style={{
                  left: `${segment.startRatio * 100}%`,
                }}
                aria-label={`Adjust ${segment.effect} length`}
                title={`Adjust ${segment.effect} length`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  beginTransitionDrag(event, segment);
                }}
              />
            ))}

            {transitionSegments.map((segment) => (
              <button
                key={`transition-pin:${segment.stepId}`}
                type="button"
                className={`timeline-transition-pin ${
                  activeTransitionEditorStepId === segment.stepId ? 'timeline-transition-pin-active' : ''
                }`}
                style={{
                  left: `${Math.min(99.8, Math.max(0.2, segment.endRatio * 100))}%`,
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

            {stepSegments.map((segment, index) => {
              const nextSegment = stepSegments[index + 1];
              if (!nextSegment) {
                return null;
              }
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

          {activeTransitionSegment ? (
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
                  step={0.05}
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

                    const activeStep = sequence.steps.find(
                      (step) => step.id === activeTransitionSegment.stepId,
                    );
                    const stepDurationSeconds = clampTimelineStepDuration(
                      activeStep?.durationSeconds ?? 1,
                    );
                    onSequenceStepChange(activeTransitionSegment.stepId, {
                      transitionDurationSeconds: clampTransitionDuration(
                        stepDurationSeconds,
                        nextDurationSeconds,
                      ),
                    });
                  }}
                />
              </label>
            </div>
          ) : null}
          </div>
        ) : null}

      </div>

      {!displayStepSegments.length ? (
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
        assets={assets}
        assetKind={assetKind}
        assetUrl={assetUrl}
        savedShaders={savedShaders}
        activeShaderId={activeShaderId}
        editingStepId={editingStepId}
        activeStepId={timelineState?.currentStep.id ?? null}
        transitionStepId={
          timelineState?.isTransitioning ? timelineState.nextStep?.id ?? null : null
        }
        pinnedStepId={pinnedStepId}
        sequence={sequence}
        totalDurationSeconds={durationSeconds}
        midiTimelineControlActive={midiTimelineControlActive}
        midiManualMixArmed={midiManualMixArmed}
        onModeChange={onSequenceModeChange}
        onSharedTransitionChange={onSequenceSharedTransitionChange}
        onMixDurationChange={onSequenceMixDurationChange}
        onStepChange={onSequenceStepChange}
        onPinnedStepToggle={onSequencePinnedStepToggle}
        onAssignStepAsset={onAssignSequenceStepAsset}
        onImportAsset={onImportSequenceAsset}
        assetPickerRequestStepId={assetPickerRequestStepId}
        assetPickerRequestToken={assetPickerRequestToken}
        onAssetPickerRequestHandled={onAssetPickerRequestHandled}
        onDuplicateStep={onDuplicateSequenceStep}
        onRemoveStep={onRemoveSequenceStep}
        onEditStep={onEditSequenceStep}
        onAddStep={onAddSequenceStep}
        scrollToStepRequest={scrollToStepRequest}
      />
    </div>
  );
}

export function TimelineDialog({
  open,
  onClose,
  onMobileEqualDurationChange,
  ...timelineProps
}: TimelineDialogProps) {
  if (!open) {
    return null;
  }

  const enabledStepCount = timelineProps.sequence.steps.filter(isTimelineStepEnabled).length;
  const equalDurationSeconds = timelineProps.sequence.steps.find(isTimelineStepEnabled)?.durationSeconds ?? 8;
  const randomEnabled =
    timelineProps.sequence.mode === 'random' || timelineProps.sequence.randomChoiceEnabled;

  return (
    <div
      className="dialog-backdrop timeline-dialog-backdrop"
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
        aria-label="Timeline playback settings"
      >
        <div className="dialog-body mobile-timeline-settings">
          <p className="mobile-timeline-settings-copy">
            Every shader uses the same time. Shader previews and editing live in the Shader panel.
          </p>
          <div className="mobile-timeline-settings-grid">
            <button
              type="button"
              className={`mobile-timeline-setting-card ${randomEnabled ? 'mobile-timeline-setting-card-active' : ''}`}
              aria-pressed={randomEnabled}
              onClick={() => timelineProps.onSequenceModeChange(randomEnabled ? 'sequence' : 'random')}
            >
              <span>Order</span>
              <strong>{randomEnabled ? 'Random' : 'In order'}</strong>
              <small>{randomEnabled ? 'Picks a different card before repeating.' : 'Plays cards from first to last.'}</small>
            </button>
            <label className="mobile-timeline-setting-card mobile-timeline-duration-card">
              <span>Time per shader</span>
              <span className="mobile-timeline-duration-input">
                <input
                  type="number"
                  min={0.5}
                  max={36000}
                  step={0.5}
                  value={roundTimelineSeconds(equalDurationSeconds)}
                  onChange={(event) => onMobileEqualDurationChange(Number(event.target.value))}
                />
                <b>sec</b>
              </span>
              <small>{enabledStepCount} shaders · {formatTimelineTime(equalDurationSeconds * enabledStepCount)} total</small>
            </label>
          </div>
          <div className="mobile-timeline-transport-card">
            <div>
              <span>Playback</span>
              <strong>{timelineProps.transport.isPlaying ? 'Timeline running' : 'Timeline paused'}</strong>
            </div>
            <button type="button" className="primary-button" onClick={timelineProps.onPlayToggle}>
              {timelineProps.transport.isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
