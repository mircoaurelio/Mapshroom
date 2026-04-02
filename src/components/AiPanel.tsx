import { PanelSection } from './PanelSection';

interface AiPanelProps {
  prompt: string;
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function AiPanel({
  prompt,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  onPromptChange,
  onSubmit,
}: AiPanelProps) {
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
        <textarea
          className="prompt-field prompt-field-hero"
          aria-label="Shader prompt"
          placeholder="Describe the shader you want to create or transform..."
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />

        {shaderError ? <div className="error-panel shader-chat-error">{shaderError}</div> : null}

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
