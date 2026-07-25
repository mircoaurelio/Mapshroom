import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { useUniformRandomization } from '../hooks/useUniformRandomization';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { ShaderColorInput } from './ShaderColorInput';
import { ShuffleIcon } from './ShuffleIcon';

interface MobileUniformOverlayProps {
  shaderName: string;
  randomizationKey: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onClose: () => void;
}

export function MobileUniformOverlay({
  shaderName,
  randomizationKey,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  onClose,
}: MobileUniformOverlayProps) {
  const entries = Object.entries(uniformDefinitions);
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
        <header className="mobile-uniform-overlay-header">
          <div className="mobile-uniform-overlay-copy">
            <span>Sliders</span>
            <strong>{shaderName}</strong>
          </div>
          <div className="mobile-uniform-header-actions">
            <button
              type="button"
              className="uniform-randomize-button mobile-uniform-randomize-button"
              disabled={randomizableCount === 0}
              aria-label="Randomize unlocked sliders"
              title="Randomize unlocked sliders"
              onClick={randomizeUniforms}
            >
              <ShuffleIcon />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Close sliders"
              title="Close sliders"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>
        {entries.length === 0 ? (
          <p className="empty-copy">No sliders declared for {shaderName}.</p>
        ) : (
          <div className="mobile-uniform-overlay-controls" data-slider-key-scope="true">
            {entries.map(([name, definition]) => {
              const value = uniformValues[name];
              if (value === undefined) return null;

              const isNumeric = definition.type === 'float' || definition.type === 'int';
              const isLocked = isNumeric && isUniformLocked(name);

              return (
                <div
                  className={`mobile-uniform-field ${
                    isNumeric ? 'uniform-random-field' : ''
                  } ${isLocked ? 'uniform-random-field-locked' : ''}`}
                  key={name}
                >
                  <span className="mobile-uniform-field-label">
                    <span>{name}</span>
                    <span className="uniform-field-meta">
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
                          onClick={() => toggleUniformLock(name)}
                        >
                          <ShuffleIcon blocked={isLocked} />
                        </button>
                      ) : null}
                      {isNumeric ? (
                        <small>{Number(value).toFixed(definition.type === 'int' ? 0 : 2)}</small>
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
                      {value ? 'On' : 'Off'}
                    </button>
                  ) : null}
                  {definition.type === 'vec3' && Array.isArray(value) ? (
                    <ShaderColorInput value={value} onChange={(nextValue) => onUniformChange(name, nextValue)} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
