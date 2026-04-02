import { DEFAULT_OPENAI_RESPONSE_MODEL_OPTIONS } from '../config';
import { PanelSection } from './PanelSection';

interface AiPanelProps {
  openaiApiKey: string;
  runwayApiKey: string;
  shaderModel: string;
  prompt: string;
  aiLoading: boolean;
  onOpenAiKeyChange: (value: string) => void;
  onRunwayKeyChange: (value: string) => void;
  onShaderModelChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function AiPanel({
  openaiApiKey,
  runwayApiKey,
  shaderModel,
  prompt,
  aiLoading,
  onOpenAiKeyChange,
  onRunwayKeyChange,
  onShaderModelChange,
  onPromptChange,
  onSubmit,
}: AiPanelProps) {
  return (
    <PanelSection title="Shader AI" eyebrow="OpenAI">
      <div className="stack gap-md">
        <label className="field">
          <span>OpenAI API Key</span>
          <input
            className="text-field"
            type="password"
            value={openaiApiKey}
            onChange={(event) => onOpenAiKeyChange(event.target.value)}
            placeholder="sk-..."
          />
        </label>
        <label className="field">
          <span>OpenAI Shader Model</span>
          <select
            className="select-field"
            value={shaderModel}
            onChange={(event) => onShaderModelChange(event.target.value)}
          >
            {DEFAULT_OPENAI_RESPONSE_MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Runway Key Placeholder</span>
          <input
            className="text-field"
            type="password"
            value={runwayApiKey}
            onChange={(event) => onRunwayKeyChange(event.target.value)}
            placeholder="Stored now, activated in V3.1"
          />
        </label>
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
          {aiLoading ? 'Mutating Shader...' : 'Run OpenAI Shader Edit'}
        </button>
        <p className="helper-copy">
          OpenAI drives shader mutation in V3. The Runway key is already stored for the V3.1 media release.
        </p>
      </div>
    </PanelSection>
  );
}
