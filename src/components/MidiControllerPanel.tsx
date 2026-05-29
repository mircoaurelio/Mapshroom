import type {
  MidiConnectionStatus,
  MidiControllerMode,
  MidiEventLine,
  MidiFaderBinding,
} from '../lib/midi/types';

function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatModeLabel(mode: MidiControllerMode): string {
  switch (mode) {
    case 'shader-uniforms':
      return 'Active Shader';
    case 'timeline-mixer':
      return 'Timeline Mixer';
    default:
      return mode;
  }
}

interface MidiControllerPanelProps {
  status: MidiConnectionStatus;
  mode: MidiControllerMode;
  devices: string[];
  events: MidiEventLine[];
  errorMessage: string;
  faderBindings: MidiFaderBinding[];
  manualMixProgress?: number | null;
  onClearEvents: () => void;
  onOpenGuide: () => void;
  onClose: () => void;
}

export function MidiControllerPanel({
  status,
  mode,
  devices,
  events,
  errorMessage,
  faderBindings,
  manualMixProgress = null,
  onClearEvents,
  onOpenGuide,
  onClose,
}: MidiControllerPanelProps) {
  return (
    <aside className="midi-monitor-panel" aria-label="MIDI controller">
      <div className="midi-monitor-header">
        <div>
          <p className="panel-eyebrow">MIDI Control</p>
          <h2 className="midi-monitor-title">{formatModeLabel(mode)}</h2>
        </div>
        <div className="midi-monitor-actions">
          <button type="button" className="secondary-button" onClick={onOpenGuide}>
            Guide
          </button>
          <button type="button" className="secondary-button" onClick={onClearEvents}>
            Clear
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Hide MIDI monitor"
            title="Hide MIDI monitor"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
      </div>

      <div className="status-card midi-monitor-status">
        <div className="status-card-row">
          <span className="status-card-label">Detected mode</span>
          <span className="status-card-value">{formatModeLabel(mode)}</span>
        </div>
        <div className="status-card-row">
          <span className="status-card-label">Status</span>
          <span className="status-card-value">{status}</span>
        </div>
        {mode === 'timeline-mixer' ? (
          <div className="status-card-row">
            <span className="status-card-label">MIDI Mix</span>
            <span className="status-card-value">
              {Math.round(Math.max(0, Math.min(1, manualMixProgress ?? 0)) * 100)}%
            </span>
          </div>
        ) : null}
        <div className="status-card-row">
          <span className="status-card-label">Devices</span>
          <span className="status-card-value">
            {devices.length > 0 ? devices.join(', ') : 'None yet'}
          </span>
        </div>
      </div>

      <div className="midi-binding-list">
        {faderBindings.map((binding) => (
          <div className="midi-binding-row" key={binding.faderIndex}>
            <span className="midi-binding-fader">Fader {binding.faderIndex}</span>
            <span className="midi-binding-target">
              {binding.targetName ?? '-'}
            </span>
          </div>
        ))}
      </div>

      {errorMessage ? <p className="midi-monitor-error">{errorMessage}</p> : null}

      <div className="midi-monitor-log" aria-live="polite">
        {events.length === 0 ? (
          <p className="midi-monitor-empty">
            {mode === 'timeline-mixer'
              ? 'Timeline hardware mode is active. Bottom buttons trigger playback/cuts/mixes; faders and knobs set mix speed.'
              : 'Shader hardware mode is active. Move a fader to drive the mapped shader sliders.'}
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="midi-monitor-event">
              <span className="midi-monitor-event-time">{formatEventTime(event.timestamp)}</span>
              <span className="midi-monitor-event-summary">{event.summary}</span>
              <span className="midi-monitor-event-raw">{event.raw}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
