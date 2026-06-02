import { useEffect, useMemo, useRef, useState } from 'react';
import { bindHorizontalWheelScroll } from '../lib/horizontalScroll';
import {
  roundTimelineSeconds,
  shouldUseSharedTransition,
  TIMELINE_SEQUENCE_MODE_OPTIONS,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import {
  destroyShaderPreviewRenderer,
  loadShaderPreviewSource,
  renderShaderPreviewToDataUrl,
  type ShaderPreviewRenderer,
} from '../lib/shaderPreview';
import { getAssetBlob } from '../lib/storage';
import {
  useAssetPreviewUrls,
} from '../lib/useAssetPreviewUrls';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import { getBundledAssetUrl } from '../lib/bundledAssets';
import type {
  AssetRecord,
  AssetKind,
  SavedShader,
  ShaderUniformValueMap,
  TimelineSequenceMode,
  TimelineStagePreviewMode,
  TimelineStub,
} from '../types';

const timelineEditorAssetUrlCache = new Map<string, string>();
const TIMELINE_PREVIEW_RENDER_DELAY_MS = 500;
const TIMELINE_PREVIEW_RENDER_SPACING_MS = 80;

function getUniformValuesPreviewSignature(uniformValues: ShaderUniformValueMap | undefined): string {
  return JSON.stringify(
    Object.entries(uniformValues ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

interface ShaderTimelineEditorProps {
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
  onModeChange: (mode: TimelineSequenceMode) => void;
  previewMode: TimelineStagePreviewMode;
  onPreviewModeChange: (previewMode: TimelineStagePreviewMode) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onToggleSingleStepLoop: () => void;
  onSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineStub['shaderSequence']['sharedTransitionEffect'];
    sharedTransitionDurationSeconds?: number;
    sharedSectionDurationSeconds?: number;
  }) => void;
  onMixDurationChange: (mixDurationSeconds: number) => void;
  onStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onPinnedStepToggle: (stepId: string) => void;
  onAssignStepAsset: (stepId: string, assetId: string | null) => void;
  onImportAsset: () => void;
  assetPickerRequestStepId: string | null;
  assetPickerRequestToken: number;
  onAssetPickerRequestHandled: () => void;
  onDuplicateStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onEditStep: (stepId: string) => void;
  scrollToStepRequest?: { stepId: string; token: number } | null;
}

function formatStepDuration(seconds: number): string {
  return `${roundTimelineSeconds(seconds).toFixed(2)}s`;
}

function getPendingAiJobCount(shader: SavedShader | null | undefined): number {
  return Math.max(0, shader?.pendingAiJobCount ?? 0);
}

function getTimelineShaderPreviewKey(
  previewNamespace: string,
  overlayPreviewNamespace: string,
  shader: SavedShader,
): string {
  const renderCode = getRenderableShaderCode(shader);
  const renderUniformValues = getRenderableShaderUniformValues(shader);
  return `${previewNamespace}\u0000${overlayPreviewNamespace}\u0000${shader.id}\u0000${renderCode}\u0000${getUniformValuesPreviewSignature(renderUniformValues)}`;
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

function RepeatSingleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10A6 6 0 1 1 14.24 5.76" />
      <path d="M12.5 2.5H16V6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.75v8.5L12 8Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.25 3.5v9" />
      <path d="M10.75 3.5v9" />
    </svg>
  );
}

function SinglePreviewIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.25" y="3.25" width="11.5" height="9.5" rx="1.6" />
      <path d="M4.25 10.5 6.25 8.5l1.8 1.8 2.4-3 1.3 1.6" />
    </svg>
  );
}

function TimelinePreviewIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.25" y="4.25" width="4.75" height="7.5" rx="1.1" />
      <rect x="9" y="4.25" width="4.75" height="7.5" rx="1.1" />
      <path d="M7.75 8h.5" />
    </svg>
  );
}

