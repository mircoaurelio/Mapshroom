import type { ShaderProvider } from '../types';
import { PanelSection } from './PanelSection';

interface AiPanelProps {
  shaderProvider: ShaderProvider;
  activeModel: string;
  prompt: string;
  aiLoading: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

function getProviderLabel(shaderProvider: ShaderProvider): string {
  return shaderProvider === 'google' ? 'Google Gemini' : 'OpenAI';
}

export function AiPanel({
  shaderProvider,
  activeModel,
  prompt,
  aiLoading,
  onPromptChange,
  onSubmit,
}: AiPanelProps) {
  const providerLabel = getProviderLabel(shaderProvider);

  return (
    <PanelSection title="Shader Chat" eyebrow="Inference">
      <div className="stack gap-md">
        <div className="status-card">
          <div className="status-card-row">
            <span className="status-card-label">Active Engine</span>
            <span className="status-pill">{providerLabel}</span>
          </div>
          <div className="status-card-row">
            <span className="status-card-label">Model</span>
            <strong className="status-card-value">{activeModel}</strong>
          </div>
          <p className="helper-copy">
            Provider, models, and keys now live only in the API dialog.
          </p>
        </div>

        <label className="field">
          <span>Shader Command</span>
          <textarea
            className="prompt-field"
            placeholder="Describe the shader change you want..."
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
          />
        </label>

        <button type="button" className="primary-button" disabled={aiLoading} onClick={onSubmit}>
          {aiLoading ? `Running ${providerLabel}...` : `Run ${providerLabel} Shader Edit`}
        </button>
      </div>
    </PanelSection>
  );
}
