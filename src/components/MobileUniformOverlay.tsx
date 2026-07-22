import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { ShaderColorInput } from './ShaderColorInput';

interface MobileUniformOverlayProps {
  shaderName: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onClose: () => void;
  onPreviousShader: () => void;
  onNextShader: () => void;
  onFinishEditing: () => void;
}

export function MobileUniformOverlay({
  shaderName,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  onClose,
  onPreviousShader,
  onNextShader,
  onFinishEditing,
}: MobileUniformOverlayProps) {
  const entries = Object.entries(uniformDefinitions);

  return (
    <div
      className="mobile-uniform-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mobile-uniform-overlay-inner">
        <div className="mobile-uniform-overlay-header">
          <div>
            <span>Customize shader</span>
            <strong>{shaderName}</strong>
          </div>
          <div className="mobile-uniform-edit-actions">
            <button type="button" onClick={onPreviousShader} aria-label="Previous timeline shader">‹</button>
            <button type="button" className="mobile-circular-edit-button" onClick={onFinishEditing} aria-label="Finish shader editing and resume timeline" title="Finish and resume">
              <span aria-hidden="true">↻</span>
            </button>
            <button type="button" onClick={onNextShader} aria-label="Next timeline shader">›</button>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="empty-copy">No uniforms declared.</p>
        ) : (
          <div className="mobile-uniform-overlay-controls" data-slider-key-scope="true">
            {entries.map(([name, definition]) => {
              const value = uniformValues[name];
              if (value === undefined) return null;

              return (
                <label className="mobile-uniform-field" key={name}>
                  <span className="mobile-uniform-field-label">
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
                      onKeyDown={(event) =>
                        handleVerticalRangeKey(event, (nextValue) => onUniformChange(name, nextValue))
                      }
                    />
                  ) : null}
                  {definition.type === 'bool' ? (
                    <button
                      type="button"
                      className={`toggle-chip ${value ? 'toggle-chip-active' : ''}`}
                      onClick={() => onUniformChange(name, !value)}
                    >
                      {value ? 'On' : 'Off'}
                    </button>
                  ) : null}
                  {definition.type === 'vec3' && Array.isArray(value) ? (
                    <ShaderColorInput value={value} onChange={(nextValue) => onUniformChange(name, nextValue)} />
                  ) : null}
                </label>
              );
            })}
            <button type="button" className="mobile-uniform-close-button" onClick={onClose}>
              Hide sliders
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
