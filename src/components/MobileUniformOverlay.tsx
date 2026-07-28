import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { useUniformRandomization } from '../hooks/useUniformRandomization';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { ShaderColorInput } from './ShaderColorInput';
import { ShuffleIcon } from './ShuffleIcon';
import {
  AudioReactivePanelControls,
  AudioReactiveUniformLiveValue,
  AudioReactiveUniformSlider,
  AudioReactiveUniformToggle,
} from './AudioReactiveControls';
import type { AudioReactivityController } from '../hooks/useAudioReactivity';

interface MobileUniformOverlayProps {
  shaderName: string;
  randomizationKey: string;
  audioShaderId?: string;
  audioShaderCode?: string;
  audioReactivity?: AudioReactivityController;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onClose: () => void;
}

export function MobileUniformOverlay({
  shaderName,
  randomizationKey,
  audioShaderId,
  audioShaderCode,
  audioReactivity,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  onClose,
}: MobileUniformOverlayProps) {
  const entries = Object.entries(uniformDefinitions);
  const audioModeEnabled = Boolean(audioReactivity?.preferences.modeEnabled);
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
            {audioReactivity && audioShaderId ? (
              <button
                type="button"
                className={`mobile-audio-reactive-mode-button ${
                  audioModeEnabled ? 'mobile-audio-reactive-mode-button-active' : ''
                }`}
                aria-pressed={audioModeEnabled}
                onClick={() => {
                  const nextEnabled = !audioModeEnabled;
                  audioReactivity.setModeEnabled(nextEnabled);
                  if (nextEnabled) {
                    audioReactivity.configureShaderBindings(
                      audioShaderId,
                      uniformDefinitions,
                      uniformValues,
                      audioShaderCode,
                    );
                    void audioReactivity.start();
                  } else {
                    audioReactivity.stop();
                  }
                }}
              >
                Audio
              </button>
            ) : null}
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
            {audioReactivity && audioShaderId && audioModeEnabled ? (
              <AudioReactivePanelControls
                controller={audioReactivity}
                shaderId={audioShaderId}
                shaderCode={audioShaderCode}
                uniformDefinitions={uniformDefinitions}
                uniformValues={uniformValues}
              />
            ) : null}
            {entries.map(([name, definition]) => {
              const value = uniformValues[name];
              if (value === undefined) return null;

              const isNumeric = definition.type === 'float' || definition.type === 'int';
              const isLocked = isNumeric && isUniformLocked(name);

              return (
                <div
                  className={`mobile-uniform-field ${
                    isNumeric ? 'uniform-random-field' : ''
                  } ${isLocked ? 'uniform-random-field-locked' : ''} ${
                    isNumeric && audioModeEnabled ? 'audio-reactive-field' : ''
                  }`}
                  key={name}
                >
                  <span className="mobile-uniform-field-label">
                    <span>{name}</span>
                    <span className="uniform-field-meta">
                      {isNumeric ? (
                        <span className="uniform-field-actions">
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
                          {audioReactivity && audioShaderId && audioModeEnabled ? (
                            <AudioReactiveUniformToggle
                              controller={audioReactivity}
                              shaderId={audioShaderId}
                              name={name}
                              definition={definition}
                              baseValue={Number(value)}
                            />
                          ) : null}
                        </span>
                      ) : null}
                      {isNumeric ? (
                        <span className="uniform-field-values">
                          <small>{Number(value).toFixed(definition.type === 'int' ? 0 : 2)}</small>
                          {audioReactivity && audioShaderId && audioModeEnabled ? (
                            <AudioReactiveUniformLiveValue
                              controller={audioReactivity}
                              shaderId={audioShaderId}
                              name={name}
                              definition={definition}
                              baseValue={Number(value)}
                            />
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {isNumeric ? (
                    audioReactivity && audioShaderId && audioModeEnabled ? (
                      <AudioReactiveUniformSlider
                        controller={audioReactivity}
                        shaderId={audioShaderId}
                        name={name}
                        definition={definition}
                        baseValue={Number(value)}
                        onBaseValueChange={(nextValue) => onUniformChange(name, nextValue)}
                      />
                    ) : (
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
                    )
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
