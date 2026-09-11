import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { bindHorizontalWheelScroll } from '../lib/horizontalScroll';
import {
  clampTimelineStepDuration,
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
import type { ImageTransfer } from '../lib/imageTransfer';
import { useImageDropTarget } from '../lib/useImageDropTarget';
import {
  useAssetPreviewUrls,
} from '../lib/useAssetPreviewUrls';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import { getBundledAssetUrl } from '../lib/bundledAssets';
import { ShuffleIcon } from './ShuffleIcon';
import type {
  AssetRecord,
  AssetKind,
  SavedShader,
  ShaderUniformValueMap,
  TimelineSequenceMode,
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
  audioReactiveAvailable?: boolean;
  audioReactiveListening?: boolean;
  onModeChange: (mode: TimelineSequenceMode) => void;
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
  hasShuffleUndo?: boolean;
  onRandomizeShaders?: () => void;
  onRestoreShaders?: () => void;
  onDismissShuffleUndo?: () => void;
  onPinnedStepToggle: (stepId: string) => void;
  onAssignStepAsset: (stepId: string, assetId: string | null) => void;
  onImportAsset: (stepId: string) => void;
  onDropImage: (transfer: ImageTransfer, stepId: string) => void;
  assetPickerRequestStepId: string | null;
  assetPickerRequestToken: number;
  onAssetPickerRequestHandled: () => void;
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

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 5.25h10" />
      <path d="M3 8h10" />
      <path d="M3 10.75h10" />
    </svg>
  );
}

function StepperChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d={direction === 'up' ? 'm3 7.25 3-3 3 3' : 'm3 4.75 3 3 3-3'} />
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
  audioReactiveAvailable = false,
  audioReactiveListening = false,
  onModeChange,
  onSharedTransitionChange,
  onMixDurationChange,
  onStepChange,
  hasShuffleUndo = false,
  onRandomizeShaders,
  onRestoreShaders,
  onDismissShuffleUndo,
  onPinnedStepToggle,
  onAssignStepAsset,
  onImportAsset,
  assetPickerRequestStepId,
  assetPickerRequestToken,
  onAssetPickerRequestHandled,
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
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const title =
    sequence.mode === 'audioReactive'
      ? 'Audio Sync'
      : sequence.mode === 'randomMix'
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
  const [visiblePreviewShaderIds, setVisiblePreviewShaderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [resolvedAssignedAssetUrls, setResolvedAssignedAssetUrls] = useState<Record<string, string | null>>({});
  const [loadedAssignedPreviews, setLoadedAssignedPreviews] = useState<
    Record<string, { assetUrl: string; image: HTMLCanvasElement } | null>
  >({});
  const previewRendererRef = useRef<ShaderPreviewRenderer | null>(null);
  const previewSourceRef = useRef<Record<string, string>>({});
  const [assetPickerStepId, setAssetPickerStepId] = useState<string | null>(null);
  const [assetPickerPreviewAssetId, setAssetPickerPreviewAssetId] = useState<string | null>(null);
  const [shaderPickerStepId, setShaderPickerStepId] = useState<string | null>(null);
  const [isShuffleConfirmationOpen, setIsShuffleConfirmationOpen] = useState(false);
  const [isMobileArranging, setIsMobileArranging] = useState(false);
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false);
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
    sequence.mode === 'audioReactive' ||
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
    const previewViewport = previewViewportRef.current;
    if (!previewViewport) {
      return;
    }

    const previewNodes = Array.from(
      previewViewport.querySelectorAll<HTMLElement>('[data-preview-shader-id]'),
    );
    if (previewNodes.length === 0) {
      return;
    }

    const revealShader = (node: HTMLElement) => {
      const shaderId = node.dataset.previewShaderId;
      if (!shaderId) {
        return;
      }
      setVisiblePreviewShaderIds((currentIds) => {
        if (currentIds.has(shaderId)) {
          return currentIds;
        }
        const nextIds = new Set(currentIds);
        nextIds.add(shaderId);
        return nextIds;
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      previewNodes.forEach(revealShader);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          revealShader(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { root: previewViewport, rootMargin: '180px' },
    );
    previewNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [mobileCardsOnly, previewNamespace, sequence.steps]);

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
      if (!visiblePreviewShaderIds.has(shader.id)) {
        continue;
      }
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
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const schedulePreviewRender = (callback: () => void, delayMs: number) => {
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        if (idleWindow.requestIdleCallback) {
          idleCallbackId = idleWindow.requestIdleCallback(() => {
            idleCallbackId = null;
            callback();
          }, { timeout: 1_000 });
          return;
        }

        timeoutId = window.setTimeout(callback, 0);
      }, delayMs);
    };

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

      schedulePreviewRender(
        () => renderNextPreview(queueIndex + 1),
        TIMELINE_PREVIEW_RENDER_SPACING_MS,
      );
    };

    schedulePreviewRender(() => renderNextPreview(0), TIMELINE_PREVIEW_RENDER_DELAY_MS);

    return () => {
      disposed = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleCallbackId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [
    loadedAssignedPreviews,
    previewImage,
    previewNamespace,
    sequenceShaders,
    visiblePreviewShaderIds,
  ]);

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
    if (!isShuffleConfirmationOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShuffleConfirmationOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShuffleConfirmationOpen]);

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
            const assignedPreview = shader?.inputAssetId
              ? loadedAssignedPreviews[shader.inputAssetId] ?? null
              : null;
            const overlayPreviewNamespace = assignedPreview?.assetUrl ??
              (shader?.inputAssetId ? `${shader.inputAssetId}:pending` : '__no_overlay__');
            const previewKey = shader
              ? getTimelineShaderPreviewKey(previewNamespace, overlayPreviewNamespace, shader)
              : '';
            const previewSrc = shader ? previewSources[previewKey] ?? null : null;
            const isEditing = step.id === editingStepId;
            const isCurrent = step.id === activeStepId;
            const isDisabledStep = Boolean(step.disabled);
            const deleteBlocked =
              sequence.steps.length === 1 || (!isDisabledStep && enabledStepCount <= 1);
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
                <span className="mobile-shader-sequence-preview">
                  {previewSrc ? (
                    <img src={previewSrc} alt="" draggable={false} loading="lazy" />
                  ) : (
                    <span className="mobile-shader-sequence-placeholder">{previewPlaceholder}</span>
                  )}
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
                        onRemoveStep(step.id);
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
      </section>
    );
  }

  return (
    <section className="timeline-sequence-editor">
      <div className="timeline-sequence-toolbar">
        <div className="timeline-sequence-copy">
          <span className="timeline-sequence-label">Timeline Logic</span>
          <div className="timeline-sequence-title-row">
            <strong className="timeline-sequence-title">
              {title} - {sequence.steps.length} shader{sequence.steps.length === 1 ? '' : 's'} -{' '}
              {formatStepDuration(totalDurationSeconds)}
            </strong>

            {onRandomizeShaders && onRestoreShaders && onDismissShuffleUndo ? (
              <div
                className={`timeline-crazy-slot ${
                  hasShuffleUndo ? 'timeline-crazy-slot-active' : ''
                }`}
              >
                {hasShuffleUndo ? (
                  <div className="timeline-crazy-undo" role="status">
                    <button
                      type="button"
                      className="timeline-crazy-undo-button"
                      onClick={onRestoreShaders}
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      className="timeline-crazy-dismiss"
                      aria-label="Dismiss shader restore"
                      title="Keep randomized shaders"
                      onClick={onDismissShuffleUndo}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="timeline-crazy-button"
                    disabled={sequence.steps.length === 0 || savedShaders.length === 0}
                    aria-label="Shuffle timeline shaders with Get Me Crazy"
                    title="Randomize every shader in this timeline"
                    onClick={() => setIsShuffleConfirmationOpen(true)}
                  >
                    <ShuffleIcon />
                    <span>
                      <small>Shuffle shaders</small>
                      <strong>Get Me Crazy</strong>
                    </span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

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
          ) : (
            <div className="timeline-shared-transition-toolbar">
              {usesSharedSectionDuration ? (
                <div className="field timeline-compact-field timeline-shared-transition-field timeline-shared-transition-field-section">
                  <span>
                    {sequence.mode === 'audioReactive'
                      ? 'Minimum Hold'
                      : 'Section Time'}
                  </span>
                  <div className="timeline-number-stepper">
                    <input
                      className="text-field"
                      type="number"
                      aria-label={
                        sequence.mode === 'audioReactive'
                          ? 'Minimum audio section hold in seconds'
                          : 'Section time in seconds'
                      }
                      min={sequence.mode === 'audioReactive' ? 1 : 0.5}
                      max={600}
                      step={0.5}
                      value={sequence.sharedSectionDurationSeconds}
                      onChange={(event) =>
                        onSharedTransitionChange({
                          sharedSectionDurationSeconds: Number(event.target.value),
                        })
                      }
                    />
                    <div className="timeline-number-stepper-controls">
                      <button
                        type="button"
                        aria-label="Increase section time"
                        title="Increase section time"
                        disabled={sequence.sharedSectionDurationSeconds >= 600}
                        onClick={() =>
                          onSharedTransitionChange({
                            sharedSectionDurationSeconds: clampTimelineStepDuration(
                              sequence.sharedSectionDurationSeconds + 0.5,
                            ),
                          })
                        }
                      >
                        <StepperChevronIcon direction="up" />
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease section time"
                        title="Decrease section time"
                        disabled={
                          sequence.sharedSectionDurationSeconds <=
                          (sequence.mode === 'audioReactive' ? 1 : 0.5)
                        }
                        onClick={() =>
                          onSharedTransitionChange({
                            sharedSectionDurationSeconds: clampTimelineStepDuration(
                              Math.max(
                                sequence.mode === 'audioReactive' ? 1 : 0.5,
                                sequence.sharedSectionDurationSeconds - 0.5,
                              ),
                            ),
                          })
                        }
                      >
                        <StepperChevronIcon direction="down" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {showMixTimeControls ? (
                <>
                  {usesSharedTransition ? (
                    <label className="field timeline-compact-field timeline-shared-transition-field timeline-shared-transition-field-fx">
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

                  <label className="field timeline-compact-field timeline-shared-transition-field timeline-shared-transition-field-mix">
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
                data-preview-shader-id={shader?.id}
                {...dropProps(step.id)}
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
                      draggable={false}
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

        {onAddStep ? (
          <div className="timeline-flow-node" role="listitem">
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

      {isShuffleConfirmationOpen ? (
        <div
          className="dialog-backdrop timeline-crazy-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsShuffleConfirmationOpen(false);
            }
          }}
        >
          <section
            className="dialog-panel timeline-crazy-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-crazy-dialog-title"
            aria-describedby="timeline-crazy-dialog-copy"
          >
            <header className="dialog-header">
              <div>
                <span className="panel-eyebrow">Timeline Shuffle</span>
                <h2 id="timeline-crazy-dialog-title" className="dialog-title">
                  Get Me Crazy?
                </h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsShuffleConfirmationOpen(false)}
              >
                Close
              </button>
            </header>
            <div className="dialog-body timeline-crazy-dialog-body">
              <p id="timeline-crazy-dialog-copy">
                Are you sure you want to do this? Every shader in the timeline will be
                randomized using shaders already available in the app.
              </p>
              <small>You can restore the current shaders once with Go Back.</small>
            </div>
            <footer className="dialog-footer">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsShuffleConfirmationOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button timeline-crazy-confirm"
                onClick={() => {
                  onRandomizeShaders?.();
                  setIsShuffleConfirmationOpen(false);
                }}
              >
                Yes, Get Me Crazy
              </button>
            </footer>
          </section>
        </div>
      ) : null}

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
                      onClick={() => onImportAsset(assetPickerStep.id)}
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
