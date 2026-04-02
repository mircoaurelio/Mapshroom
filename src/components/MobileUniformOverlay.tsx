import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { hexToRgb, rgbToHex } from '../lib/shader';

interface MobileUniformOverlayProps {
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onClose: () => void;
}

export function MobileUniformOverlay({
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  onClose,
}: MobileUniformOverlayProps) {
  const entries = Object.entries(uniformDefinitions);

  if (entries.length === 0) {
    return (
      <div className="mobile-uniform-overlay">
        <div className="mobile-uniform-overlay-header">
          <span>Sliders</span>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="empty-copy">No uniforms declared.</p>
      </div>
    );
  }

  return (
    <div className="mobile-uniform-overlay">
      <div className="mobile-uniform-overlay-header">
        <span>Sliders</span>
        <button type="button" className="ghost-button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mobile-uniform-overlay-controls">
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
                <input
                  type="color"
                  value={rgbToHex(value)}
                  onChange={(event) => onUniformChange(name, hexToRgb(event.target.value))}
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}
