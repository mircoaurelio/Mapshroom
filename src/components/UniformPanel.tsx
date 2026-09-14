import { useRangeHoverPreview } from '../hooks/useRangeHoverPreview';
import { useLiveUniformValues } from '../hooks/useLiveUniformValues';
import type { UniformRuntime } from '../lib/uniformRuntime';
import { RangeInput } from './RangeInput';
import { EditableShaderName } from './EditableShaderName';
import { useRef } from 'react';
import type { ShaderUniformMap, ShaderUniformValue, ShaderUniformValueMap } from '../types';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';
import { useUniformRandomization } from '../hooks/useUniformRandomization';
import { PanelSection } from './PanelSection';
import { ShaderColorInput } from './ShaderColorInput';
import { ShuffleIcon } from './ShuffleIcon';
import {
  AudioReactivePanelControls,
  AudioReactiveUniformLiveValue,
  AudioReactiveUniformSignalPicker,
  AudioReactiveUniformSlider,
  AudioReactiveUniformToggle,
} from './AudioReactiveControls';
import type { AudioReactivityController } from '../hooks/useAudioReactivity';

interface UniformPanelProps {
  title?: string;
  onTitleChange?: (name: string) => void;
  randomizationKey: string;
  audioShaderId?: string;
  audioShaderCode?: string;
  audioReactivity?: AudioReactivityController;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  uniformRuntime?: UniformRuntime;
  onInteractionStart: () => void;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onUniformValuesChange?: (values: ShaderUniformValueMap) => void;
  newUniformName: string;
  onNewUniformNameChange: (value: string) => void;
  onQuickAddUniform: () => void;
}

export function UniformPanel({
  title = 'Uniform Map',
  onTitleChange,
  randomizationKey,
  audioShaderId,
  audioShaderCode,
  audioReactivity,
  uniformDefinitions,
  uniformValues: savedUniformValues,
  uniformRuntime,
  onInteractionStart,
  onUniformChange,
  onUniformValuesChange,
  newUniformName,
  onNewUniformNameChange,
  onQuickAddUniform,
}: UniformPanelProps) {
  const { preview, onHoverValueChange } = useRangeHoverPreview(randomizationKey);
  const uniformValues = useLiveUniformValues(uniformRuntime, audioShaderId, savedUniformValues);
  const pointerActivationRef = useRef(false);
  const audioModeEnabled = Boolean(audioReactivity?.preferences.modeEnabled);
  const {
    isUniformLocked,
    randomizableCount,
    randomizeUniforms,
    toggleUniformLock,
  } = useUniformRandomization({
    randomizationKey,
    uniformDefinitions,
    uniformValues,
    onUniformChange,
    onUniformValuesChange,
  });
  const handlePointerDown = () => {
    pointerActivationRef.current = true;
    onInteractionStart();
    window.queueMicrotask(() => {
      pointerActivationRef.current = false;
    });
  };
  const handleFocus = () => {
    if (!pointerActivationRef.current) {
      onInteractionStart();
    }
  };

  return (
    <PanelSection
      title={onTitleChange ? <EditableShaderName key={randomizationKey} name={title} onChange={onTitleChange} /> : title}
      actions={
        <button
          type="button"
          className="uniform-randomize-button"
          disabled={randomizableCount === 0}
          aria-label="Randomize unlocked parameters"
          title={
            randomizableCount > 0
              ? `Randomize ${randomizableCount} unlocked parameter${randomizableCount === 1 ? '' : 's'}`
              : 'All parameters are excluded from randomization'
          }
          onPointerDown={handlePointerDown}
          onFocus={handleFocus}
          onClick={randomizeUniforms}
        >
          <ShuffleIcon />
        </button>
      }
    >
      <div
        className="stack gap-md uniform-control-stack"
        data-slider-key-scope="true"
        onPointerDownCapture={handlePointerDown}
        onFocusCapture={handleFocus}
      >
        {audioReactivity && audioShaderId && audioModeEnabled ? (
          <AudioReactivePanelControls
            controller={audioReactivity}
            shaderId={audioShaderId}
            shaderCode={audioShaderCode}
            uniformDefinitions={uniformDefinitions}
            uniformValues={uniformValues}
          />
        ) : null}
        {Object.keys(uniformDefinitions).length > 0 ? (
          Object.entries(uniformDefinitions).map(([name, definition]) => {
            const value = uniformValues[name];
            if (value === undefined) {
              return null;
            }

            const isNumeric = definition.type === 'float' || definition.type === 'int';
            const hoverValue = preview?.name === name ? preview.value : null;
            const isRandomizable = isNumeric || definition.type === 'vec3';
            const isLocked = isRandomizable && isUniformLocked(name);

            return (
              <div
                className={`field ${isRandomizable ? 'uniform-random-field' : ''} ${
                  isLocked ? 'uniform-random-field-locked' : ''
                } ${isNumeric && audioModeEnabled ? 'audio-reactive-field' : ''}`}
                key={name}
              >
                <span className="field-inline-label">
                  <span>{name}</span>
                  <span className="uniform-field-meta">
                    {isRandomizable ? (
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
                          title={
                            isLocked
                              ? 'Include this parameter in randomization'
                              : 'Exclude this parameter from randomization'
                          }
                          onClick={() => toggleUniformLock(name)}
                        >
                          <ShuffleIcon blocked={isLocked} />
                        </button>
                        {isNumeric && audioReactivity && audioShaderId && audioModeEnabled ? (
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
                        <small className={hoverValue !== null ? 'range-hover-value' : undefined}>
                          {(hoverValue ?? Number(value)).toFixed(definition.type === 'int' ? 0 : 2)}
                        </small>
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
                    {isNumeric && audioReactivity && audioShaderId && audioModeEnabled ? (
                      <AudioReactiveUniformSignalPicker
                        controller={audioReactivity}
                        shaderId={audioShaderId}
                        name={name}
                        definition={definition}
                        baseValue={Number(value)}
                      />
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
                      onHoverValueChange={(nextValue) => onHoverValueChange(name, nextValue)}
                      showSignalPicker={false}
                    />
                  ) : (
                    <RangeInput
                      className="uniform-range"
                      aria-label={name}
                      min={definition.min}
                      max={definition.max}
                      step={definition.type === 'int' ? 1 : (definition.max - definition.min) / 1000}
                      value={Number(value)}
                      onHoverValueChange={(nextValue) => onHoverValueChange(name, nextValue)}
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
