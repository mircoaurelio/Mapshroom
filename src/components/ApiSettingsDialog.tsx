import { DEFAULT_GOOGLE_MODEL_OPTIONS } from '../config';
import type { AiSettings } from '../types';

interface ApiSettingsDialogProps {
  open: boolean;
  settings: AiSettings;
  isClearingLocalData?: boolean;
  onClose: () => void;
  onChange: (field: keyof AiSettings, value: string) => void;
  onClearLocalData: () => void;
}

export function ApiSettingsDialog({
  open,
  settings,
  isClearingLocalData = false,
  onClose,
  onChange,
  onClearLocalData,
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
            <span className="panel-eyebrow">Settings</span>
            <h2 id="api-settings-title" className="dialog-title">
              App Settings
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

          <section className="dialog-section dialog-section-danger">
            <span className="panel-eyebrow">Local Data</span>
            <div className="stack gap-md">
              <p className="helper-copy">
                Clear saved shaders, timeline state, imported assets, browser cache, and local
                settings for this site on this device.
              </p>
              <button
                type="button"
                className="danger-button"
                disabled={isClearingLocalData}
                onClick={onClearLocalData}
              >
                {isClearingLocalData ? 'Clearing Data...' : 'Clear Local Data'}
              </button>
            </div>
          </section>

          <section className="dialog-section">
            <span className="panel-eyebrow">Privacy & Storage</span>
            <div className="stack gap-md">
              <p className="helper-copy">
                Mapshroom does not set app cookies. Project data is stored on this device in browser
                storage so the workspace can reopen without an account.
              </p>
              <dl className="privacy-storage-list">
                <div>
                  <dt>localStorage</dt>
                  <dd>
                    Project documents, shader code, timeline settings, UI preferences, selected
                    session, preset favorites, slider cache, API keys, and live MIDI/output state.
                  </dd>
                </div>
                <div>
                  <dt>IndexedDB</dt>
                  <dd>Imported image/video assets and other large local media blobs.</dd>
                </div>
                <div>
                  <dt>Cache Storage</dt>
                  <dd>Browser-managed app/runtime cache for this site.</dd>
                </div>
                <div>
                  <dt>sessionStorage</dt>
                  <dd>Temporary browser-session data, cleared when using Clear Local Data.</dd>
                </div>
                <div>
                  <dt>External services</dt>
                  <dd>
                    AI requests are sent only when you use AI generation. The relevant prompt,
                    shader context, model choice, and API key are sent to the selected provider.
                  </dd>
                </div>
              </dl>
              <p className="helper-copy">
                Use Clear Local Data to erase Mapshroom data from this browser profile. Browser,
                operating-system, MIDI-device, or AI-provider logs are outside this local clear
                action.
              </p>
            </div>
          </section>
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
