import { useEffect, useRef, useState } from 'react';
import type {
  ShaderUniformDefinition,
  ShaderUniformMap,
  ShaderUniformValueMap,
} from '../types';
import type { AudioReactivityController } from '../hooks/useAudioReactivity';
import {
  resolveAudioReactiveValue,
  type AudioReactiveBinding,
  type AudioCaptureSource,
  type AudioReactiveFrame,
  type AudioReactiveSignal,
} from '../lib/audioReactivity';
import { handleVerticalRangeKey } from '../lib/rangeKeyboard';

interface AudioReactivePanelControlsProps {
  controller: AudioReactivityController;
  shaderId: string;
  shaderCode?: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
}

interface AudioReactiveUniformSliderProps {
  controller: AudioReactivityController;
  shaderId: string;
  name: string;
  definition: ShaderUniformDefinition;
  baseValue: number;
  onBaseValueChange: (value: number) => void;
  showSignalPicker?: boolean;
}

interface AudioReactiveUniformHeaderProps {
  controller: AudioReactivityController;
  shaderId: string;
  name: string;
  definition: ShaderUniformDefinition;
  baseValue: number;
}

const AUDIO_SIGNAL_LABELS: Record<AudioReactiveSignal, string> = {
  level: 'Volume',
  bass: 'Bass',
  mid: 'Mids',
  high: 'Highs',
  beat: 'Detected beat',
  tempo: 'Tempo / BPM',
};

const AUDIO_SIGNAL_OPTIONS: Array<{
  value: AudioReactiveSignal;
  code: string;
}> = [
  { value: 'level', code: 'AVG' },
  { value: 'bass', code: 'LOW' },
  { value: 'mid', code: 'MID' },
  { value: 'high', code: 'HIGH' },
  { value: 'beat', code: 'HIT' },
  { value: 'tempo', code: 'CLK' },
];

function WaveIcon() {
  return (
    <span className="audio-wave-icon" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function AudioSourceIcon() {
  return (
    <svg
      className="audio-reactive-source-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      aria-hidden="true"
    >
      <rect x="2.25" y="2.75" width="11.5" height="8" rx="1.4" />
      <path d="M5.25 13.25h5.5M8 10.75v2.5" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M8 1.75v5" />
      <path d="M4.35 3.55a5.25 5.25 0 1 0 7.3 0" />
    </svg>
  );
}

function AutoMapIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="3" cy="12.5" r="1.25" />
      <circle cx="8" cy="3.5" r="1.25" />
      <circle cx="13" cy="9.5" r="1.25" />
      <path d="m4.1 11.9 2.9-7M9.1 4.2l2.8 4.5M4.2 12.1l7.6-2.1" />
    </svg>
  );
}

interface SignalHistoryPoint {
  level: number;
  bass: number;
  mid: number;
  high: number;
  beat: number;
}

function interpolateBandEnergy(frame: AudioReactiveFrame, position: number): number {
  if (position <= 0.34) {
    const mix = position / 0.34;
    return frame.bass * (1 - mix) + frame.mid * mix;
  }
  const mix = (position - 0.34) / 0.66;
  return frame.mid * (1 - mix) + frame.high * mix;
}

