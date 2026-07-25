import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { useUniformRandomization } from '../hooks/useUniformRandomization';
import { PanelSection } from './PanelSection';
import { ShaderColorInput } from './ShaderColorInput';
import { ShuffleIcon } from './ShuffleIcon';

interface UniformPanelProps {
  title?: string;
  randomizationKey: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  newUniformName: string;
  onNewUniformNameChange: (value: string) => void;
  onQuickAddUniform: () => void;
}

export function UniformPanel({
  title = 'Uniform Map',
  randomizationKey,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  newUniformName,
  onNewUniformNameChange,
  onQuickAddUniform,
}: UniformPanelProps) {
  const {
    isUniformLocked,
    randomizableCount,
    randomizeUniforms,
    toggleUniformLock,
  } = useUniformRandomization({
    randomizationKey,
    uniformDefinitions,
    onUniformChange,
  });

  return (
    <PanelSection
      title={title}
      actions={
        <button
          type="button"
          className="uniform-randomize-button"
          disabled={randomizableCount === 0}
          aria-label="Randomize unlocked sliders"
          title={
            randomizableCount > 0
              ? `Randomize ${randomizableCount} unlocked slider${randomizableCount === 1 ? '' : 's'}`
              : 'All sliders are excluded from randomization'
          }
          onClick={randomizeUniforms}
        >
          <ShuffleIcon />
          <span>Randomize</span>
        </button>
      }
    >
      <div className="stack gap-md" data-slider-key-scope="true">
        {Object.keys(uniformDefinitions).length > 0 ? (
          Object.entries(uniformDefinitions).map(([name, definition]) => {
            const value = uniformValues[name];
            if (value === undefined) {
              return null;
            }

            const isNumeric = definition.type === 'float' || definition.type === 'int';
            const isLocked = isNumeric && isUniformLocked(name);

            return (
              <div
                className={`field ${isNumeric ? 'uniform-random-field' : ''} ${
                  isLocked ? 'uniform-random-field-locked' : ''
                }`}
                key={name}
              >
                <span className="field-inline-label">
                  <span>{name}</span>
                  <span className="uniform-field-meta">
                    {isNumeric ? (
                      <small>{Number(value).toFixed(definition.type === 'int' ? 0 : 2)}</small>
                    ) : null}
                    {isNumeric ? (
                      <button
                        type="button"
                        className={`uniform-random-lock-button ${
                          isLocked ? 'uniform-random-lock-button-active' : ''
                        }`}
                        aria-label={
                          isLocked
                            ? `Include ${name} in randomization`
                            : `Exclude ${name} from randomization`
                        }
                        aria-pressed={isLocked}
                        title={
                          isLocked
                            ? 'Include this slider in randomization'
                            : 'Exclude this slider from randomization'
                        }
                        onClick={() => toggleUniformLock(name)}
                      >
                        <ShuffleIcon blocked={isLocked} />
                      </button>
                    ) : null}
                  </span>
                </span>
                {isNumeric ? (
                  <input
                    type="range"
                    aria-label={name}
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
                    aria-label={name}
                    onClick={() => onUniformChange(name, !value)}
                  >
                    {value ? 'Enabled' : 'Disabled'}
                  </button>
                ) : null}
                {definition.type === 'vec3' && Array.isArray(value) ? (
                  <ShaderColorInput value={value} onChange={(nextValue) => onUniformChange(name, nextValue)} />
                ) : null}
              </div>
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
