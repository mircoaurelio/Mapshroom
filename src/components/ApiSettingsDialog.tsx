import { DEFAULT_GOOGLE_MODEL_OPTIONS } from '../config';
import type { AiSettings } from '../types';

interface ApiSettingsDialogProps {
  open: boolean;
  settings: AiSettings;
  onClose: () => void;
  onChange: (field: keyof AiSettings, value: string) => void;
}

export function ApiSettingsDialog({
  open,
  settings,
  onClose,
  onChange,
}: ApiSettingsDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">AI Settings</span>
            <h2 id="api-settings-title" className="dialog-title">
              Gemini and Media Keys
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <p className="dialog-note">
            Gemini is the only shader AI exposed in the app right now. These keys stay in local
            browser storage for this device and are not embedded in the bundle.
          </p>

          <div className="dialog-grid">
            <section className="dialog-section">
              <span className="panel-eyebrow">Google Gemini</span>
              <div className="stack gap-md">
                <label className="field">
                  <span>API Key</span>
                  <input
                    className="text-field"
                    type="password"
                    value={settings.googleApiKey}
                    onChange={(event) => onChange('googleApiKey', event.target.value)}
                    placeholder="AIza..."
                  />
                </label>
                <label className="field">
                  <span>Shader Model</span>
                  <select
                    className="select-field"
                    value={settings.googleShaderModel}
                    onChange={(event) => onChange('googleShaderModel', event.target.value)}
                  >
                    {DEFAULT_GOOGLE_MODEL_OPTIONS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="dialog-section">
              <span className="panel-eyebrow">Runway</span>
              <div className="stack gap-md">
                <label className="field">
                  <span>API Key</span>
                  <input
                    className="text-field"
                    type="password"
                    value={settings.runwayApiKey}
                    onChange={(event) => onChange('runwayApiKey', event.target.value)}
                    placeholder="Reserved for V3.1 media generation"
                  />
                </label>
                <p className="helper-copy">
                  Runway stays reserved for the video generation release, but you can keep the key ready here.
                </p>
              </div>
            </section>
          </div>
        </div>

        <footer className="dialog-footer">
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
