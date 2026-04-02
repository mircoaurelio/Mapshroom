import { PanelSection } from './PanelSection';

interface AiPanelProps {
  prompt: string;
  aiLoading: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function AiPanel({
  prompt,
  aiLoading,
  onPromptChange,
  onSubmit,
}: AiPanelProps) {
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

        <button
          type="button"
          className="primary-button primary-button-hero"
          disabled={aiLoading}
          onClick={onSubmit}
        >
          {aiLoading ? 'Generating...' : 'Generate Shader'}
        </button>
      </div>
    </PanelSection>
  );
}
