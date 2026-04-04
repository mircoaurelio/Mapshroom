import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
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
import type {
  AssetKind,
  SavedShader,
  ShaderUniformValueMap,
  TimelineEditorViewMode,
  TimelineSequenceMode,
  TimelineStub,
  TimelineTransitionEffect,
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
  isActiveShaderSaved: boolean;
  editingStepId: string | null;
  activeStepId: string | null;
  transitionStepId: string | null;
  sequence: TimelineStub['shaderSequence'];
  totalDurationSeconds: number;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: TimelineSequenceMode) => void;
  onEditorViewChange: (editorView: TimelineEditorViewMode) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onReset: () => void;
  onToggleSingleStepLoop: () => void;
  onToggleRandomChoice: () => void;
  onSharedTransitionChange: (patch: {
    sharedTransitionEffect?: TimelineTransitionEffect;
    sharedTransitionDurationSeconds?: number;
  }) => void;
  onStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onAddStep: () => void;
  onAddStepWithShader: (shaderId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: -1 | 1) => void;
  onEditStep: (stepId: string) => void;
  onSaveCurrentShader: () => void;
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

function MoveBackIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.75 3.5 5 8l4.75 4.5" />
    </svg>
  );
}

function MoveForwardIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m6.25 3.5 4.75 4.5-4.75 4.5" />
    </svg>
  );
}

function RepeatSingleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h7.5a2 2 0 0 1 0 4H6" />
      <path d="m4.25 2.75-1.75 1.75 1.75 1.75" />
      <path d="M8 9.5h5" />
      <path d="m11.5 7.75 1.75 1.75-1.75 1.75" />
      <path d="M5.75 12.5V7" />
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

