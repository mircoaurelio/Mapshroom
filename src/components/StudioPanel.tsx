import type {
  ShaderUniformMap,
  ShaderUniformValue,
  ShaderUniformValueMap,
  ShaderVersion,
} from '../types';
import { hexToRgb, rgbToHex } from '../lib/shader';
import { PanelSection } from './PanelSection';

interface SavedShaderOption {
  id: string;
  name: string;
}

interface StudioPanelProps {
  savedShaders: SavedShaderOption[];
  activeShaderId: string;
  onNewShader: () => void;
  onSelectShader: (shaderId: string) => void;
  onSaveShader: () => void;
  onResetClock: () => void;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  newUniformName: string;
  onNewUniformNameChange: (value: string) => void;
  onQuickAddUniform: () => void;
  shaderCode: string;
  onShaderCodeChange: (value: string) => void;
  compilerError: string;
  aiLoading: boolean;
  onFixError: () => void;
  versions: ShaderVersion[];
  onRestoreVersion: (versionId: string) => void;
}

export function StudioPanel({
  savedShaders,
  activeShaderId,
  onNewShader,
  onSelectShader,
  onSaveShader,
  onResetClock,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  newUniformName,
  onNewUniformNameChange,
  onQuickAddUniform,
  shaderCode,
  onShaderCodeChange,
  compilerError,
  aiLoading,
  onFixError,
  versions,
  onRestoreVersion,
}: StudioPanelProps) {
  return (
    <>
      <PanelSection title="Shader Studio">
        <div className="stack gap-md">
          <div className="stack gap-sm">
            <label className="field">
              <span className="field-inline-label">
                <span>Preset Library</span>
              </span>
              <select
                className="preset-select"
                value={activeShaderId}
                onChange={(event) => onSelectShader(event.target.value)}
              >
                {savedShaders.map((shader) => (
                  <option key={shader.id} value={shader.id}>
                    {shader.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={onNewShader}>
              New Shader
            </button>
            <button type="button" className="secondary-button" onClick={onSaveShader}>
              Save
            </button>
            <button type="button" className="secondary-button" onClick={onResetClock}>
              Reset Clock
            </button>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Uniform Map">
        <div className="stack gap-md">
          {Object.keys(uniformDefinitions).length === 0 ? (
            <p className="empty-copy">No live uniforms are declared in this shader.</p>
          ) : (
            Object.entries(uniformDefinitions).map(([name, definition]) => {
              const value = uniformValues[name];
              if (value === undefined) {
                return null;
              }

              return (
                <label className="field" key={name}>
                  <span className="field-inline-label">
                    <span>{name}</span>
                    {(definition.type === 'float' || definition.type === 'int') && (
                      <small>{Number(value).toFixed(definition.type === 'int' ? 0 : 2)}</small>
                    )}
                  </span>
                  {definition.type === 'float' || definition.type === 'int' ? (
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.type === 'int' ? 1 : (definition.max - definition.min) / 100}
                      value={Number(value)}
                      onChange={(event) => onUniformChange(name, Number(event.target.value))}
                    />
                  ) : null}
                  {definition.type === 'bool' ? (
                    <button
                      type="button"
                      className={`toggle-chip ${value ? 'toggle-chip-active' : ''}`}
                      onClick={() => onUniformChange(name, !value)}
                    >
                      {value ? 'Enabled' : 'Disabled'}
                    </button>
                  ) : null}
                  {definition.type === 'vec3' && Array.isArray(value) ? (
                    <input
                      type="color"
                      value={rgbToHex(value)}
                      onChange={(event) => onUniformChange(name, hexToRgb(event.target.value))}
                    />
                  ) : null}
                </label>
              );
            })
          )}
          <div className="inline-form">
            <input
              className="text-field"
              placeholder="New variable..."
              value={newUniformName}
              onChange={(event) => onNewUniformNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onQuickAddUniform();
                }
              }}
            />
            <button type="button" className="secondary-button" onClick={onQuickAddUniform}>
              Add
            </button>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Version Trail">
        <div className="version-list">
          {[...versions].reverse().map((version) => (
            <article className="version-card" key={version.id}>
              <div>
                <strong>{version.name}</strong>
                <p>{version.prompt}</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onRestoreVersion(version.id)}
              >
                Restore
              </button>
            </article>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="GLSL Core">
        <div className="stack gap-md">
          <textarea
            className="code-editor"
            value={shaderCode}
            spellCheck={false}
            onChange={(event) => onShaderCodeChange(event.target.value)}
          />
          {compilerError ? (
            <div className="error-panel">
              {compilerError}
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
        </div>
      </PanelSection>
    </>
  );
}
