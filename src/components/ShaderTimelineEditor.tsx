import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  TIMELINE_SEQUENCE_MODE_OPTIONS,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import type {
  SavedShader,
  TimelineSequenceMode,
  TimelineStub,
  TimelineTransitionEffect,
} from '../types';

interface ShaderTimelineEditorProps {
  savedShaders: SavedShader[];
  activeShaderId: string;
  sequence: TimelineStub['shaderSequence'];
  totalDurationSeconds: number;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: TimelineSequenceMode) => void;
  onStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onAddStep: () => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: -1 | 1) => void;
}

function formatStepDuration(seconds: number): string {
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

export function ShaderTimelineEditor({
  savedShaders,
  activeShaderId,
  sequence,
  totalDurationSeconds,
  onEnabledChange,
  onModeChange,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onMoveStep,
}: ShaderTimelineEditorProps) {
  const title = sequence.mode === 'random' ? 'Random Shader Flow' : 'Shader Sequence';

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
            className={`toggle-chip ${sequence.enabled ? 'toggle-chip-active' : ''}`}
            onClick={() => onEnabledChange(!sequence.enabled)}
          >
            {sequence.enabled ? 'On' : 'Off'}
          </button>

          <div className="timeline-mode-switch">
            {TIMELINE_SEQUENCE_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`timeline-mode-button ${
                  sequence.mode === option.value ? 'timeline-mode-button-active' : ''
                }`}
                onClick={() => onModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button type="button" className="secondary-button" onClick={onAddStep}>
            Add Shader
          </button>
        </div>
      </div>

      <div className="timeline-flow-strip" role="list" aria-label="Shader timeline flow">
        {sequence.steps.map((step, index) => {
          const shader = savedShaders.find((item) => item.id === step.shaderId);
          const isLast = index === sequence.steps.length - 1;

          return (
            <div className="timeline-flow-node" key={step.id} role="listitem">
              <article
                className={`timeline-step-card ${
                  step.shaderId === activeShaderId ? 'timeline-step-card-active' : ''
                }`}
              >
                <div className="timeline-step-header">
                  <span className="timeline-step-badge">
                    {sequence.mode === 'random' ? `Pool ${index + 1}` : `Step ${index + 1}`}
                  </span>

                  <div className="timeline-step-actions">
                    {sequence.mode === 'sequence' ? (
                      <>
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={index === 0}
                          onClick={() => onMoveStep(step.id, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={isLast}
                          onClick={() => onMoveStep(step.id, 1)}
                        >
                          Dn
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      className="ghost-button"
                      disabled={sequence.steps.length === 1}
                      onClick={() => onRemoveStep(step.id)}
                    >
                      Del
                    </button>
                  </div>
                </div>

                <label className="field timeline-compact-field">
                  <span>Shader</span>
                  <select
                    className="select-field"
                    value={step.shaderId}
                    onChange={(event) => onStepChange(step.id, { shaderId: event.target.value })}
                  >
                    {savedShaders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="timeline-step-chip-row">
                  <span className="timeline-step-chip">{shader?.name ?? 'Unknown shader'}</span>
                  {step.shaderId === activeShaderId ? (
                    <span className="timeline-step-chip timeline-step-chip-live">Live</span>
                  ) : null}
                </div>

                <div className="timeline-step-grid">
                  <label className="field timeline-compact-field">
                    <span>Hold</span>
                    <input
                      className="text-field"
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={step.durationSeconds}
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
                      step={0.1}
                      value={step.transitionDurationSeconds}
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
              </article>

              {!isLast ? (
                <div className="timeline-flow-connector" aria-hidden="true">
                  <span className="timeline-flow-arrow">
                    {sequence.mode === 'random' ? 'Random' : 'Next'}
                  </span>
                  <span className="timeline-flow-transition">
                    {step.transitionEffect} / {formatStepDuration(step.transitionDurationSeconds)}
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
