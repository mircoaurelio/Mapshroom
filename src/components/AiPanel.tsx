import { PanelSection } from './PanelSection';

interface AiPanelProps {
  prompt: string;
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  targetLabel?: string | null;
  targetStatus?: string | null;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onFixError: () => void;
}

export function AiPanel({
  prompt,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  targetLabel,
  targetStatus,
  onPromptChange,
  onSubmit,
  onFixError,
}: AiPanelProps) {
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
        {targetLabel ? (
          <div className="draft-target-banner">
            <div>
              <strong>{targetLabel}</strong>
              <p>AI edits apply to this temporary timeline shader.</p>
            </div>
            {targetStatus ? <span className="draft-target-status">{targetStatus}</span> : null}
          </div>
        ) : null}

        <textarea
          className="prompt-field prompt-field-hero"
          aria-label="Shader prompt"
          placeholder="Describe the shader you want to create or transform..."
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />

        {shaderError ? (
          <div className="error-panel shader-chat-error">
            {shaderError}
            <button
              type="button"
              className="fix-error-button"
              disabled={aiLoading}
              onClick={onFixError}
            >
              {aiLoading ? 'Fixing...' : 'Fix Error'}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="primary-button primary-button-hero"
          disabled={aiLoading}
          onClick={onSubmit}
        >
          {aiLoading ? 'Generating And Applying...' : 'Generate Shader'}
        </button>

        {showFeedback ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
