import { useEffect, useState } from 'react';
import type {
  SavedShader,
  ShaderUniformMap,
  ShaderUniformValue,
  ShaderUniformValueMap,
  ShaderVersion,
} from '../types';
import { hexToRgb, rgbToHex } from '../lib/shader';
import { PanelSection } from './PanelSection';
import { ShaderPresetLibrary } from './ShaderPresetLibrary';

interface StudioPanelProps {
  savedShaders: SavedShader[];
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
  onBrowsePresets: () => void;
  onReloadShaderCode: () => void;
  canReloadShaderCode: boolean;
  versions: ShaderVersion[];
  onRestoreVersion: (versionId: string) => void;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="7" y="5" width="9" height="11" rx="1.5" />
      <path d="M5.5 12.5H4.75A1.75 1.75 0 0 1 3 10.75v-7A1.75 1.75 0 0 1 4.75 2h7A1.75 1.75 0 0 1 13.5 3.75v.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5 7.25 13.75 16 5" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10A6 6 0 1 1 14.24 5.76" />
      <path d="M12.5 2.5H16V6" />
    </svg>
  );
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
  onBrowsePresets,
  onReloadShaderCode,
  canReloadShaderCode,
  versions,
  onRestoreVersion,
}: StudioPanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const activeShaderName =
    savedShaders.find((shader) => shader.id === activeShaderId)?.name ?? 'Custom Shader';
  const copyLabel =
    copyState === 'copied' ? 'Code copied' : copyState === 'error' ? 'Copy failed' : 'Copy code';

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  const handleCopyCode = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable.');
      }

      await navigator.clipboard.writeText(shaderCode);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <>
      <PanelSection title="Shader Studio">
        <div className="stack gap-md">
          <div className="stack gap-sm">
            <div className="field-inline-label">
              <span>Current Shader</span>
              <small>{activeShaderName}</small>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={onBrowsePresets}>
                See Presets
              </button>
            </div>
            <ShaderPresetLibrary
              presets={savedShaders}
              activeShaderId={activeShaderId}
              onSelectShader={onSelectShader}
            />
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

      <PanelSection
        title="Code"
        actions={
          <>
            <button
              type="button"
              className={`icon-button ${
                copyState === 'copied'
                  ? 'icon-button-success'
                  : copyState === 'error'
                    ? 'icon-button-error'
                    : ''
              }`}
              aria-label={copyLabel}
              title={copyLabel}
              onClick={() => {
                void handleCopyCode();
              }}
            >
              {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Reload code from the latest version"
              title="Reload code from the latest version"
              disabled={!canReloadShaderCode}
              onClick={onReloadShaderCode}
            >
              <ReloadIcon />
            </button>
          </>
        }
      >
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