export function ShaderTimelineEditor({
  assets,
  assetKind,
  assetUrl,
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
  onModeChange,
  previewMode,
  onPreviewModeChange,
  isPlaying,
  onPlayToggle,
  onToggleSingleStepLoop,
  onSharedTransitionChange,
  onMixDurationChange,
  onStepChange,
  onPinnedStepToggle,
  onAssignStepAsset,
  onImportAsset,
  assetPickerRequestStepId,
  assetPickerRequestToken,
  onAssetPickerRequestHandled,
  onDuplicateStep,
  onRemoveStep,
  onEditStep,
  scrollToStepRequest = null,
}: ShaderTimelineEditorProps) {
  const flowStripRef = useRef<HTMLDivElement>(null);
  const title =
    sequence.mode === 'randomMix'
      ? 'Random Mix'
      : sequence.mode === 'double'
        ? 'Double Mix'
      : sequence.mode === 'random'
        ? 'Random Shader Flow'
        : 'Shader Sequence';
  const [loadedPreview, setLoadedPreview] = useState<{
    assetUrl: string;
    image: HTMLCanvasElement;
  } | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    assetUrl ? 'loading' : 'idle',
  );
  const [previewSources, setPreviewSources] = useState<Record<string, string>>({});
  const [resolvedAssignedAssetUrls, setResolvedAssignedAssetUrls] = useState<Record<string, string | null>>({});
  const [loadedAssignedPreviews, setLoadedAssignedPreviews] = useState<
    Record<string, { assetUrl: string; image: HTMLCanvasElement } | null>
  >({});
  const previewRendererRef = useRef<ShaderPreviewRenderer | null>(null);
  const previewSourceRef = useRef<Record<string, string>>({});
  const [assetPickerStepId, setAssetPickerStepId] = useState<string | null>(null);
  const [assetPickerPreviewAssetId, setAssetPickerPreviewAssetId] = useState<string | null>(null);
  const [shaderPickerStepId, setShaderPickerStepId] = useState<string | null>(null);
  const shaderMap = useMemo(
    () => new Map(savedShaders.map((shader) => [shader.id, shader])),
    [savedShaders],
  );
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const sequenceShaders = useMemo(() => {
    const nextShaders = new Map<string, SavedShader>();

    for (const step of sequence.steps) {
      const shader = shaderMap.get(step.shaderId);
      if (!shader) {
        continue;
      }

      nextShaders.set(`${shader.id}\u0000${getRenderableShaderCode(shader)}`, shader);
    }

    return Array.from(nextShaders.values());
  }, [sequence.steps, shaderMap]);
  const referencedAssignedAssetIds = useMemo(
    () =>
      Array.from(
        new Set(
          sequenceShaders
            .map((shader) => shader.inputAssetId ?? null)
            .filter((assetId): assetId is string => Boolean(assetId)),
        ),
      ),
    [sequenceShaders],
  );
  const referencedAssignedAssetSignature = useMemo(
    () => referencedAssignedAssetIds.join('\u0001'),
    [referencedAssignedAssetIds],
  );
  const isAdvancedView = true;
  const usesSharedTransition = shouldUseSharedTransition(
    sequence.mode,
    sequence.sharedTransitionEnabled,
  );
  const usesSharedSectionDuration =
    sequence.mode === 'random' ||
    sequence.mode === 'randomMix' ||
    sequence.mode === 'double' ||
    sequence.randomChoiceEnabled;
  const showMixTimeControls =
    !sequence.singleStepLoopEnabled &&
    (usesSharedTransition || sequence.mode === 'sequence');
  const displayedMixDurationSeconds = usesSharedTransition
    ? sequence.sharedTransitionDurationSeconds
    : sequence.steps.find((step) => !step.disabled)?.transitionDurationSeconds ?? 0.75;

  useEffect(
    () => () => {
      destroyShaderPreviewRenderer(previewRendererRef.current);
      previewRendererRef.current = null;
    },
    [],
  );

  useEffect(() => {
    setLoadedPreview(null);

    if (!assetUrl || !assetKind) {
      setPreviewStatus('idle');
      return;
    }

    let disposed = false;
    setPreviewStatus('loading');

    void loadShaderPreviewSource(assetUrl, assetKind).then((previewImage) => {
      if (disposed) {
        return;
      }

      if (!previewImage) {
        setPreviewStatus('error');
        return;
      }

      setLoadedPreview({ assetUrl, image: previewImage });
      setPreviewStatus('ready');
    });

    return () => {
      disposed = true;
    };
  }, [assetKind, assetUrl]);

  const previewImage = assetUrl && loadedPreview?.assetUrl === assetUrl ? loadedPreview.image : null;
  const previewNamespace = assetUrl ?? '__no_asset__';

  useEffect(() => {
    let disposed = false;

    const nextResolvedUrls = referencedAssignedAssetIds.reduce<Record<string, string | null>>(
      (collection, assetId) => {
        const assetRecord = assetMap.get(assetId);
        if (!assetRecord) {
          collection[assetId] = null;
          return collection;
        }

        collection[assetId] =
          getBundledAssetUrl(assetId) ?? timelineEditorAssetUrlCache.get(assetId) ?? null;
        return collection;
      },
      {},
    );

    setResolvedAssignedAssetUrls(nextResolvedUrls);

    const missingAssetRecords = referencedAssignedAssetIds
      .map((assetId) => assetMap.get(assetId) ?? null)
      .filter((assetRecord): assetRecord is AssetRecord => {
        if (!assetRecord) {
          return false;
        }
        if (getBundledAssetUrl(assetRecord.id)) {
          return false;
        }

        return !timelineEditorAssetUrlCache.has(assetRecord.id);
      });

    if (missingAssetRecords.length === 0) {
      return () => {
        disposed = true;
      };
    }

    void Promise.all(
      missingAssetRecords.map(async (assetRecord) => {
        const blob = await getAssetBlob(assetRecord.id);
        if (!blob) {
          return [assetRecord.id, null] as const;
        }

        const objectUrl = URL.createObjectURL(blob);
        timelineEditorAssetUrlCache.set(assetRecord.id, objectUrl);
        return [assetRecord.id, objectUrl] as const;
      }),
    ).then((entries) => {
      if (disposed) {
        return;
      }

      setResolvedAssignedAssetUrls((currentValue) => {
        const nextValue = { ...currentValue };
        for (const assetId of referencedAssignedAssetIds) {
          const resolvedEntry = entries.find(([entryAssetId]) => entryAssetId === assetId);
          if (resolvedEntry) {
            nextValue[assetId] = resolvedEntry[1];
            continue;
          }

          nextValue[assetId] =
            getBundledAssetUrl(assetId) ??
            timelineEditorAssetUrlCache.get(assetId) ??
            nextValue[assetId] ??
            null;
        }

        return nextValue;
      });
    });

    return () => {
      disposed = true;
    };
  }, [assetMap, referencedAssignedAssetIds, referencedAssignedAssetSignature]);

  useEffect(() => {
    if (referencedAssignedAssetIds.length === 0) {
      setLoadedAssignedPreviews({});
      return;
    }

    let disposed = false;

    void Promise.all(
      referencedAssignedAssetIds.map(async (assetId) => {
        const resolvedAssetUrl = resolvedAssignedAssetUrls[assetId] ?? null;
        const assetRecord = assetMap.get(assetId) ?? null;
        if (!resolvedAssetUrl || !assetRecord) {
          return [assetId, null] as const;
        }

        const previewImage = await loadShaderPreviewSource(resolvedAssetUrl, assetRecord.kind);
        if (!previewImage) {
          return [assetId, null] as const;
        }

        return [
          assetId,
          {
            assetUrl: resolvedAssetUrl,
            image: previewImage,
          },
        ] as const;
      }),
    ).then((entries) => {
      if (disposed) {
        return;
      }

      setLoadedAssignedPreviews(() =>
        Object.fromEntries(entries.map(([assetId, preview]) => [assetId, preview])),
      );
    });

    return () => {
      disposed = true;
    };
  }, [assetMap, referencedAssignedAssetIds, resolvedAssignedAssetUrls]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    const nextPreviewSources: Record<string, string> = {};
    const renderQueue: Array<{
      previewKey: string;
      renderCode: string;
      renderUniformValues: ShaderUniformValueMap | undefined;
      assignedPreviewImage: HTMLCanvasElement | null;
    }> = [];

    for (const shader of sequenceShaders) {
      const renderCode = getRenderableShaderCode(shader);
      const renderUniformValues = getRenderableShaderUniformValues(shader);
      const assignedPreview = shader.inputAssetId
        ? loadedAssignedPreviews[shader.inputAssetId] ?? null
        : null;
      const overlayPreviewNamespace = assignedPreview?.assetUrl ??
        (shader.inputAssetId ? `${shader.inputAssetId}:pending` : '__no_overlay__');
      const previewKey = getTimelineShaderPreviewKey(
        previewNamespace,
        overlayPreviewNamespace,
        shader,
      );
      const cachedPreview = previewSourceRef.current[previewKey];
      if (cachedPreview) {
        nextPreviewSources[previewKey] = cachedPreview;
        continue;
      }

      renderQueue.push({
        previewKey,
        renderCode,
        renderUniformValues,
        assignedPreviewImage: assignedPreview?.image ?? null,
      });
    }

    if (Object.keys(nextPreviewSources).length > 0) {
      setPreviewSources((current) => ({
        ...current,
        ...nextPreviewSources,
      }));
    }

    if (renderQueue.length === 0) {
      return;
    }

    let disposed = false;
    let timeoutId = 0;

    const renderNextPreview = (queueIndex: number) => {
      if (disposed || queueIndex >= renderQueue.length) {
        return;
      }

      const queuedPreview = renderQueue[queueIndex];
      if (!queuedPreview) {
        return;
      }

      const cachedPreview =
        previewSourceRef.current[queuedPreview.previewKey] ??
        renderShaderPreviewToDataUrl(
          queuedPreview.renderCode,
          queuedPreview.renderUniformValues,
          previewImage,
          queuedPreview.assignedPreviewImage,
          previewRendererRef,
        );

      if (disposed) {
        return;
      }

      previewSourceRef.current = {
        ...previewSourceRef.current,
        [queuedPreview.previewKey]: cachedPreview,
      };
      setPreviewSources((current) => ({
        ...current,
        [queuedPreview.previewKey]: cachedPreview,
      }));

      timeoutId = window.setTimeout(
        () => renderNextPreview(queueIndex + 1),
        TIMELINE_PREVIEW_RENDER_SPACING_MS,
      );
    };

    timeoutId = window.setTimeout(
      () => renderNextPreview(0),
      TIMELINE_PREVIEW_RENDER_DELAY_MS,
    );

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [loadedAssignedPreviews, previewImage, previewNamespace, sequenceShaders]);

  const previewPlaceholder =
    !assetUrl || !assetKind
      ? 'Load asset'
      : previewStatus === 'loading'
        ? assetKind === 'video'
          ? 'Frame...'
          : 'Image...'
        : previewStatus === 'error'
          ? 'No preview'
          : 'Render...';
  const enabledStepCount = sequence.steps.filter((step) => !step.disabled).length;
  const assetPickerStep =
    assetPickerStepId !== null
      ? sequence.steps.find((step) => step.id === assetPickerStepId) ?? null
      : null;
  const assetPickerShader = assetPickerStep
    ? shaderMap.get(assetPickerStep.shaderId) ?? null
    : null;
  const assetPickerAssignedAsset =
    assetPickerShader?.inputAssetId ? assetMap.get(assetPickerShader.inputAssetId) ?? null : null;
  const assetPickerPreviewUrls = useAssetPreviewUrls(assets, assetPickerStep !== null, null, null);
  const assetPickerPreviewAsset =
    assetPickerPreviewAssetId !== null ? assetMap.get(assetPickerPreviewAssetId) ?? null : null;
  const assetPickerPreviewUrl = assetPickerPreviewAsset
    ? assetPickerPreviewUrls[assetPickerPreviewAsset.id] ?? null
    : null;

  useEffect(() => {
    if (!assetPickerStepId) {
      return;
    }

    const stepStillExists = sequence.steps.some((step) => step.id === assetPickerStepId);
    if (!stepStillExists) {
      setAssetPickerStepId(null);
    }
  }, [assetPickerStepId, sequence.steps]);

  useEffect(() => {
    if (!assetPickerRequestStepId) {
      return;
    }

    if (sequence.steps.some((step) => step.id === assetPickerRequestStepId)) {
      setAssetPickerStepId(assetPickerRequestStepId);
    }

    onAssetPickerRequestHandled();
  }, [assetPickerRequestStepId, assetPickerRequestToken, onAssetPickerRequestHandled, sequence.steps]);

  useEffect(() => {
    if (!assetPickerStep) {
      setAssetPickerPreviewAssetId(null);
      return;
    }

    setAssetPickerPreviewAssetId(assetPickerShader?.inputAssetId ?? assets[0]?.id ?? null);
  }, [assetPickerStep?.id]);

  useEffect(() => {
    if (!assetPickerStep || assetPickerPreviewAssetId) {
      return;
    }

    setAssetPickerPreviewAssetId(assetPickerShader?.inputAssetId ?? assets.at(-1)?.id ?? null);
  }, [assetPickerPreviewAssetId, assetPickerShader?.inputAssetId, assetPickerStep, assets]);

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

  return (
    <section className="timeline-sequence-editor">
      <div className="timeline-sequence-toolbar">
        <div className="timeline-sequence-copy">
          <span className="timeline-sequence-label">Timeline Logic</span>
          <strong className="timeline-sequence-title">
            {title} - {sequence.steps.length} shader{sequence.steps.length === 1 ? '' : 's'} -{' '}
            {formatStepDuration(totalDurationSeconds)}
          </strong>
        </div>

        <div className="timeline-sequence-toolbar-actions">
          <button
            type="button"
            className={`icon-button timeline-toggle-icon-button ${
              previewMode === 'focused' ? 'timeline-toggle-icon-button-active' : ''
            }`}
            aria-label={
              previewMode === 'focused'
                ? 'Show full timeline preview in stage'
                : 'Show focused shader preview in stage'
            }
            title={
              previewMode === 'focused'
                ? 'Show full timeline preview in stage'
                : 'Show focused shader preview in stage'
            }
            onClick={() =>
              onPreviewModeChange(previewMode === 'focused' ? 'timeline' : 'focused')
            }
          >
            {previewMode === 'focused' ? <SinglePreviewIcon /> : <TimelinePreviewIcon />}
          </button>

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
          ) : (
            <div className="timeline-shared-transition-toolbar">
              {usesSharedSectionDuration ? (
                <label className="field timeline-compact-field timeline-shared-transition-field">
                  <span>Section Time</span>
                  <input
                    className="text-field"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={sequence.sharedSectionDurationSeconds}
                    onChange={(event) =>
                      onSharedTransitionChange({
                        sharedSectionDurationSeconds: Number(event.target.value),
                      })
                    }
                  />
                </label>
              ) : null}

              {showMixTimeControls ? (
                <>
                  {usesSharedTransition ? (
                    <label className="field timeline-compact-field timeline-shared-transition-field">
                      <span>Fx</span>
                      <select
                        className="select-field"
                        value={sequence.sharedTransitionEffect}
                        onChange={(event) =>
                          onSharedTransitionChange({
                            sharedTransitionEffect:
                              event.target.value as TimelineStub['shaderSequence']['sharedTransitionEffect'],
                          })
                        }
                      >
                        {TIMELINE_TRANSITION_EFFECT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="field timeline-compact-field timeline-shared-transition-field">
                    <span>Mix Time</span>
                    <input
                      className="text-field"
                      type="number"
                      min={0}
                      step={0.05}
                      value={displayedMixDurationSeconds}
                      onChange={(event) => {
                        const nextDurationSeconds = Number(event.target.value);
                        if (usesSharedTransition) {
                          onSharedTransitionChange({
                            sharedTransitionDurationSeconds: nextDurationSeconds,
                          });
                          return;
                        }

                        onMixDurationChange(nextDurationSeconds);
                      }}
                    />
                  </label>
                </>
              ) : null}
            </div>
          )}

          <div className="timeline-mode-switch" role="tablist" aria-label="Timeline modes">
            {TIMELINE_SEQUENCE_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={sequence.mode === option.value}
                className={`timeline-mode-button ${
                  sequence.mode === option.value ? 'timeline-mode-button-active' : ''
                }`}
                onClick={() => onModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="timeline-sequence-playback-actions">
            <button
              type="button"
              className={`icon-button timeline-toggle-icon-button ${
                sequence.singleStepLoopEnabled ? 'timeline-toggle-icon-button-active' : ''
              }`}
              aria-label="Repeat focused shader"
              title="Repeat focused shader"
              onClick={onToggleSingleStepLoop}
            >
              <RepeatSingleIcon />
            </button>

            <button
              type="button"
              className="icon-button timeline-toggle-icon-button"
              aria-label={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
              title={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
              onClick={onPlayToggle}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

        </div>
      </div>

      <div
        ref={flowStripRef}
        className="timeline-flow-strip"
        role="list"
        aria-label="Shader timeline flow"
      >
        {sequence.steps.map((step) => {
          const shader = shaderMap.get(step.shaderId);
          const isPlayingStep = step.id === activeStepId;
          const isTransitionStep = step.id === transitionStepId && transitionStepId !== activeStepId;
          const assignedAsset = shader?.inputAssetId ? assetMap.get(shader.inputAssetId) ?? null : null;
          const assignedPreview = shader?.inputAssetId
            ? loadedAssignedPreviews[shader.inputAssetId] ?? null
            : null;
          const overlayPreviewNamespace = assignedPreview?.assetUrl ??
            (shader?.inputAssetId ? `${shader.inputAssetId}:pending` : '__no_overlay__');
          const previewKey = shader
            ? getTimelineShaderPreviewKey(previewNamespace, overlayPreviewNamespace, shader)
            : '';
          const previewSrc = shader ? previewSources[previewKey] ?? null : null;
          const hasCompileError = hasShaderCompileError(shader);
          const hasAssignedAsset = Boolean(shader?.inputAssetId);
          const isDisabledStep = Boolean(step.disabled);
          const isPinnedStep = pinnedStepId === step.id;
          const disableToggleBlocked = !isDisabledStep && enabledStepCount <= 1;

          return (
            <div
              className="timeline-flow-node"
              key={step.id}
              role="listitem"
            >
              <article
                className={`timeline-step-card ${
                  step.shaderId === activeShaderId ? 'timeline-step-card-active' : ''
                } ${isPlayingStep ? 'timeline-step-card-current' : ''} ${
                  isTransitionStep ? 'timeline-step-card-transition' : ''
                } ${step.id === editingStepId ? 'timeline-step-card-editing' : ''} ${
                  !isAdvancedView ? 'timeline-step-card-simple' : ''
                } ${isDisabledStep ? 'timeline-step-card-disabled' : ''} ${
                  isPinnedStep ? 'timeline-step-card-pinned' : ''
                }`}
                data-timeline-step-id={step.id}
                role="button"
                tabIndex={0}
                aria-pressed={step.id === editingStepId}
                onClick={() => {
                  onEditStep(step.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onEditStep(step.id);
                  }
                }}
              >
                <div className="timeline-step-preview-shell">
                  {previewSrc ? (
                    <img
                      className="timeline-step-preview-image"
                      src={previewSrc}
                      alt={`${shader?.name ?? 'Shader'} preview`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="timeline-step-preview-placeholder">{previewPlaceholder}</div>
                  )}

                  <div className="timeline-step-preview-actions">
                    {!isDisabledStep ? (
                      <button
                        type="button"
                        className={`icon-button timeline-step-overlay-button ${
                          isPinnedStep ? 'timeline-step-overlay-button-pin-active' : ''
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
                    ) : null}

                    <button
                      type="button"
                      className={`icon-button timeline-step-overlay-button ${
                        hasAssignedAsset ? 'timeline-step-overlay-button-pin-active' : ''
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
                        setAssetPickerStepId(step.id);
                      }}
                    >
                      <ImageAssetIcon />
                    </button>

                    <button
                      type="button"
                      className={`icon-button timeline-step-overlay-button timeline-step-overlay-button-disable ${
                        isDisabledStep ? 'timeline-step-overlay-button-disable-active' : ''
                      }`}
                      aria-label={isDisabledStep ? 'Enable shader step' : 'Disable shader step'}
                      aria-pressed={isDisabledStep}
                      title={isDisabledStep ? 'Enable step' : 'Disable step'}
                      disabled={disableToggleBlocked}
                      onClick={(event) => {
                        event.stopPropagation();
                        onStepChange(step.id, { disabled: !isDisabledStep });
                      }}
                    >
                      <BlockIcon />
                    </button>

                    <button
                      type="button"
                      className="icon-button timeline-step-overlay-button"
                      aria-label="Duplicate shader step"
                      title="Duplicate"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicateStep(step.id);
                      }}
                    >
                      <DuplicateIcon />
                    </button>

                    <button
                      type="button"
                      className="icon-button timeline-step-overlay-button timeline-step-overlay-button-danger"
                      aria-label="Delete shader step"
                      title="Delete"
                      disabled={sequence.steps.length === 1 || (!isDisabledStep && enabledStepCount <= 1)}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveStep(step.id);
                      }}
                    >
                      <DeleteIcon />
                    </button>
                  </div>

                  {(isPlayingStep || isTransitionStep) && (
                    <div className="timeline-step-preview-badges">
                      {isPlayingStep ? (
                        <span className="timeline-step-preview-badge timeline-step-preview-badge-active">
                          Now
                        </span>
                      ) : null}
                      {isTransitionStep ? (
                        <span className="timeline-step-preview-badge">Next</span>
                      ) : null}
                    </div>
                  )}

                  {isDisabledStep ||
                  isPinnedStep ||
                  hasAssignedAsset ||
                  hasCompileError ||
                  getPendingAiJobCount(shader) > 0 ||
                  shader?.hasUnreadAiResult ? (
                    <div className="timeline-step-preview-badges timeline-step-preview-badges-bottom">
                      {isPinnedStep ? (
                        <span className="timeline-step-preview-badge timeline-step-preview-badge-pinned">
                          Pin
                        </span>
                      ) : null}
                      {isDisabledStep ? (
                        <span className="timeline-step-preview-badge timeline-step-preview-badge-disabled">
                          Off
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
                    </div>
                  ) : null}
                </div>

                <label className="field timeline-compact-field">
                  <span>Shader</span>
                  {shaderPickerStepId === step.id ? (
                    <select
                      className="select-field"
                      value={step.shaderId}
                      autoFocus
                      onBlur={() => setShaderPickerStepId(null)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        onStepChange(step.id, { shaderId: event.target.value });
                        setShaderPickerStepId(null);
                      }}
                    >
                      {savedShaders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.isTemporary ? `${item.name} (Timeline)` : item.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button timeline-step-shader-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShaderPickerStepId(step.id);
                      }}
                    >
                      {shader?.name ?? 'Choose shader'}
                    </button>
                  )}
                </label>
              </article>
            </div>
          );
        })}
      </div>

      {assetPickerStep && assetPickerShader ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setAssetPickerStepId(null);
            }
          }}
        >
          <section
            className="dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-asset-picker-title"
          >
            <header className="dialog-header">
              <div>
                <span className="panel-eyebrow">Shader Asset</span>
                <h2 id="timeline-asset-picker-title" className="dialog-title">
                  Assign Media
                </h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setAssetPickerStepId(null)}
              >
                Close
              </button>
            </header>

            <div className="dialog-body timeline-asset-dialog-body">
              <div className="asset-browser-preview-column">
                <div className="asset-browser-preview-shell timeline-asset-preview-shell">
                  {assetPickerPreviewAsset && assetPickerPreviewUrl ? (
                    assetPickerPreviewAsset.kind === 'video' ? (
                      <video
                        className="asset-browser-preview-media"
                        src={assetPickerPreviewUrl}
                        muted
                        playsInline
                        loop
                        autoPlay
                      />
                    ) : (
                      <img
                        className="asset-browser-preview-media"
                        src={assetPickerPreviewUrl}
                        alt={assetPickerPreviewAsset.name}
                      />
                    )
                  ) : (
                    <div className="asset-browser-preview-placeholder">
                      Hover or pick an asset to preview it here.
                    </div>
                  )}
                </div>

                <div className="stack gap-sm">
                  <div className="field-inline-label">
                    <span>Step Media</span>
                    <small>
                      {assetPickerAssignedAsset
                        ? `${assetPickerAssignedAsset.kind} assigned`
                        : 'Live stage asset'}
                    </small>
                  </div>
                  <p className="helper-copy">
                    Choose which library asset should feed <strong>{assetPickerShader.name}</strong>.
                    Step fit, blend, size, and clip controls now live in the main inspector panel.
                  </p>
                </div>
              </div>

              <div className="asset-browser-gallery-shell">
                <div className="timeline-step-asset-picker-header">
                  <div className="field-inline-label">
                    <span>Library Assets</span>
                    <small>{assets.length} items</small>
                  </div>

                  <div className="timeline-step-asset-picker-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={onImportAsset}
                    >
                      Import Media
                    </button>

                    <button
                      type="button"
                      className={`secondary-button ${
                        !assetPickerShader.inputAssetId ? 'timeline-add-trigger-active' : ''
                      }`}
                      onClick={() => {
                        onAssignStepAsset(assetPickerStep.id, null);
                        setAssetPickerPreviewAssetId(null);
                        setAssetPickerStepId(null);
                      }}
                    >
                      Use Live Stage Asset
                    </button>
                  </div>
                </div>

                {assets.length === 0 ? (
                  <p className="empty-copy">Import an image or video first.</p>
                ) : (
                  <div className="asset-browser-preview-grid timeline-asset-preview-grid">
                    {assets.map((assetRecord) => {
                      const previewUrl = assetPickerPreviewUrls[assetRecord.id] ?? null;
                      const isSelected = assetPickerShader.inputAssetId === assetRecord.id;

                      return (
                        <button
                          key={assetRecord.id}
                          type="button"
                          className={`asset-browser-preview-card ${
                            isSelected ? 'asset-browser-preview-card-active' : ''
                          }`}
                          onMouseEnter={() => setAssetPickerPreviewAssetId(assetRecord.id)}
                          onFocus={() => setAssetPickerPreviewAssetId(assetRecord.id)}
                          onClick={() => {
                            onAssignStepAsset(assetPickerStep.id, assetRecord.id);
                            setAssetPickerPreviewAssetId(assetRecord.id);
                            setAssetPickerStepId(null);
                          }}
                        >
                          <div className="asset-browser-preview-card-media-shell">
                            {previewUrl ? (
                              assetRecord.kind === 'video' ? (
                                <video
                                  className="asset-browser-preview-card-media"
                                  src={previewUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  className="asset-browser-preview-card-media"
                                  src={previewUrl}
                                  alt={assetRecord.name}
                                />
                              )
                            ) : (
                              <div className="asset-browser-preview-card-placeholder">
                                Loading {assetRecord.kind}
                              </div>
                            )}
                          </div>
                          <span className="asset-browser-preview-card-meta">
                            <strong>{assetRecord.name}</strong>
                            <small>
                              {assetRecord.kind}
                              {isSelected ? ' | assigned' : ''}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
