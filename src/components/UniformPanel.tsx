import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { PanelSection } from './PanelSection';
import { ShaderColorInput } from './ShaderColorInput';

interface UniformPanelProps {
  title?: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  newUniformName: string;
  onNewUniformNameChange: (value: string) => void;
  onQuickAddUniform: () => void;
}

export function UniformPanel({
  title = 'Uniform Map',
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  newUniformName,
  onNewUniformNameChange,
  onQuickAddUniform,
}: UniformPanelProps) {
  return (
    <PanelSection title={title}>
      <div className="stack gap-md" data-slider-key-scope="true">
        {Object.keys(uniformDefinitions).length > 0 ? (
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
                    {value ? 'Enabled' : 'Disabled'}
                  </button>
                ) : null}
                {definition.type === 'vec3' && Array.isArray(value) ? (
                  <ShaderColorInput value={value} onChange={(nextValue) => onUniformChange(name, nextValue)} />
                ) : null}
              </label>
            );
          })
        ) : null}
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
  );
}
