import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { useTimelineToolbarLayout } from '../lib/useTimelineToolbarLayout';
import { bindHorizontalWheelScroll } from '../lib/horizontalScroll';
import {
  roundTimelineSeconds,
  TIMELINE_SEQUENCE_MODE_OPTIONS,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import type { ImageTransfer } from '../lib/imageTransfer';
import { useImageDropTarget } from '../lib/useImageDropTarget';
import { hasShaderCompileError } from '../lib/shaderState';
import { ShaderThumbnail } from './ShaderThumbnail';
import { TimelinePlaybackBorder } from './TimelinePlaybackIndicators';
import { TimelineStepOverflowActions } from './TimelineStepOverflowActions';
import { TimelineDeleteConfirmation, type TimelineDeleteRequest } from './TimelineDeleteConfirmation';
import { ShuffleIcon } from './ShuffleIcon';
import { AppSelect } from './AppSelect';
import { DurationInput } from './DurationInput';
import type {
  AssetRecord,
  AssetKind,
  SavedShader,
  TimelineSequenceMode,
  TimelineStub,
} from '../types';

interface ShaderTimelineEditorProps {
  transportControls?: ReactNode;
  stageViewportRef?: RefObject<HTMLElement | null>;
  assets: AssetRecord[];
  assetKind: AssetKind | null;
  assetUrl: string | null;
  savedShaders: SavedShader[];
  activeShaderId: string;
  editingStepId: string | null;
  activeStepId: string | null;
  transitionStepId: string | null;
  pinnedStepId: string | null;
  sequence: TimelineStub['shaderSequence'];
  totalDurationSeconds: number;
  midiTimelineControlActive?: boolean;
  midiManualMixArmed?: boolean;
  audioReactiveAvailable?: boolean;
  audioReactiveListening?: boolean;
  onModeChange: (mode: TimelineSequenceMode) => void;
  onSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineStub['shaderSequence']['sharedTransitionEffect'];
    sharedTransitionDurationSeconds?: number;
    sharedSectionDurationSeconds?: number;
  }) => void;
  onStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onRandomizeStep: (stepId: string) => void;
  onPinnedStepToggle: (stepId: string) => void;
  onBrowseAssets: (stepId: string) => void;
  onDropImage: (transfer: ImageTransfer, stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onEditStep: (stepId: string) => void;
  onAddStep?: () => void;
  onAddRandomStep?: () => void;
  onReorderSteps?: (orderedStepIds: string[]) => void;
  scrollToStepRequest?: { stepId: string; token: number } | null;
  mobileCardsOnly?: boolean;
}

const MOBILE_SHADER_LONG_PRESS_MS = 420;
const MOBILE_SHADER_PRESS_MOVE_PX = 12;

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function getMobileShaderDropIndex(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-timeline-step-id]'));
  if (cards.length === 0) {
    return null;
  }

  for (let index = 0; index < cards.length; index += 1) {
    const bounds = cards[index].getBoundingClientRect();
    if (
      clientX >= bounds.left &&
      clientX <= bounds.right &&
      clientY >= bounds.top &&
      clientY <= bounds.bottom
    ) {
      return index;
    }
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  cards.forEach((card, index) => {
    const bounds = card.getBoundingClientRect();
    const offsetX = clientX - (bounds.left + bounds.width / 2);
    const offsetY = clientY - (bounds.top + bounds.height / 2);
    const distance = offsetX * offsetX + offsetY * offsetY;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function formatStepDuration(seconds: number): string {
  return `${roundTimelineSeconds(seconds).toFixed(2)}s`;
}

function getPendingAiJobCount(shader: SavedShader | null | undefined): number {
  return Math.max(0, shader?.pendingAiJobCount ?? 0);
}

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="6" y="5" width="7" height="8" rx="1.2" />
      <path d="M4.5 10.5H4A1.5 1.5 0 0 1 2.5 9V4A1.5 1.5 0 0 1 4 2.5h5A1.5 1.5 0 0 1 10.5 4v0.5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 4.5h9" />
      <path d="M6 2.75h4" />
      <path d="M5 4.5v7.25A1.25 1.25 0 0 0 6.25 13h3.5A1.25 1.25 0 0 0 11 11.75V4.5" />
      <path d="M6.75 6.5v4" />
      <path d="M9.25 6.5v4" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" />
      <path d="M4.7 11.3 11.3 4.7" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2v6" />
      <path d="M4.5 3.8a5.25 5.25 0 1 0 7 0" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.1 3.1h5.8" />
      <path d="m10.4 3.3-.9 3.1 2 1.9H4.5l2-1.9-.9-3.1" />
      <path d="M8 8.3v4.6" />
      <path d="M6.8 12.9h2.4" />
    </svg>
  );
}

function ImageAssetIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.25" y="3.25" width="11.5" height="9.5" rx="1.6" />
      <circle cx="5.2" cy="6" r="1.1" />
      <path d="m4 11 2.6-2.8 2.05 2.05 1.65-1.75L12 11" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.3 14 13H2Z" />
      <path d="M8 5.5v3.6" />
      <path d="M8 11.15h0.01" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 5.25h10" />
      <path d="M3 8h10" />
      <path d="M3 10.75h10" />
    </svg>
  );
}