function AudioSignalVisualizer({
  frame,
  isStarting,
  source,
}: {
  frame: AudioReactiveFrame;
  isStarting: boolean;
  source: AudioCaptureSource;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<SignalHistoryPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const nextPoint: SignalHistoryPoint = {
      level: frame.level,
      bass: frame.bass,
      mid: frame.mid,
      high: frame.high,
      beat: frame.beat,
    };
    historyRef.current = [...historyRef.current, nextPoint].slice(-72);

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, rect.width || 320);
    const height = Math.max(84, rect.height || 88);
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#040806';
    context.fillRect(0, 0, width, height);

    context.lineWidth = 1;
    for (let column = 0; column <= 15; column += 1) {
      context.strokeStyle = column % 5 === 0
        ? 'rgba(74, 222, 128, 0.13)'
        : 'rgba(74, 222, 128, 0.035)';
      context.beginPath();
      context.moveTo((width / 15) * column, 0);
      context.lineTo((width / 15) * column, height);
      context.stroke();
    }
    for (let row = 0; row <= 5; row += 1) {
      context.strokeStyle = 'rgba(74, 222, 128, 0.055)';
      context.beginPath();
      context.moveTo(0, (height / 5) * row);
      context.lineTo(width, (height / 5) * row);
      context.stroke();
    }

    for (const split of [1 / 3, 2 / 3]) {
      context.strokeStyle = 'rgba(209, 250, 229, 0.16)';
      context.setLineDash([2, 3]);
      context.beginPath();
      context.moveTo(width * split, 0);
      context.lineTo(width * split, height);
      context.stroke();
    }
    context.setLineDash([]);

    const baselineY = height - 14;
    const chartHeight = baselineY - 8;
    const barCount = Math.max(34, Math.floor(width / 7));
    const gap = 2;
    const barWidth = Math.max(2, width / barCount - gap);
    const motionTime = frame.updatedAt * 0.006;

    for (let index = 0; index < barCount; index += 1) {
      const position = index / Math.max(1, barCount - 1);
      const baseEnergy = frame.active
        ? interpolateBandEnergy(frame, position)
        : 0.025 + Math.sin(index * 0.82) * 0.008;
      const harmonic =
        0.72 +
        Math.sin(index * 1.73 + motionTime) * 0.14 +
        Math.sin(index * 0.37 - motionTime * 0.7) * 0.12;
      const beatLift = frame.beat * (0.12 + Math.sin(position * Math.PI) * 0.16);
      const amplitude = Math.max(
        3,
        Math.min(chartHeight, (baseEnergy * harmonic + beatLift) * chartHeight * 0.88),
      );
      const x = index * (barWidth + gap) + gap * 0.5;
      const bandColor =
        position < 1 / 3
          ? { color: '45, 212, 191', glow: 'rgba(45, 212, 191, 0.34)' }
          : position < 2 / 3
            ? { color: '74, 222, 128', glow: 'rgba(74, 222, 128, 0.34)' }
            : { color: '163, 230, 53', glow: 'rgba(163, 230, 53, 0.3)' };
      const segmentHeight = 3;
      const segmentGap = 1;
      const segmentCount = Math.max(1, Math.floor(amplitude / (segmentHeight + segmentGap)));

      context.shadowColor = bandColor.glow;
      context.shadowBlur = frame.active ? 4 : 1;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const ratio = segment / Math.max(1, segmentCount - 1);
        context.fillStyle = `rgba(${bandColor.color}, ${0.38 + ratio * 0.55})`;
        context.fillRect(
          x,
          baselineY - (segment + 1) * (segmentHeight + segmentGap),
          barWidth,
          segmentHeight,
        );
      }

      context.shadowBlur = 0;
      if (frame.active && index % 6 === 0 && amplitude > 18) {
        context.fillStyle = 'rgba(209, 250, 229, 0.52)';
        context.font = '6px "IBM Plex Mono", monospace';
        const glyph = ((index + Math.floor(motionTime)) % 16).toString(16).toUpperCase();
        context.fillText(glyph, x, Math.max(7, baselineY - amplitude - 2));
      }
    }
    context.shadowBlur = 0;

    const history = historyRef.current;
    if (history.length > 1) {
      context.strokeStyle = 'rgba(209, 250, 229, 0.9)';
      context.lineWidth = 1.35;
      context.shadowColor = 'rgba(52, 211, 153, 0.58)';
      context.shadowBlur = 5;
      context.beginPath();
      history.forEach((point, index) => {
        const x = (index / Math.max(1, history.length - 1)) * width;
        const mixedEnergy = (point.level + point.bass + point.mid + point.high) / 4;
        const oscillation = Math.sin(index * 0.78 + motionTime) * 4;
        const y = baselineY - 10 - mixedEnergy * 13 + oscillation;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      context.shadowBlur = 0;
    }

    context.strokeStyle = 'rgba(110, 231, 183, 0.52)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, baselineY);
    context.lineTo(width, baselineY);
    context.stroke();
  }, [frame]);

  const metrics = [
    { label: 'Low', value: frame.bass, color: 'bass' },
    { label: 'Mids', value: frame.mid, color: 'mid' },
    { label: 'Highs', value: frame.high, color: 'high' },
  ];

  return (
    <div className={`audio-signal-scope ${frame.active ? 'audio-signal-scope-live' : ''}`}>
      <div className="audio-signal-canvas-shell">
        <canvas
          ref={canvasRef}
          className="audio-signal-canvas"
          role="img"
          aria-label="Live three-band audio spectrum"
        />
        <div className="audio-signal-frequency-axis" aria-hidden="true">
          <span>LOW 0x00–0x3F</span>
          <span>MIDS 0x40–0x7F</span>
          <span>HIGHS 0x80–0xFF</span>
        </div>
        <span className="audio-signal-scanline" aria-hidden="true" />
      </div>
      <div className="audio-signal-metrics">
        {metrics.map((metric) => (
          <div
            className={`audio-signal-metric audio-signal-metric-${metric.color}`}
            key={metric.label}
          >
            <span>{metric.label}</span>
            <strong>{Math.round(metric.value * 100)}</strong>
            <small>%</small>
          </div>
        ))}
      </div>
      {isStarting ? (
        <div className="audio-reactive-startup-overlay" role="status" aria-live="polite">
          <span className="audio-reactive-startup-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="audio-reactive-startup-copy">
            <strong>
              {source === 'system' ? 'Opening computer audio' : 'Preparing microphone'}
            </strong>
            <small>
              {source === 'system'
                ? 'The Windows share dialog will appear shortly'
                : 'Waiting for microphone permission'}
            </small>
          </span>
          <span className="audio-reactive-startup-code">INIT</span>
        </div>
      ) : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getStep(definition: ShaderUniformDefinition): number {
  if (definition.type === 'int') {
    return 1;
  }
  return Math.max(Number.EPSILON, (definition.max - definition.min) / 100);
}

function formatValue(value: number, definition: ShaderUniformDefinition): string {
  return value.toFixed(definition.type === 'int' ? 0 : 2);
}

function createDefaultBinding(
  definition: ShaderUniformDefinition,
  baseValue: number,
): AudioReactiveBinding {
  const span = definition.max - definition.min;
  const halfWindow = span * 0.2;
  let min = clamp(baseValue - halfWindow, definition.min, definition.max);
  let max = clamp(baseValue + halfWindow, definition.min, definition.max);

  if (definition.type === 'int') {
    min = Math.round(min);
    max = Math.round(max);
  }

  return {
    enabled: true,
    signal: 'bass',
    min,
    max,
  };
}

export function AudioReactiveUniformToggle({
  controller,
  shaderId,
  name,
  definition,
  baseValue,
}: AudioReactiveUniformHeaderProps) {
  const binding = controller.preferences.bindingsByShaderId[shaderId]?.[name] ?? null;
  const isActive = Boolean(binding?.enabled);

  const toggleBinding = () => {
    if (binding) {
      controller.setBinding(shaderId, name, {
        ...binding,
        enabled: !binding.enabled,
      });
      return;
    }
    controller.setBinding(shaderId, name, createDefaultBinding(definition, baseValue));
  };

  return (
    <button
      type="button"
      className={`audio-uniform-toggle ${
        isActive
          ? `audio-uniform-toggle-active audio-uniform-signal-${binding?.signal}`
          : ''
      }`}
      aria-label={isActive ? `Disable audio for ${name}` : `Enable audio for ${name}`}
      aria-pressed={isActive}
    title={isActive ? 'Disable Audio Reactive' : 'Enable Audio Reactive'}
      onClick={toggleBinding}
    >
      <WaveIcon />
    </button>
  );
}

export function AudioReactiveUniformLiveValue({
  controller,
  shaderId,
  name,
  definition,
  baseValue,
}: AudioReactiveUniformHeaderProps) {
  const binding = controller.preferences.bindingsByShaderId[shaderId]?.[name] ?? null;
  const liveValue = resolveAudioReactiveValue({
    baseValue,
    binding,
    frame: controller.uiFrame,
    integer: definition.type === 'int',
  });

  return (
    <output
      className={`audio-uniform-live-value ${
        binding?.enabled
          ? `audio-uniform-live-value-active audio-uniform-signal-${binding.signal}`
          : ''
      }`}
      aria-label={`Audio value for ${name}`}
      aria-live="off"
    >
      {formatValue(liveValue, definition)}
    </output>
  );
}

function AudioSignalPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: AudioReactiveSignal;
  onChange: (signal: AudioReactiveSignal) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const lastWheelChangeAtRef = useRef(0);
  const selectedIndex = AUDIO_SIGNAL_OPTIONS.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(event.deltaY) < 1) {
        return;
      }
      const now = performance.now();
      if (now - lastWheelChangeAtRef.current < 110) {
        return;
      }
      lastWheelChangeAtRef.current = now;
      const currentIndex = Math.max(0, selectedIndex);
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + AUDIO_SIGNAL_OPTIONS.length) %
        AUDIO_SIGNAL_OPTIONS.length;
      onChange(AUDIO_SIGNAL_OPTIONS[nextIndex].value);
    };

    picker.addEventListener('wheel', handleWheel, { passive: false });
    return () => picker.removeEventListener('wheel', handleWheel);
  }, [onChange, selectedIndex]);

  return (
    <div
      ref={pickerRef}
      className={`audio-uniform-signal-picker audio-uniform-signal-${value} ${
        isOpen ? 'audio-uniform-signal-picker-open' : ''
      }`}
    >
      <button
        type="button"
        className="audio-uniform-signal-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Audio signal for ${name}: ${AUDIO_SIGNAL_LABELS[value]}`}
        title="Click to choose a signal, or hover and scroll to cycle"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="audio-uniform-signal-dot" aria-hidden="true" />
        <span className="audio-uniform-signal-trigger-label">
          {AUDIO_SIGNAL_LABELS[value]}
        </span>
        <span className="audio-uniform-signal-chevron" aria-hidden="true">⌄</span>
      </button>

      {isOpen ? (
        <div
          className="audio-uniform-signal-menu"
          role="listbox"
          aria-label={`Choose audio signal for ${name}`}
        >
          <div className="audio-uniform-signal-options">
            {AUDIO_SIGNAL_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`audio-uniform-signal-option audio-uniform-signal-${
                    option.value
                  } ${isSelected ? 'audio-uniform-signal-option-selected' : ''}`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  >
                  <span className="audio-uniform-signal-dot" aria-hidden="true" />
                  <span>{AUDIO_SIGNAL_LABELS[option.value]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AudioReactiveUniformSignalPicker({
  controller,
  shaderId,
  name,
}: AudioReactiveUniformHeaderProps) {
  const binding = controller.preferences.bindingsByShaderId[shaderId]?.[name] ?? null;
  if (!binding?.enabled) {
    return null;
  }

  return (
    <AudioSignalPicker
      name={name}
      value={binding.signal}
      onChange={(signal) =>
        controller.setBinding(shaderId, name, { ...binding, signal })
      }
    />
  );
}

export function AudioReactivePanelControls({
  controller,
  shaderId,
  shaderCode,
  uniformDefinitions,
  uniformValues,
}: AudioReactivePanelControlsProps) {
  const { preferences, uiFrame, status } = controller;
  const isListening = status === 'listening';
  const isStarting = status === 'starting';
  const displayedBpm =
    preferences.bpmMode === 'manual' ? preferences.manualBpm : uiFrame.bpm;
  const activeBindingCount = Object.values(
    preferences.bindingsByShaderId[shaderId] ?? {},
  ).filter((binding) => binding.enabled).length;
  const inputHealth =
    status === 'error'
      ? 'Check input'
      : isListening
        ? 'Healthy'
        : isStarting
          ? 'Connecting'
          : 'Ready';

  const autoMapShader = () => {
    controller.configureShaderBindings(
      shaderId,
      uniformDefinitions,
      uniformValues,
      shaderCode,
      true,
    );
  };

  return (
    <section
      className={`audio-reactive-panel ${
        isListening ? 'audio-reactive-panel-listening' : ''
      }`}
      aria-label="Audio reactive"
    >
      <div className="audio-reactive-panel-heading">
        <span className="audio-reactive-panel-title">
          <WaveIcon />
          Audio Reactive
        </span>
        <span className="audio-reactive-status">
          <span
            className="audio-reactive-status-dot"
            aria-hidden="true"
          />
          {isListening ? 'Live' : isStarting ? 'Starting…' : 'Ready'}
        </span>
        <button
          type="button"
          className="audio-reactive-power-button"
          aria-label={isListening ? 'Turn off Audio Reactive' : 'Start Audio Reactive'}
          title={isListening ? 'Turn off Audio Reactive' : 'Start Audio Reactive'}
          disabled={isStarting}
          onClick={() => {
            if (isListening) {
              controller.stop();
              controller.setModeEnabled(false);
              return;
            }
            void controller.start();
          }}
        >
          <PowerIcon />
        </button>
      </div>

      <AudioSignalVisualizer
        frame={uiFrame}
        isStarting={isStarting}
        source={preferences.source}
      />

      <div className="audio-reactive-source-row">
        <span className="audio-reactive-source-select-shell">
          <AudioSourceIcon />
          <select
            className="audio-reactive-select"
            aria-label="Audio source"
            value={preferences.source}
            disabled={isListening || isStarting}
            onChange={(event) =>
              controller.setSource(
                event.target.value === 'microphone' ? 'microphone' : 'system',
              )
            }
          >
            <option value="system">System audio · YouTube</option>
            <option value="microphone">Microphone input</option>
          </select>
        </span>
        <span className={`audio-reactive-health audio-reactive-health-${status}`}>
          {inputHealth}
        </span>
        <span className="audio-reactive-bpm">
          <strong>{Math.round(displayedBpm)}</strong>
          <small>BPM</small>
        </span>
        <span
          className={`audio-reactive-beat-indicator ${
            uiFrame.beat > 0.35 ? 'audio-reactive-beat-indicator-active' : ''
          }`}
          style={{ opacity: 0.32 + uiFrame.beat * 0.68 }}
          aria-label="Beat indicator"
        />
        {isListening ? (
          <button
            type="button"
            className="audio-reactive-stop-button"
            onClick={controller.stop}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="audio-reactive-start-button"
            disabled={isStarting}
            onClick={() => void controller.start()}
          >
            {isStarting ? 'Starting…' : 'Listen'}
          </button>
        )}
      </div>

      {preferences.source === 'system' && !isListening ? (
        <p className="audio-reactive-hint">
          In the browser picker, choose the YouTube tab and enable “Share tab audio”.
        </p>
      ) : null}
      {controller.captureLabel ? (
        <p className="audio-reactive-capture-label" title={controller.captureLabel}>
          {controller.captureLabel}
        </p>
      ) : null}
      {controller.errorMessage ? (
        <p className="audio-reactive-error" role="alert">
          {controller.errorMessage}
        </p>
      ) : null}

      <details className="audio-reactive-tempo">
        <summary>
          <span>Monitor</span>
        </summary>
        <div className="audio-reactive-tempo-grid">
          <label>
            <span>Clock</span>
            <select
              className="audio-reactive-select"
              value={preferences.bpmMode}
              onChange={(event) =>
                controller.setBpmMode(event.target.value === 'manual' ? 'manual' : 'auto')
              }
            >
              <option value="auto">Detect BPM</option>
              <option value="manual">Manual BPM</option>
            </select>
          </label>
          <label>
            <span>BPM</span>
            <input
              className="audio-reactive-number"
              type="number"
              min={40}
              max={240}
              step={1}
              value={Math.round(preferences.manualBpm)}
              disabled={preferences.bpmMode !== 'manual'}
              onChange={(event) => controller.setManualBpm(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="audio-reactive-tap-button"
            onClick={controller.tapTempo}
          >
            Tap
          </button>
          <label>
            <span>Offset</span>
            <input
              className="audio-reactive-number"
              type="number"
              min={-500}
              max={500}
              step={10}
              value={preferences.syncOffsetMs}
              onChange={(event) => controller.setSyncOffsetMs(Number(event.target.value))}
            />
            <small>ms</small>
          </label>
          <label className="audio-reactive-mapping-field">
            <span>Slider mapping</span>
            <select
              className="audio-reactive-select"
              value={preferences.mappingMode}
              onChange={(event) =>
                controller.setMappingMode(
                  event.target.value === 'random' ? 'random' : 'cohesive',
                )
              }
            >
              <option value="cohesive">Cohesive bands</option>
              <option value="random">Random signals</option>
            </select>
          </label>
          <button
            type="button"
            className="audio-reactive-remap-button"
            onClick={() =>
              controller.configureShaderBindings(
                shaderId,
                uniformDefinitions,
                uniformValues,
                shaderCode,
                true,
              )
            }
          >
            Remap shader
          </button>
        </div>
      </details>
      <div className="audio-reactive-slider-heading">
        <span className="audio-reactive-slider-title">
          Reactive sliders
          <small>{activeBindingCount} active</small>
        </span>
        <span className="audio-reactive-slider-actions">
          <button
            type="button"
            className="audio-reactive-remap-button"
            onClick={autoMapShader}
          >
            <AutoMapIcon />
            Auto map
          </button>
          <select
            className="audio-reactive-mapping-select"
            aria-label="Slider mapping mode"
            value={preferences.mappingMode}
            onChange={(event) =>
              controller.setMappingMode(
                event.target.value === 'random' ? 'random' : 'cohesive',
              )
            }
          >
            <option value="cohesive">Cohesive</option>
            <option value="random">Random</option>
          </select>
        </span>
      </div>
    </section>
  );
}

export function AudioReactiveUniformSlider({
  controller,
  shaderId,
  name,
  definition,
  baseValue,
  onBaseValueChange,
  showSignalPicker = true,
}: AudioReactiveUniformSliderProps) {
  const binding = controller.preferences.bindingsByShaderId[shaderId]?.[name] ?? null;
  const isActive = Boolean(binding?.enabled);
  const step = getStep(definition);
  const liveValue = resolveAudioReactiveValue({
    baseValue,
    binding,
    frame: controller.uiFrame,
    integer: definition.type === 'int',
  });
  const minPercent = binding
    ? ((binding.min - definition.min) / (definition.max - definition.min || 1)) * 100
    : 0;
  const maxPercent = binding
    ? ((binding.max - definition.min) / (definition.max - definition.min || 1)) * 100
    : 100;

  const updateBinding = (patch: Partial<AudioReactiveBinding>) => {
    if (!binding) {
      return;
    }
    controller.setBinding(shaderId, name, { ...binding, ...patch });
  };

  return (
    <div
      className={`audio-uniform-control ${
        isActive ? `audio-uniform-control-active audio-uniform-signal-${binding?.signal}` : ''
      }`}
    >
      <div className="audio-uniform-range-stack">
        {isActive && binding ? (
          <span
            className="audio-uniform-active-zone"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
            aria-hidden="true"
          />
        ) : null}
        <input
          className="audio-uniform-main-range"
          type="range"
          aria-label={name}
          aria-readonly={isActive}
          min={definition.min}
          max={definition.max}
          step={step}
          value={liveValue}
          onChange={(event) => {
            if (!isActive) {
              onBaseValueChange(Number(event.target.value));
            }
          }}
          onKeyDown={(event) => {
            if (isActive) {
              event.preventDefault();
              return;
            }
            handleVerticalRangeKey(event, onBaseValueChange);
          }}
        />
        {isActive && binding ? (
          <>
            <input
              className="audio-uniform-bound-range audio-uniform-bound-range-min"
              type="range"
              aria-label={`Audio minimum for ${name}`}
              min={definition.min}
              max={definition.max}
              step={step}
              value={binding.min}
              onChange={(event) =>
                updateBinding({
                  min: Math.min(Number(event.target.value), binding.max),
                })
              }
            />
            <input
              className="audio-uniform-bound-range audio-uniform-bound-range-max"
              type="range"
              aria-label={`Audio maximum for ${name}`}
              min={definition.min}
              max={definition.max}
              step={step}
              value={binding.max}
              onChange={(event) =>
                updateBinding({
                  max: Math.max(Number(event.target.value), binding.min),
                })
              }
            />
          </>
        ) : null}
      </div>

      {isActive && binding ? (
        <div
          className={`audio-uniform-range-values ${
            showSignalPicker ? '' : 'audio-uniform-range-values-compact'
          }`}
        >
          <span>Min {formatValue(binding.min, definition)}</span>
          {showSignalPicker ? (
            <AudioSignalPicker
              name={name}
              value={binding.signal}
              onChange={(signal) => updateBinding({ signal })}
            />
          ) : null}
          <span>Max {formatValue(binding.max, definition)}</span>
        </div>
      ) : null}
    </div>
  );
}
