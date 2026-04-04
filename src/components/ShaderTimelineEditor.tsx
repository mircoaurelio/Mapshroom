import { clampTimelineStepDuration, clampTransitionDuration, TIMELINE_TRANSITION_EFFECT_OPTIONS } from '../lib/timeline';
import type { SavedShader, TimelineStub, TimelineTransitionEffect } from '../types';

interface ShaderTimelineEditorProps {
  savedShaders: SavedShader[];
  activeShaderId: string;
  sequence: TimelineStub['shaderSequence'];
  totalDurationSeconds: number;
  onEnabledChange: (enabled: boolean) => void;
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
  onStepChange,
  onAddStep,
  onRemoveStep,
  onMoveStep,
}: ShaderTimelineEditorProps) {
  return (
    <section className="timeline-sequence-editor">
      <div className="timeline-sequence-header">
        <div className="timeline-sequence-copy">
          <span className="timeline-sequence-label">Shader Sequence</span>
          <strong className="timeline-sequence-title">
            {sequence.steps.length} step{sequence.steps.length === 1 ? '' : 's'} ·{' '}
            {formatStepDuration(totalDurationSeconds)}
          </strong>
        </div>

        <button
          type="button"
          className={`toggle-chip ${sequence.enabled ? 'toggle-chip-active' : ''}`}
          onClick={() => onEnabledChange(!sequence.enabled)}
        >
          {sequence.enabled ? 'Sequence On' : 'Sequence Off'}
        </button>
      </div>

      <div className="timeline-sequence-cards">
        {sequence.steps.map((step, index) => {
          const isLast = index === sequence.steps.length - 1;

          return (
            <article
              key={step.id}
              className={`timeline-step-card ${step.shaderId === activeShaderId ? 'timeline-step-card-active' : ''}`}
            >
              <div className="timeline-step-header">
                <span className="timeline-step-badge">Step {index + 1}</span>
                <div className="timeline-step-actions">
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
                    Down
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={sequence.steps.length === 1}
                    onClick={() => onRemoveStep(step.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Shader</span>
                <select
                  className="select-field"
                  value={step.shaderId}
                  onChange={(event) => onStepChange(step.id, { shaderId: event.target.value })}
                >
                  {savedShaders.map((shader) => (
                    <option key={shader.id} value={shader.id}>
                      {shader.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="timeline-step-grid">
                <label className="field">
                  <span>Duration</span>
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

                <label className="field">
                  <span>Transition</span>
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

              <label className="field">
                <span>Effect Into Next Shader</span>
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

              <p className="timeline-step-note">
                {isLast
                  ? 'The final transition is used when loop is on and the sequence returns to step 1.'
                  : 'The transition plays during the tail of this step before the next shader takes over.'}
              </p>
            </article>
          );
        })}
      </div>

      <div className="timeline-sequence-footer">
        <button type="button" className="secondary-button" onClick={onAddStep}>
          Add Step
        </button>
      </div>
    </section>
  );
}
