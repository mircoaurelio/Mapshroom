import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  roundTimelineSeconds,
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
  normalizeTimelineStepAssetSettings,
  TIMELINE_ASSET_BLEND_MODE_OPTIONS,
  TIMELINE_ASSET_FIT_MODE_OPTIONS,
  TIMELINE_ASSET_QUALITY_OPTIONS,
} from '../lib/timelineAssetSettings';
import { useAssetPreviewUrls } from '../lib/useAssetPreviewUrls';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import type {
  AssetRecord,
  AssetKind,
  SavedShader,
  ShaderUniformValueMap,
  TimelineEditorViewMode,
  TimelineSequenceMode,
  TimelineStagePreviewMode,
  TimelineStub,
  TimelineStepAssetSettings,
} from '../types';

const timelineEditorAssetUrlCache = new Map<string, string>();

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
  onModeChange: (mode: TimelineSequenceMode) => void;
  onEditorViewChange: (editorView: TimelineEditorViewMode) => void;
  previewMode: TimelineStagePreviewMode;
  onPreviewModeChange: (previewMode: TimelineStagePreviewMode) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onReset: () => void;
  onToggleSingleStepLoop: () => void;
  onToggleRandomChoice: () => void;
  onSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineStub['shaderSequence']['sharedTransitionEffect'];
    sharedTransitionDurationSeconds?: number;
  }) => void;
  onStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onPinnedStepToggle: (stepId: string) => void;
  onAssignStepAsset: (stepId: string, assetId: string | null) => void;
  onAddStepsWithShaders: (shaderIds: string[]) => void;
  onDuplicateStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onEditStep: (stepId: string) => void;
}

const EDITOR_VIEW_OPTIONS: Array<{
  value: TimelineEditorViewMode;
  label: string;
  title: string;
}> = [
  {
    value: 'simple',
    label: 'Simple view',
    title: 'Simple timeline view',
  },
  {
    value: 'advanced',
    label: 'Advanced view',
    title: 'Advanced timeline view',
  },
];

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

type AssetPickerTab = 'choose' | 'settings';

function ViewModeIcon({ mode }: { mode: TimelineEditorViewMode }) {
  if (mode === 'simple') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
        <path d="M4.5 10.5h7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10" />
      <path d="M3 8h10" />
      <path d="M3 11.5h10" />
      <circle cx="6" cy="4.5" r="1.2" />
      <circle cx="10" cy="8" r="1.2" />
      <circle cx="7.5" cy="11.5" r="1.2" />
    </svg>
  );
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

function RandomChoiceIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.75 4h2.2l4.2 8h4.1" />
      <path d="M2.75 12h2.2l1.35-2.55" />
      <path d="M10 4h3.3" />
      <path d="m11.75 2.5 1.75 1.5-1.75 1.5" />
      <path d="m11.75 10.5 1.75 1.5-1.75 1.5" />
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

function SharedMixIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 5.25h3.5l2.1 2.75h4.4" />
      <path d="M3 10.75h3.5l2.1-2.75h4.4" />
      <path d="m11.25 3.75 1.75 1.5-1.75 1.5" />
      <path d="m11.25 9.25 1.75 1.5-1.75 1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.25v9.5" />
      <path d="M3.25 8h9.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4.5 6.5 3.5 3 3.5-3" />
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
  onModeChange,
  onEditorViewChange,
  previewMode,
  onPreviewModeChange,
  isPlaying,
  onPlayToggle,
  onReset,
  onToggleSingleStepLoop,
  onToggleRandomChoice,
  onSharedTransitionChange,
  onStepChange,
  onPinnedStepToggle,
  onAssignStepAsset,
  onAddStepsWithShaders,
  onDuplicateStep,
  onRemoveStep,
  onEditStep,
}: ShaderTimelineEditorProps) {
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
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [assetPickerStepId, setAssetPickerStepId] = useState<string | null>(null);
  const [assetPickerTab, setAssetPickerTab] = useState<AssetPickerTab>('choose');
  const [assetPickerPreviewAssetId, setAssetPickerPreviewAssetId] = useState<string | null>(null);
  const [selectedAddShaderIds, setSelectedAddShaderIds] = useState<string[]>([]);
  const [cardScale, setCardScale] = useState(1);
  const shaderMap = useMemo(
    () => new Map(savedShaders.map((shader) => [shader.id, shader])),
    [savedShaders],
  );
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const addableShaders = useMemo(
    () => savedShaders.filter((shader) => !shader.isTemporary),
    [savedShaders],
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
  const isAdvancedView = sequence.editorView === 'advanced';
  const sharedTransitionLocked =
    sequence.mode === 'randomMix' || sequence.mode === 'double';
  const usesSharedTransition =
    sharedTransitionLocked || sequence.sharedTransitionEnabled;
  const flowStripStyle = useMemo(
    () =>
      ({
        '--timeline-card-width-scale': `${cardScale.toFixed(2)}`,
        '--timeline-card-width': `${Math.round(220 * cardScale)}px`,
        '--timeline-card-simple-width': `${Math.round(192 * cardScale)}px`,
        '--timeline-card-padding-y': `${(0.22 + cardScale * 0.33).toFixed(2)}rem`,
        '--timeline-card-padding-x': `${(0.24 + cardScale * 0.36).toFixed(2)}rem`,
        '--timeline-card-gap': `${(0.16 + cardScale * 0.29).toFixed(2)}rem`,
        '--timeline-card-preview-height': `${Math.round(46 + cardScale * 42)}px`,
        '--timeline-card-select-height': `${Math.round(22 + cardScale * 4)}px`,
      }) as CSSProperties,
    [cardScale],
  );

  useEffect(() => {
    setSelectedAddShaderIds((currentIds) => {
      const validShaderIds = new Set(addableShaders.map((shader) => shader.id));
      return currentIds.filter((shaderId) => validShaderIds.has(shaderId));
    });
  }, [addableShaders]);

  useEffect(() => {
    if (!isAddMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddMenuOpen]);

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

        collection[assetId] = timelineEditorAssetUrlCache.get(assetId) ?? null;
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

          nextValue[assetId] = timelineEditorAssetUrlCache.get(assetId) ?? nextValue[assetId] ?? null;
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
      const cachedPreview =
        previewSourceRef.current[previewKey] ??
        renderShaderPreviewToDataUrl(
          renderCode,
          renderUniformValues,
          previewImage,
          assignedPreview?.image ?? null,
          previewRendererRef,
        );

      previewSourceRef.current = {
        ...previewSourceRef.current,
        [previewKey]: cachedPreview,
      };
      nextPreviewSources[previewKey] = cachedPreview;
    }

    setPreviewSources((current) => ({
      ...current,
      ...nextPreviewSources,
    }));
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
  const selectedAddShaderCount = selectedAddShaderIds.length;
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
  const assetPickerSettings = normalizeTimelineStepAssetSettings(assetPickerStep?.assetSettings);
  const assetPickerPreviewAsset =
    assetPickerPreviewAssetId !== null ? assetMap.get(assetPickerPreviewAssetId) ?? null : null;
  const assetPickerPreviewUrl = assetPickerPreviewAsset
    ? assetPickerPreviewUrls[assetPickerPreviewAsset.id] ?? null
    : null;
  const assetPickerAssignedPreviewUrl = assetPickerAssignedAsset
    ? assetPickerPreviewUrls[assetPickerAssignedAsset.id] ?? null
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
    if (!assetPickerStep) {
      setAssetPickerTab('choose');
      setAssetPickerPreviewAssetId(null);
      return;
    }

    setAssetPickerTab('choose');
    setAssetPickerPreviewAssetId(assetPickerShader?.inputAssetId ?? assets[0]?.id ?? null);
  }, [assetPickerStep?.id]);

  const updateAssetPickerSettings = (patch: Partial<TimelineStepAssetSettings>) => {
    if (!assetPickerStep) {
      return;
    }

    onStepChange(assetPickerStep.id, {
      assetSettings: {
        ...assetPickerSettings,
        ...patch,
      },
    });
  };

  const toggleAddShaderSelection = (shaderId: string) => {
    setSelectedAddShaderIds((currentIds) =>
      currentIds.includes(shaderId)
        ? currentIds.filter((currentId) => currentId !== shaderId)
        : [...currentIds, shaderId],
    );
  };

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
          <div className="timeline-view-mode-switch" role="group" aria-label="Timeline editor view">
            {EDITOR_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`icon-button timeline-view-button ${
                  sequence.editorView === option.value ? 'timeline-view-button-active' : ''
                }`}
                aria-label={option.label}
                title={option.title}
                onClick={() => onEditorViewChange(option.value)}
              >
                <ViewModeIcon mode={option.value} />
              </button>
              ))}
          </div>

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

          <div className="timeline-shared-transition-toolbar">
            <button
              type="button"
              className={`toggle-chip timeline-shared-transition-toggle ${
                usesSharedTransition ? 'toggle-chip-active' : ''
              }`}
              disabled={sharedTransitionLocked}
              title={
                sequence.mode === 'double'
                  ? 'Double Mix keeps one shared transition while two random shader streams move at different speeds.'
                  : sharedTransitionLocked
                    ? 'Random Mix uses one shared transition for the whole sequence.'
                    : 'Use the same mix effect and time for every transition.'
              }
              onClick={() =>
                onSharedTransitionChange({
                  sharedTransitionEnabled: !sequence.sharedTransitionEnabled,
                })
              }
            >
              <SharedMixIcon />
              <span>Shared Mix</span>
            </button>

            {usesSharedTransition ? (
              <>
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

                <label className="field timeline-compact-field timeline-shared-transition-field">
                  <span>Time</span>
                  <input
                    className="text-field"
                    type="number"
                    min={0}
                    step={1}
                    value={sequence.sharedTransitionDurationSeconds}
                    onChange={(event) =>
                      onSharedTransitionChange({
                        sharedTransitionDurationSeconds: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </>
            ) : null}
          </div>

          <label className="field timeline-compact-field timeline-card-size-field">
            <span>Cards</span>
            <input
              className="timeline-card-size-slider"
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={cardScale}
              aria-label="Timeline shader card size"
              title="Timeline shader card size"
              onChange={(event) => setCardScale(Number(event.target.value))}
            />
          </label>

          <div className="timeline-add-toolbar" ref={addMenuRef}>
            <button
              type="button"
              className={`secondary-button timeline-add-trigger ${
                isAddMenuOpen ? 'timeline-add-trigger-active' : ''
              }`}
              aria-haspopup="dialog"
              aria-expanded={isAddMenuOpen}
              onClick={() => setIsAddMenuOpen((currentValue) => !currentValue)}
            >
              <span>Add Shader</span>
              {selectedAddShaderCount > 0 ? (
                <span className="timeline-add-count">{selectedAddShaderCount}</span>
              ) : null}
              <ChevronDownIcon />
            </button>

            <button
              type="button"
              className="icon-button timeline-add-submit-button"
              aria-label="Add selected shaders to timeline"
              title="Add selected shaders to timeline"
              disabled={selectedAddShaderCount === 0}
              onClick={() => {
                if (selectedAddShaderCount === 0) {
                  return;
                }
                onAddStepsWithShaders(selectedAddShaderIds);
                setSelectedAddShaderIds([]);
                setIsAddMenuOpen(false);
              }}
            >
              <PlusIcon />
            </button>

            {isAddMenuOpen ? (
              <div className="timeline-add-popover" role="dialog" aria-label="Select shaders to add">
                <div className="timeline-add-popover-copy">
                  <strong>Pick shaders</strong>
                  <span>Choose one or more shaders to append to the timeline.</span>
                </div>

                <div className="timeline-add-option-list">
                  {addableShaders.map((shader) => {
                    const isSelected = selectedAddShaderIds.includes(shader.id);
                    return (
                      <label
                        key={shader.id}
                        className={`timeline-add-option ${
                          isSelected ? 'timeline-add-option-active' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAddShaderSelection(shader.id)}
                        />
                        <span className="timeline-add-option-copy">
                          <strong>{shader.name}</strong>
                          <small>{shader.group ?? 'Shader'}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
              className={`icon-button timeline-toggle-icon-button ${
                sequence.randomChoiceEnabled ? 'timeline-toggle-icon-button-active' : ''
              }`}
              aria-label="Random timeline choice"
              title="Random timeline choice"
              onClick={onToggleRandomChoice}
            >
              <RandomChoiceIcon />
            </button>

            <button type="button" className="secondary-button" onClick={onPlayToggle}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button type="button" className="secondary-button" onClick={onReset}>
              Reset
            </button>
          </div>

        </div>
      </div>

      <div
        className="timeline-flow-strip"
        role="list"
        aria-label="Shader timeline flow"
        style={flowStripStyle}
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
                role="button"
                tabIndex={0}
                aria-pressed={step.id === editingStepId}
                onClick={() => onEditStep(step.id)}
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
                  <select
                    className="select-field"
                    value={step.shaderId}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onStepChange(step.id, { shaderId: event.target.value })}
                  >
                    {savedShaders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.isTemporary ? `${item.name} (Timeline)` : item.name}
                      </option>
                    ))}
                  </select>
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

            <div className="timeline-asset-dialog-tabs" role="tablist" aria-label="Asset dialog tabs">
              <button
                type="button"
                role="tab"
                aria-selected={assetPickerTab === 'choose'}
                className={`secondary-button ${
                  assetPickerTab === 'choose' ? 'timeline-add-trigger-active' : ''
                }`}
                onClick={() => setAssetPickerTab('choose')}
              >
                Choose Asset
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={assetPickerTab === 'settings'}
                className={`secondary-button ${
                  assetPickerTab === 'settings' ? 'timeline-add-trigger-active' : ''
                }`}
                onClick={() => setAssetPickerTab('settings')}
              >
                Asset Settings
              </button>
            </div>

            <div className="dialog-body timeline-asset-dialog-body">
              {assetPickerTab === 'choose' ? (
                <>
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
                        Selecting a card assigns it immediately and opens the settings tab.
                      </p>
                    </div>
                  </div>

                  <div className="asset-browser-gallery-shell">
                    <div className="field-inline-label">
                      <span>Library Assets</span>
                      <small>{assets.length} items</small>
                    </div>

                    <button
                      type="button"
                      className={`secondary-button ${
                        !assetPickerShader.inputAssetId ? 'timeline-add-trigger-active' : ''
                      }`}
                      onClick={() => {
                        onAssignStepAsset(assetPickerStep.id, null);
                        setAssetPickerPreviewAssetId(null);
                      }}
                    >
                      Use Live Stage Asset
                    </button>

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
                                setAssetPickerTab('settings');
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
                </>
              ) : (
                <>
                  <div className="asset-browser-preview-column">
                    <div className="asset-browser-preview-shell timeline-asset-preview-shell">
                      {assetPickerAssignedAsset && assetPickerAssignedPreviewUrl ? (
                        assetPickerAssignedAsset.kind === 'video' ? (
                          <video
                            className="asset-browser-preview-media"
                            src={assetPickerAssignedPreviewUrl}
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        ) : (
                          <img
                            className="asset-browser-preview-media"
                            src={assetPickerAssignedPreviewUrl}
                            alt={assetPickerAssignedAsset.name}
                          />
                        )
                      ) : (
                        <div className="asset-browser-preview-placeholder">
                          This step is using the live stage asset. Choose a library asset first to apply
                          clip timing and media-specific blend settings.
                        </div>
                      )}
                    </div>

                    <div className="stack gap-sm">
                      <div className="field-inline-label">
                        <span>Assigned Source</span>
                        <small>
                          {assetPickerAssignedAsset
                            ? `${assetPickerAssignedAsset.name} | ${assetPickerAssignedAsset.kind}`
                            : 'Live stage asset'}
                        </small>
                      </div>
                      <p className="helper-copy">
                        Placement, mix, quality, and clip timing are saved on this timeline step.
                      </p>
                    </div>
                  </div>

                  <div className="timeline-asset-settings-grid">
                    <label className="field">
                      <span>Size X</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0.1}
                        max={4}
                        step={0.05}
                        value={assetPickerSettings.scaleX}
                        onChange={(event) =>
                          updateAssetPickerSettings({ scaleX: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Size Y</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0.1}
                        max={4}
                        step={0.05}
                        value={assetPickerSettings.scaleY}
                        onChange={(event) =>
                          updateAssetPickerSettings({ scaleY: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Offset X</span>
                      <input
                        className="text-field"
                        type="number"
                        min={-1.5}
                        max={1.5}
                        step={0.05}
                        value={assetPickerSettings.offsetX}
                        onChange={(event) =>
                          updateAssetPickerSettings({ offsetX: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Offset Y</span>
                      <input
                        className="text-field"
                        type="number"
                        min={-1.5}
                        max={1.5}
                        step={0.05}
                        value={assetPickerSettings.offsetY}
                        onChange={(event) =>
                          updateAssetPickerSettings({ offsetY: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Transparency</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={assetPickerSettings.opacity}
                        onChange={(event) =>
                          updateAssetPickerSettings({ opacity: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Blend</span>
                      <select
                        className="select-field"
                        value={assetPickerSettings.blendMode}
                        onChange={(event) =>
                          updateAssetPickerSettings({
                            blendMode: event.target.value as TimelineStepAssetSettings['blendMode'],
                          })
                        }
                      >
                        {TIMELINE_ASSET_BLEND_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Fit</span>
                      <select
                        className="select-field"
                        value={assetPickerSettings.fitMode}
                        onChange={(event) =>
                          updateAssetPickerSettings({
                            fitMode: event.target.value as TimelineStepAssetSettings['fitMode'],
                          })
                        }
                      >
                        {TIMELINE_ASSET_FIT_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Quality</span>
                      <select
                        className="select-field"
                        value={assetPickerSettings.quality}
                        onChange={(event) =>
                          updateAssetPickerSettings({
                            quality: event.target.value as TimelineStepAssetSettings['quality'],
                          })
                        }
                      >
                        {TIMELINE_ASSET_QUALITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Clip Start</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0}
                        step={0.1}
                        disabled={assetPickerAssignedAsset?.kind !== 'video'}
                        value={assetPickerSettings.clipStartSeconds}
                        onChange={(event) =>
                          updateAssetPickerSettings({
                            clipStartSeconds: Number(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Time Length</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0.1}
                        step={0.1}
                        placeholder="Auto"
                        disabled={assetPickerAssignedAsset?.kind !== 'video'}
                        value={assetPickerSettings.clipDurationSeconds ?? ''}
                        onChange={(event) =>
                          updateAssetPickerSettings({
                            clipDurationSeconds: event.target.value.trim()
                              ? Number(event.target.value)
                              : null,
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
