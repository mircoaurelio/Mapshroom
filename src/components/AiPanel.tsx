import type { ShaderProvider } from '../types';
import { PanelSection } from './PanelSection';

interface AiPanelProps {
  shaderProvider: ShaderProvider;
  activeModel: string;
  prompt: string;
  aiLoading: boolean;
  onShaderProviderChange: (value: ShaderProvider) => void;
  onPromptChange: (value: string) => void;
  onOpenSettings: () => void;
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
  onShaderProviderChange,
  onPromptChange,
  onOpenSettings,
  onSubmit,
}: AiPanelProps) {
  const providerLabel = getProviderLabel(shaderProvider);

  return (
    <PanelSection title="Shader AI" eyebrow="Inference">
      <div className="stack gap-md">
        <label className="field">
          <span>Shader Provider</span>
          <select
            className="select-field"
            value={shaderProvider}
            onChange={(event) => onShaderProviderChange(event.target.value as ShaderProvider)}
          >
            <option value="openai">OpenAI</option>
            <option value="google">Google Gemini</option>
          </select>
        </label>

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
            Manage OpenAI, Google, and Runway keys in the dedicated AI settings dialog.
          </p>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onOpenSettings}>
            Manage APIs
          </button>
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