export function ShaderTimelineEditor({
  assetKind,
  assetUrl,
  savedShaders,
  activeShaderId,
  isActiveShaderSaved,
  editingStepId,
  activeStepId,
  transitionStepId,
  sequence,
  totalDurationSeconds,
  onEnabledChange,
  onModeChange,
  onEditorViewChange,
  isPlaying,
  onPlayToggle,
  onReset,
  onToggleSingleStepLoop,
  onToggleRandomChoice,
  onSharedTransitionChange,
  onStepChange,
  onAddStep,
  onAddStepWithShader,
  onDuplicateStep,
  onRemoveStep,
  onMoveStep,
  onEditStep,
  onSaveCurrentShader,
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
  const [addShaderId, setAddShaderId] = useState(activeShaderId);
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

      nextShaders.set(`${shader.id}\u0000${shader.code}`, shader);
    }

    return Array.from(nextShaders.values());
  }, [sequence.steps, shaderMap]);
  const isAdvancedView = sequence.editorView === 'advanced';
  const usesSharedTransition = sequence.mode === 'randomMix';

  useEffect(() => {
    if (addableShaders.some((shader) => shader.id === addShaderId)) {
      return;
    }

    if (addableShaders.some((shader) => shader.id === activeShaderId)) {
      setAddShaderId(activeShaderId);
      return;
    }

    setAddShaderId(addableShaders[0]?.id ?? '');
  }, [activeShaderId, addShaderId, addableShaders]);

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
      const previewKey = `${previewNamespace}\u0000${shader.id}\u0000${shader.code}\u0000${getUniformValuesPreviewSignature(shader.uniformValues)}`;
      const cachedPreview =
        previewSourceRef.current[previewKey] ??
        renderShaderPreviewToDataUrl(
          shader.code,
          shader.uniformValues,
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
  const selectedAddShader = addableShaders.find((shader) => shader.id === addShaderId) ?? null;
  const liveShaderButtonLabel = isActiveShaderSaved ? 'Add Live' : 'Save + Add Live';

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
            className={`toggle-chip ${sequence.enabled ? 'toggle-chip-active' : ''}`}
            onClick={() => onEnabledChange(!sequence.enabled)}
          >
            {sequence.enabled ? 'On' : 'Off'}
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

      <div className="timeline-add-bar">
        <label className="field timeline-compact-field timeline-add-field">
          <span>Add Shader</span>
          <select
            className="select-field"
            value={addShaderId}
            onChange={(event) => setAddShaderId(event.target.value)}
          >
            {addableShaders.map((shader) => (
              <option key={shader.id} value={shader.id}>
                {shader.id === activeShaderId && !isActiveShaderSaved
                  ? `${shader.name} (Live)`
                  : shader.name}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-add-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!selectedAddShader}
            onClick={() => {
              if (selectedAddShader) {
                onAddStepWithShader(selectedAddShader.id);
              }
            }}
          >
            Add Selected
          </button>

          <button type="button" className="secondary-button" onClick={onAddStep}>
            {liveShaderButtonLabel}
          </button>

          {!isActiveShaderSaved ? (
            <button type="button" className="ghost-button" onClick={onSaveCurrentShader}>
              Save Live
            </button>
          ) : null}
        </div>
      </div>

      {usesSharedTransition ? (
        <div className="timeline-mix-bar">
          <label className="field timeline-compact-field">
            <span>Mix Fx</span>
            <select
              className="select-field"
              value={sequence.sharedTransitionEffect}
              onChange={(event) =>
                onSharedTransitionChange({
                  sharedTransitionEffect: event.target.value as TimelineTransitionEffect,
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

          <label className="field timeline-compact-field">
            <span>Mix Blend</span>
            <input
              className="text-field"
              type="number"
              min={0}
              step={0.1}
              value={sequence.sharedTransitionDurationSeconds}
              onChange={(event) =>
                onSharedTransitionChange({
                  sharedTransitionDurationSeconds: clampTransitionDuration(
                    600,
                    Number(event.target.value),
                  ),
                })
              }
            />
          </label>

          <p className="timeline-mix-copy">
            One transition is used for the whole random mix. The cards only choose shaders and hold
            time.
          </p>
        </div>
      ) : null}

      <div className="timeline-flow-strip" role="list" aria-label="Shader timeline flow">
        {sequence.steps.map((step, index) => {
          const shader = shaderMap.get(step.shaderId);
          const isLast = index === sequence.steps.length - 1;
          const isPlayingStep = step.id === activeStepId;
          const isTransitionStep = step.id === transitionStepId && transitionStepId !== activeStepId;
          const previewKey = shader
            ? `${previewNamespace}\u0000${shader.id}\u0000${shader.code}\u0000${getUniformValuesPreviewSignature(shader.uniformValues)}`
            : '';
          const previewSrc = shader ? previewSources[previewKey] ?? null : null;

          return (
            <div className="timeline-flow-node" key={step.id} role="listitem">
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
                    {isAdvancedView && sequence.mode === 'sequence' ? (
                      <>
                        <button
                          type="button"
                          className="icon-button timeline-step-overlay-button"
                          aria-label="Move shader earlier"
                          title="Move earlier"
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveStep(step.id, -1);
                          }}
                        >
                          <MoveBackIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-button timeline-step-overlay-button"
                          aria-label="Move shader later"
                          title="Move later"
                          disabled={isLast}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveStep(step.id, 1);
                          }}
                        >
                          <MoveForwardIcon />
                        </button>
                      </>
                    ) : null}

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
                        {item.isTemporary ? `${item.name} (Draft)` : item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="timeline-step-chip-row">
                  <span className="timeline-step-chip">{shader?.name ?? 'Unknown shader'}</span>
                  {shader?.isTemporary ? (
                    <span className="timeline-step-chip timeline-step-chip-draft">Draft</span>
                  ) : null}
                  {step.shaderId === activeShaderId ? (
                    <span className="timeline-step-chip timeline-step-chip-live">Live</span>
                  ) : null}
                  {usesSharedTransition ? (
                    <span className="timeline-step-chip">
                      {sequence.sharedTransitionEffect} /{' '}
                      {formatStepDuration(sequence.sharedTransitionDurationSeconds)}
                    </span>
                  ) : null}
                </div>

                {isAdvancedView && !usesSharedTransition ? (
                  <div className="timeline-step-grid">
                    <label className="field timeline-compact-field">
                      <span>Hold</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0.5}
                        step={0.01}
                        value={step.durationSeconds}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onStepChange(step.id, {
                            durationSeconds: clampTimelineStepDuration(Number(event.target.value)),
                          })
                        }
                      />
                    </label>

                    <label className="field timeline-compact-field">
                      <span>Fx</span>
                      <select
                        className="select-field"
                        value={step.transitionEffect}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onStepChange(step.id, {
                            transitionEffect: event.target.value as TimelineTransitionEffect,
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

                    <label className="field timeline-compact-field">
                      <span>Blend</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0}
                        step={0.01}
                        value={step.transitionDurationSeconds}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onStepChange(step.id, {
                            transitionDurationSeconds: clampTransitionDuration(
                              step.durationSeconds,
                              Number(event.target.value),
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <div className="timeline-step-simple-row">
                    <label className="field timeline-compact-field">
                      <span>Hold</span>
                      <input
                        className="text-field"
                        type="number"
                        min={0.5}
                        step={0.01}
                        value={step.durationSeconds}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onStepChange(step.id, {
                            durationSeconds: clampTimelineStepDuration(Number(event.target.value)),
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </article>

              {!isLast ? (
                <div className="timeline-flow-connector" aria-hidden="true">
                  <span className="timeline-flow-arrow">
                    {sequence.mode === 'randomMix'
                      ? 'Mix'
                      : sequence.mode === 'random'
                        ? 'Random'
                        : 'Next'}
                  </span>
                  <span className="timeline-flow-transition">
                    {usesSharedTransition
                      ? `${sequence.sharedTransitionEffect} / ${formatStepDuration(
                          sequence.sharedTransitionDurationSeconds,
                        )}`
                      : `${step.transitionEffect} / ${formatStepDuration(
                          step.transitionDurationSeconds,
                        )}`}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