function DisabledShaderCard({ shader, stepId, onEnable }: {
  shader: SavedShader | undefined;
  stepId: string;
  onEnable: () => void;
}) {
  return (
    <article
      className="timeline-step-card timeline-step-card-disabled"
      data-timeline-step-id={stepId}
      data-preview-shader-id={shader?.id}
    >
      <button
        type="button"
        className="timeline-step-select timeline-step-restore"
        aria-label={`Enable ${shader?.name ?? 'shader'}`}
        title={`Enable ${shader?.name ?? 'shader'}`}
        onClick={onEnable}
      >
        <span className="timeline-step-preview-shell">
          <ShaderThumbnail shader={shader} />
          <span className="timeline-step-restore-indicator" aria-hidden="true">
            <PowerIcon />
            <span>Off</span>
          </span>
        </span>
        <span className="timeline-step-caption">
          <strong className="timeline-step-name">{shader?.name ?? 'Shader'}</strong>
        </span>
      </button>
    </article>
  );
}

export function ShaderTimelineEditor({
  transportControls,
  stageViewportRef,
  assets,
  savedShaders,
  activeShaderId,
  editingStepId,
  activeStepId,
  transitionStepId,
  pinnedStepId,
  sequence,
  totalDurationSeconds,
  midiTimelineControlActive = false,
  midiManualMixArmed = false,
  audioReactiveAvailable = false,
  audioReactiveListening = false,
  onModeChange,
  onSharedTransitionChange,
  onStepChange,
  onRandomizeStep,
  onPinnedStepToggle,
  onBrowseAssets,
  onDuplicateStep,
  onRemoveStep,
  onEditStep,
  onAddStep,
  onAddRandomStep,
  onReorderSteps,
  scrollToStepRequest = null,
  mobileCardsOnly = false,
  onDropImage,
}: ShaderTimelineEditorProps) {
  const { dropProps } = useImageDropTarget(onDropImage);
  const flowStripRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useTimelineToolbarLayout(toolbarRef, stageViewportRef);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const title =
    sequence.mode === 'audioReactive'
      ? 'Audio Sync'
      : sequence.mode === 'random'
        ? 'Random Shader Flow'
        : sequence.mode === 'double'
          ? 'Double Shader Layers'
          : 'Shader Sequence';
  const [isMobileArranging, setIsMobileArranging] = useState(false);
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<TimelineDeleteRequest | null>(null);
  const [mobileDraggingStepId, setMobileDraggingStepId] = useState<string | null>(null);
  const [mobileOrderedStepIds, setMobileOrderedStepIds] = useState<string[] | null>(null);
  const mobilePressRef = useRef<{
    pointerId: number;
    stepId: string;
    startX: number;
    startY: number;
    longPressTimer: number;
    isDragging: boolean;
    ignoreClick: boolean;
  } | null>(null);
  const mobileOrderedStepIdsRef = useRef<string[] | null>(null);
  const shaderMap = useMemo(
    () => new Map(savedShaders.map((shader) => [shader.id, shader])),
    [savedShaders],
  );
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const isAdvancedView = true;

  const enabledStepCount = sequence.steps.filter((step) => !step.disabled).length;
  const requestDelete = (stepId: string, trigger: HTMLButtonElement) => {
    const step = sequence.steps.find((item) => item.id === stepId);
    if (!step) return;
    setDeleteRequest({ stepId, trigger, bounds: trigger.getBoundingClientRect(),
      shaderName: shaderMap.get(step.shaderId)?.name ?? 'Shader' });
  };
  const deleteConfirmation = deleteRequest ? <TimelineDeleteConfirmation request={deleteRequest}
    onCancel={() => setDeleteRequest(null)} onConfirm={() => {
      const stepId = deleteRequest.stepId;
      setDeleteRequest(null);
      onRemoveStep(stepId);
    }} /> : null;
  const enableStep = (stepId: string) => {
    onStepChange(stepId, { disabled: false });
    requestAnimationFrame(() => {
      flowStripRef.current?.querySelector<HTMLButtonElement>(
        `[data-timeline-step-id="${stepId}"] .timeline-step-select`,
      )?.focus();
    });
  };
  useEffect(() => {
    const strip = flowStripRef.current;
    if (!strip) {
      return;
    }

    return bindHorizontalWheelScroll(strip);
  }, []);

  useEffect(() => {
    if (!scrollToStepRequest?.stepId) {
      return;
    }

    const stepId = scrollToStepRequest.stepId;
    let cancelled = false;
    let frameId = 0;
    let retryTimeoutId = 0;

    const scrollToStep = () => {
      if (cancelled) {
        return;
      }

      const stepElement = flowStripRef.current?.querySelector<HTMLElement>(
        `[data-timeline-step-id="${stepId}"]`,
      );
      stepElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    };

    frameId = requestAnimationFrame(() => {
      scrollToStep();
      retryTimeoutId = window.setTimeout(scrollToStep, 120);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(retryTimeoutId);
    };
  }, [scrollToStepRequest]);

  useEffect(() => {
    if (!mobileCardsOnly) {
      setIsMobileArranging(false);
      setIsMobileAddOpen(false);
      setMobileDraggingStepId(null);
      setMobileOrderedStepIds(null);
      mobileOrderedStepIdsRef.current = null;
    }
  }, [mobileCardsOnly]);

  useEffect(() => {
    if (!isMobileArranging) {
      setMobileDraggingStepId(null);
      setMobileOrderedStepIds(null);
      mobileOrderedStepIdsRef.current = null;
      return;
    }

    const liveIds = sequence.steps.map((step) => step.id);
    setMobileOrderedStepIds((current) => {
      const nextIds = current
        ? [
            ...current.filter((id) => liveIds.includes(id)),
            ...liveIds.filter((id) => !current.includes(id)),
          ]
        : liveIds;
      if (
        current &&
        current.length === nextIds.length &&
        current.every((id, index) => id === nextIds[index])
      ) {
        return current;
      }
      mobileOrderedStepIdsRef.current = nextIds;
      return nextIds;
    });
  }, [isMobileArranging, sequence.steps]);

  if (mobileCardsOnly) {
    const displaySteps = (
      isMobileArranging && mobileOrderedStepIds
        ? mobileOrderedStepIds
        : sequence.steps.map((step) => step.id)
    )
      .map((stepId) => sequence.steps.find((step) => step.id === stepId) ?? null)
      .filter((step): step is (typeof sequence.steps)[number] => step !== null);
    const finishMobilePress = (event: ReactPointerEvent<HTMLElement>, triggerEdit: boolean) => {
      const press = mobilePressRef.current;
      if (!press || press.pointerId !== event.pointerId) {
        return;
      }

      window.clearTimeout(press.longPressTimer);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const { isDragging, ignoreClick, stepId } = press;
      mobilePressRef.current = null;
      setMobileDraggingStepId(null);

      if (isDragging) {
        const orderedIds = mobileOrderedStepIdsRef.current;
        if (orderedIds && onReorderSteps) {
          onReorderSteps(orderedIds);
        }
        return;
      }

      if (triggerEdit && !isMobileArranging && !ignoreClick) {
        onEditStep(stepId);
      }
    };
    const handleCardPointerDown = (stepId: string, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget;
      const alreadyArranging = isMobileArranging;
      mobilePressRef.current = {
        pointerId: event.pointerId,
        stepId,
        startX: event.clientX,
        startY: event.clientY,
        longPressTimer: alreadyArranging
          ? 0
          : window.setTimeout(() => {
              const press = mobilePressRef.current;
              if (!press || press.stepId !== stepId) {
                return;
              }

              const initialOrder = sequence.steps.map((step) => step.id);
              mobileOrderedStepIdsRef.current = mobileOrderedStepIdsRef.current ?? initialOrder;
              setMobileOrderedStepIds(mobileOrderedStepIdsRef.current);
              setIsMobileArranging(true);
          setIsMobileAddOpen(false);
              press.isDragging = true;
              press.ignoreClick = true;
              setMobileDraggingStepId(stepId);
              if (!target.hasPointerCapture(press.pointerId)) {
                try {
                  target.setPointerCapture(press.pointerId);
                } catch {
                  /* The pointer was already released. */
                }
              }
              if (typeof navigator.vibrate === 'function') {
                navigator.vibrate(12);
              }
            }, MOBILE_SHADER_LONG_PRESS_MS),
        isDragging: alreadyArranging,
        ignoreClick: alreadyArranging,
      };

      if (alreadyArranging) {
        setMobileDraggingStepId(stepId);
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          /* The pointer was already released. */
        }
      }
    };
    const handleCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
      const press = mobilePressRef.current;
      if (!press || press.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
      if (!press.isDragging && distance > MOBILE_SHADER_PRESS_MOVE_PX) {
        window.clearTimeout(press.longPressTimer);
        mobilePressRef.current = null;
        return;
      }

      if (!press.isDragging) {
        return;
      }

      event.preventDefault();
      const grid = previewViewportRef.current;
      if (!grid) {
        return;
      }

      const dropIndex = getMobileShaderDropIndex(grid, event.clientX, event.clientY);
      if (dropIndex === null) {
        return;
      }

      const currentIds =
        mobileOrderedStepIdsRef.current ?? sequence.steps.map((step) => step.id);
      const fromIndex = currentIds.indexOf(press.stepId);
      if (fromIndex < 0) {
        return;
      }

      const nextIds = moveItem(currentIds, fromIndex, dropIndex);
      if (nextIds === currentIds) {
        return;
      }

      mobileOrderedStepIdsRef.current = nextIds;
      setMobileOrderedStepIds(nextIds);
    };

    return (
      <section
        className={`mobile-shader-sequence ${
          isMobileArranging ? 'mobile-shader-sequence-arranging' : ''
        }`}
        aria-label="Timeline shaders"
      >
        <div className="mobile-shader-sequence-heading">
          <div>
            <span>{isMobileArranging ? 'Arrange shaders' : 'Timeline shaders'}</span>
            <strong>{sequence.steps.length} cards</strong>
          </div>
          {isMobileArranging ? (
            <button
              type="button"
              className="ghost-button mobile-shader-sequence-done"
              onClick={() => {
                const orderedIds = mobileOrderedStepIdsRef.current;
                if (orderedIds && onReorderSteps) {
                  onReorderSteps(orderedIds);
                }
                setIsMobileArranging(false);
                setMobileDraggingStepId(null);
                setMobileOrderedStepIds(null);
                mobileOrderedStepIdsRef.current = null;
              }}
            >
              Done
            </button>
          ) : isMobileAddOpen ? (
            <button
              type="button"
              className="ghost-button mobile-shader-sequence-done"
              onClick={() => setIsMobileAddOpen(false)}
            >
              Cancel
            </button>
          ) : (
            <small>Tap to edit · hold to arrange</small>
          )}
        </div>
        <div
          ref={previewViewportRef}
          className="mobile-shader-card-grid"
          role="list"
        >
          {displaySteps.map((step, index) => {
            const shader = shaderMap.get(step.shaderId);
            if (step.disabled) {
              return (
                <div key={step.id} className="timeline-flow-node timeline-flow-node-disabled" role="listitem">
                  <DisabledShaderCard shader={shader} stepId={step.id} onEnable={() => enableStep(step.id)} />
                </div>
              );
            }
            const isEditing = step.id === editingStepId;
            const isCurrent = step.id === activeStepId;
            const deleteBlocked =
              sequence.steps.length === 1 || enabledStepCount <= 1;
            const isDragging = mobileDraggingStepId === step.id;

            return (
              <article
                key={step.id}
                role="listitem"
                data-timeline-step-id={step.id}
                data-preview-shader-id={shader?.id}
                {...dropProps(step.id)}
                className={`mobile-shader-sequence-card ${
                  isEditing ? 'mobile-shader-sequence-card-editing' : ''
                } ${isCurrent ? 'mobile-shader-sequence-card-current' : ''} ${
                  isDragging ? 'mobile-shader-sequence-card-dragging' : ''
                }`}
                aria-pressed={isEditing}
                onContextMenu={(event) => event.preventDefault()}
                onPointerDown={(event) => handleCardPointerDown(step.id, event)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={(event) => finishMobilePress(event, true)}
                onPointerCancel={(event) => finishMobilePress(event, false)}
              >
                <TimelinePlaybackBorder stepId={step.id} selected={isEditing} />
                <span className="mobile-shader-sequence-preview">
                  <ShaderThumbnail shader={shader} />
                  <span className="mobile-shader-sequence-index">{index + 1}</span>
                  {isEditing && !isMobileArranging ? (
                    <span className="mobile-shader-sequence-held">Editing</span>
                  ) : null}
                  {isMobileArranging ? (
                    <button
                      type="button"
                      className="mobile-shader-sequence-delete"
                      aria-label={`Delete ${shader?.name ?? `shader ${index + 1}`}`}
                      disabled={deleteBlocked}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDelete(step.id, event.currentTarget);
                      }}
                    >
                      <DeleteIcon />
                    </button>
                  ) : null}
                </span>
                <strong>{shader?.name ?? `Shader ${index + 1}`}</strong>
                {isMobileArranging ? (
                  <span className="mobile-shader-sequence-handle" aria-hidden="true">
                    <DragHandleIcon />
                  </span>
                ) : null}
              </article>
            );
          })}
          {!isMobileArranging && (onAddStep || onAddRandomStep) ? (
            isMobileAddOpen ? (
              <div
                className="mobile-shader-sequence-card mobile-shader-sequence-add mobile-shader-sequence-add-open"
                role="group"
                aria-label="Add shader"
              >
                {onAddRandomStep ? (
                  <button
                    type="button"
                    className="mobile-shader-sequence-add-action"
                    onClick={() => {
                      setIsMobileAddOpen(false);
                      onAddRandomStep();
                    }}
                  >
                    <span className="mobile-shader-sequence-add-icon" aria-hidden="true">
                      <ShuffleIcon />
                    </span>
                    <strong>Random</strong>
                    <small>From library</small>
                  </button>
                ) : null}
                {onAddStep ? (
                  <button
                    type="button"
                    className="mobile-shader-sequence-add-action"
                    onClick={() => {
                      setIsMobileAddOpen(false);
                      onAddStep();
                    }}
                  >
                    <span className="mobile-shader-sequence-add-icon" aria-hidden="true">
                      +
                    </span>
                    <strong>Select</strong>
                    <small>From library</small>
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="mobile-shader-sequence-card mobile-shader-sequence-add"
                onClick={() => setIsMobileAddOpen(true)}
              >
                <span className="mobile-shader-sequence-add-icon" aria-hidden="true">
                  +
                </span>
                <strong>Add shader</strong>
              </button>
            )
          ) : null}
        </div>
        {deleteConfirmation}
      </section>
    );
  }

  return (
    <section className="timeline-sequence-editor">
      <div ref={toolbarRef} className="timeline-sequence-toolbar">
        <div className="timeline-sequence-copy">
          <div className="timeline-sequence-title-row">
            <strong className="timeline-sequence-title">
              {title} - {sequence.steps.length} shader{sequence.steps.length === 1 ? '' : 's'} -{' '}
              {formatStepDuration(totalDurationSeconds)}
            </strong>
          </div>
        </div>

        <div className="timeline-sequence-transport">{transportControls}</div>

        <div className="timeline-sequence-toolbar-actions">
          {midiTimelineControlActive ? (
            <div
              className={`timeline-midi-control-label ${
                midiManualMixArmed
                  ? 'timeline-midi-control-label-on'
                  : 'timeline-midi-control-label-off'
              }`}
              aria-live="polite"
            >
              <span>{midiManualMixArmed ? 'MIDI Slider On' : 'MIDI Slider Off'}</span>
            </div>
          ) : null}
          <div className="timeline-shared-transition-toolbar">
            <div className="timeline-right-controls">
              <DurationInput
                className="timeline-clip-duration"
                label="Clip"
                description={sequence.mode === 'audioReactive' ? 'Minimum clip duration before an audio change.' : 'Total clip duration, including the mix.'}
                value={sequence.sharedSectionDurationSeconds}
                min={sequence.mode === 'audioReactive' ? 1 : 0.5}
                max={600}
                onCommit={(seconds) => onSharedTransitionChange({ sharedSectionDurationSeconds: seconds })}
              />

              <DurationInput
                className="timeline-mix-duration"
                label="Mix T"
                description="Mix time within each clip; cannot exceed Clip."
                value={sequence.sharedTransitionDurationSeconds}
                min={0}
                max={sequence.sharedSectionDurationSeconds}
                onCommit={(seconds) => onSharedTransitionChange({ sharedTransitionEnabled: true, sharedTransitionDurationSeconds: seconds })}
              />

              <AppSelect
                className="timeline-shared-transition-field timeline-shared-transition-field-fx timeline-mix-select"
                label="Effect"
                openOnHover
                value={sequence.sharedTransitionEffect}
                options={TIMELINE_TRANSITION_EFFECT_OPTIONS}
                onChange={(effect) =>
                  onSharedTransitionChange({
                    sharedTransitionEnabled: true,
                    sharedTransitionEffect: effect,
                  })
                }
              />

              <div className="timeline-mode-switch" role="tablist" aria-label="Timeline modes">
                {TIMELINE_SEQUENCE_MODE_OPTIONS.filter(
                  (option) =>
                    option.value !== 'audioReactive' ||
                    audioReactiveAvailable ||
                    sequence.mode === 'audioReactive',
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={sequence.mode === option.value}
                    className={`timeline-mode-button ${
                      sequence.mode === option.value ? 'timeline-mode-button-active' : ''
                    }`}
                    title={
                      option.value === 'audioReactive'
                        ? audioReactiveListening
                          ? 'Advance shaders when the music changes section'
                          : 'Waiting for Audio Reactive capture'
                        : option.value === 'double'
                          ? 'Two overlaid shader flows using the selected effect and Mix T'
                          : undefined
                    }
                    onClick={() => onModeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div
        ref={(node) => {
          flowStripRef.current = node;
          previewViewportRef.current = node;
        }}
        className="timeline-flow-strip"
        role="list"
        aria-label="Shader timeline flow"
      >
        {sequence.steps.map((step) => {
          const shader = shaderMap.get(step.shaderId);
          if (step.disabled) {
            return (
              <div key={step.id} className="timeline-flow-node timeline-flow-node-disabled" role="listitem">
                <DisabledShaderCard shader={shader} stepId={step.id} onEnable={() => enableStep(step.id)} />
              </div>
            );
          }
          const isPlayingStep = step.id === activeStepId;
          const isTransitionStep = step.id === transitionStepId && transitionStepId !== activeStepId;
          const assignedAsset = shader?.inputAssetId ? assetMap.get(shader.inputAssetId) ?? null : null;
          const hasCompileError = hasShaderCompileError(shader);
          const hasAssignedAsset = Boolean(shader?.inputAssetId);
          const isPinnedStep = pinnedStepId === step.id;
          const disableToggleBlocked = enabledStepCount <= 1;

          return (
            <div
              className="timeline-flow-node"
              key={step.id}
              role="listitem"
            >
              <article
                className={`timeline-step-card ${step.shaderId === activeShaderId ? 'timeline-step-card-active' : ''
                  } ${isPlayingStep ? 'timeline-step-card-current' : ''} ${isTransitionStep ? 'timeline-step-card-transition' : ''
                  } ${step.id === editingStepId ? 'timeline-step-card-editing' : ''} ${!isAdvancedView ? 'timeline-step-card-simple' : ''
                  } ${isPinnedStep ? 'timeline-step-card-pinned' : ''
                  }`}
                data-timeline-step-id={step.id}
                data-preview-shader-id={shader?.id}
                {...dropProps(step.id)}
              >
                <TimelinePlaybackBorder stepId={step.id} selected={step.id === editingStepId} />
                <button
                  type="button"
                  className="timeline-step-select"
                  aria-label={`Edit ${shader?.name ?? 'shader'}`}
                  aria-pressed={step.id === editingStepId}
                  onClick={() => onEditStep(step.id)}
                >
                  <span className="timeline-step-preview-shell">
                    <ShaderThumbnail shader={shader} />
                    {isPinnedStep ||
                      hasAssignedAsset ||
                      hasCompileError ||
                      getPendingAiJobCount(shader) > 0 ||
                      shader?.hasUnreadAiResult ? (
                      <span className="timeline-step-preview-badges timeline-step-preview-badges-bottom">
                        {isPinnedStep ? (
                          <span className="timeline-step-preview-badge timeline-step-preview-badge-pinned">
                            Pin
                          </span>
                        ) : null}
                        {hasAssignedAsset ? (
                          <span
                            className="timeline-step-preview-badge timeline-step-preview-badge-pinned"
                            title={assignedAsset ? assignedAsset.name : 'Assigned asset missing'}
                          >
                            Img
                          </span>
                        ) : null}
                        {hasCompileError ? (
                          <span
                            className="timeline-step-preview-badge timeline-step-preview-badge-error"
                            title={shader?.compileError ?? 'Shader compile error'}
                          >
                            <ErrorIcon />
                          </span>
                        ) : null}
                        {getPendingAiJobCount(shader) > 0 ? (
                          <span
                            className="timeline-step-preview-badge timeline-step-preview-badge-loading"
                            aria-label="Shader update in progress"
                            title="Shader update in progress"
                          >
                            <span className="timeline-step-preview-dots" aria-hidden="true">
                              <span />
                              <span />
                            </span>
                          </span>
                        ) : null}
                        {shader?.hasUnreadAiResult ? (
                          <span className="timeline-step-preview-badge timeline-step-preview-badge-active">
                            Updated
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>

                  <span className="timeline-step-caption">
                    <strong className="timeline-step-name" title={shader?.name}>
                      {shader?.name ?? 'Shader unavailable'}
                    </strong>
                  </span>
                </button>

                <div className="timeline-step-card-actions" role="group" aria-label={`Actions for ${shader?.name ?? 'shader'}`}>
                  <button
                    type="button"
                    className={`icon-button timeline-step-action-button ${isPinnedStep ? 'timeline-step-action-button-pin-active' : ''
                      }`}
                    aria-label={isPinnedStep ? 'Unpin shader step' : 'Pin shader step'}
                    aria-pressed={isPinnedStep}
                    title={isPinnedStep ? 'Unpin compare layer' : 'Pin compare layer'}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPinnedStepToggle(step.id);
                    }}
                  >
                    <PinIcon />
                  </button>

                  <button
                    type="button"
                    className={`icon-button timeline-step-action-button ${hasAssignedAsset ? 'timeline-step-action-button-pin-active' : ''
                      }`}
                    aria-label={
                      hasAssignedAsset
                        ? `Change assigned asset for ${shader?.name ?? 'shader'}`
                        : `Assign asset to ${shader?.name ?? 'shader'}`
                    }
                    aria-pressed={hasAssignedAsset}
                    title={
                      assignedAsset
                        ? `Assigned asset: ${assignedAsset.name}`
                        : hasAssignedAsset
                          ? 'Assigned asset is unavailable on this device'
                          : 'Assign asset'
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditStep(step.id);
                      onBrowseAssets(step.id);
                    }}
                  >
                    <ImageAssetIcon />
                  </button>

                  <TimelineStepOverflowActions shaderName={shader?.name ?? 'shader'} actions={[
                    { label: 'Disable', accessibleLabel: 'Disable shader step', icon: <BlockIcon />,
                      disabled: disableToggleBlocked, onSelect: () => {
                      onStepChange(step.id, { disabled: true });
                      requestAnimationFrame(() => {
                        flowStripRef.current?.querySelector<HTMLButtonElement>(
                          `[data-timeline-step-id="${step.id}"] .timeline-step-restore`,
                        )?.focus();
                      });
                    } },
                    { label: 'Duplicate', accessibleLabel: 'Duplicate shader step', icon: <DuplicateIcon />,
                      onSelect: () => onDuplicateStep(step.id) },
                    { label: 'Randomize', accessibleLabel: 'Replace with random shader', icon: <ShuffleIcon />,
                      onSelect: () => onRandomizeStep(step.id) },
                    { label: 'Delete', accessibleLabel: 'Delete shader step', icon: <DeleteIcon />, danger: true,
                      disabled: sequence.steps.length === 1 || enabledStepCount <= 1,
                      onSelect: (trigger) => requestDelete(step.id, trigger) },
                  ]} />
                </div>
              </article>
            </div>
          );
        })}

        {onAddStep ? (
          <div className="timeline-flow-node timeline-flow-node-add" role="listitem">
            <div
              className={`timeline-step-card timeline-step-card-add ${
                !isAdvancedView ? 'timeline-step-card-simple' : ''
              }`}
              role="group"
              aria-label="Add shader"
            >
              <button
                type="button"
                className="timeline-step-add-action timeline-step-add-action-new"
                aria-label="Add a new empty shader"
                title="Create a new empty shader"
                onClick={onAddStep}
              >
                <span className="timeline-step-add-icon timeline-step-add-plus" aria-hidden="true">
                  +
                </span>
                <span className="timeline-step-add-label">New shader</span>
                <small>Empty</small>
              </button>
              {onAddRandomStep ? (
                <button
                  type="button"
                  className="timeline-step-add-action timeline-step-add-action-random"
                  aria-label="Add a random shader from presets"
                  title="Choose a random preset and add it to the timeline"
                  onClick={onAddRandomStep}
                >
                  <span className="timeline-step-add-icon" aria-hidden="true">
                    <ShuffleIcon />
                  </span>
                  <span className="timeline-step-add-label">Random preset</span>
                  <small>From library</small>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {deleteConfirmation}
    </section>
  );
}
