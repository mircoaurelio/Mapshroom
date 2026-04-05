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
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import type {
  AssetKind,
  SavedShader,
  ShaderUniformValueMap,
  TimelineEditorViewMode,
  TimelineSequenceMode,
  TimelineStagePreviewMode,
  TimelineStub,
} from '../types';

function getUniformValuesPreviewSignature(uniformValues: ShaderUniformValueMap | undefined): string {
  return JSON.stringify(
    Object.entries(uniformValues ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

interface ShaderTimelineEditorProps {
  assetKind: AssetKind | null;
  assetUrl: string | null;
  savedShaders: SavedShader[];
  activeShaderId: string;
  editingStepId: string | null;
  activeStepId: string | null;
  transitionStepId: string | null;
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

function getTimelineShaderPreviewKey(previewNamespace: string, shader: SavedShader): string {
  const renderCode = getRenderableShaderCode(shader);
  const renderUniformValues = getRenderableShaderUniformValues(shader);
  return `${previewNamespace}\u0000${shader.id}\u0000${renderCode}\u0000${getUniformValuesPreviewSignature(renderUniformValues)}`;
}

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
  assetKind,
  assetUrl,
  savedShaders,
  activeShaderId,
  editingStepId,
  activeStepId,
  transitionStepId,
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
  onAddStepsWithShaders,
  onDuplicateStep,
  onRemoveStep,
  onEditStep,
}: ShaderTimelineEditorProps) {
  const title =
    sequence.mode === 'randomMix'
      ? 'Random Mix'
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
  const previewRendererRef = useRef<ShaderPreviewRenderer | null>(null);
  const previewSourceRef = useRef<Record<string, string>>({});
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [selectedAddShaderIds, setSelectedAddShaderIds] = useState<string[]>([]);
  const [cardScale, setCardScale] = useState(1);
  const shaderMap = useMemo(
    () => new Map(savedShaders.map((shader) => [shader.id, shader])),
    [savedShaders],
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
  const isAdvancedView = sequence.editorView === 'advanced';
  const sharedTransitionLocked = sequence.mode === 'randomMix';
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
    if (!previewImage) {
      return;
    }

    const nextPreviewSources: Record<string, string> = {};

    for (const shader of sequenceShaders) {
      const renderCode = getRenderableShaderCode(shader);
      const renderUniformValues = getRenderableShaderUniformValues(shader);
      const previewKey = getTimelineShaderPreviewKey(previewNamespace, shader);
      const cachedPreview =
        previewSourceRef.current[previewKey] ??
        renderShaderPreviewToDataUrl(
          renderCode,
          renderUniformValues,
          previewImage,
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
  }, [previewImage, previewNamespace, sequenceShaders]);

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
                sharedTransitionLocked
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
                    step={0.01}
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
          const previewKey = shader ? getTimelineShaderPreviewKey(previewNamespace, shader) : '';
          const previewSrc = shader ? previewSources[previewKey] ?? null : null;
          const hasCompileError = hasShaderCompileError(shader);

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
                      disabled={sequence.steps.length === 1}
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

                  {hasCompileError || getPendingAiJobCount(shader) > 0 || shader?.hasUnreadAiResult ? (
                    <div className="timeline-step-preview-badges timeline-step-preview-badges-bottom">
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
    </section>
  );
}
