import { useEffect, useState } from 'react';
import {
  DEFAULT_ANTHROPIC_MODEL_OPTIONS,
  DEFAULT_GOOGLE_MODEL_OPTIONS,
  DEFAULT_OPENAI_MODEL_OPTIONS,
} from '../config';
import { isLocalModelReady, LOCAL_SHADER_MODELS, LOCAL_VISION_MODEL, prepareLocalModel } from '../lib/localAi';
import type { AiSettings, ShaderRuntime } from '../types';

export type ApiSettingsVariant = 'setup' | 'settings';

interface ApiSettingsDialogProps {
  open: boolean;
  settings: AiSettings;
  variant?: ApiSettingsVariant;
  isClearingLocalData?: boolean;
  onClose: () => void;
  onChange: (field: keyof AiSettings, value: string | boolean) => void;
  onClearLocalData: () => void;
}

function LocalModelIcon() {
  return (
    <svg className="ai-path-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="34" r="18" fill="rgba(52,211,153,.12)" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 36c2.5-6 7-10 10-10s7.5 4 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="30" r="2.2" fill="currentColor" />
      <circle cx="38" cy="30" r="2.2" fill="currentColor" />
      <path d="M27 42h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M32 10v6M18 18l4 4M46 18l-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".55"
      />
      <path
        d="M14 48h8M42 50h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".4"
      />
    </svg>
  );
}

function CloudModelIcon() {
  return (
    <svg className="ai-path-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M18 38c-5 0-8-3.5-8-8s3.5-8 8.5-8c1.2-5.5 6-9.5 11.8-9.5 5.2 0 9.6 3.1 11.4 7.5 1-.3 2-.5 3.1-.5 5.2 0 9.2 4 9.2 9s-4 9-9.2 9H18Z"
        fill="rgba(251,191,36,.1)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M28 28c2-4 6-6 10-4M36 34c3-2 7-1 9 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle cx="30" cy="33" r="2" fill="currentColor" />
      <circle cx="40" cy="31" r="2.4" fill="currentColor" />
      <path d="M33 40c2 .8 4 .8 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M46 14l2 4 4 1-4 2-1 4-2-4-4-1 4-2 1-4ZM14 44l1.4 2.8 2.8.8-2.8 1.2-.8 2.8-1.4-2.8-2.8-.8 2.8-1.2.8-2.8Z"
        fill="currentColor"
        opacity=".55"
      />
    </svg>
  );
}

export function ApiSettingsDialog({
  open,
  settings,
  variant = 'settings',
  isClearingLocalData = false,
  onClose,
  onChange,
  onClearLocalData,
}: ApiSettingsDialogProps) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const isSetup = variant === 'setup';

  useEffect(() => {
    if (!downloading) return;
    const intervalId = window.setInterval(() => {
      setDownloadProgress((current) => Math.min(92, current + Math.max(0.35, (92 - current) * 0.025)));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [downloading]);

  if (!open) return null;

  const chooseRuntime = (runtime: ShaderRuntime) => onChange('shaderRuntime', runtime);
  const selectedLocal = LOCAL_SHADER_MODELS.find((model) => model.id === settings.localShaderModel);
  const ready = settings.localShaderModel ? isLocalModelReady(settings.localShaderModel, settings.visionEnabled) : false;
  const handleDownload = async () => {
    if (!settings.localShaderModel) return;
    setDownloading(true);
    setDownloadProgress(3);
    setDownloadError('');
    try {
      await prepareLocalModel(settings.localShaderModel, settings.visionEnabled);
      setDownloadProgress(100);
    } catch (error) {
      setDownloadProgress(0);
      setDownloadError(error instanceof Error ? error.message : 'The model download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className={`dialog-panel ai-settings-dialog ${isSetup ? 'ai-settings-dialog-setup' : 'ai-settings-dialog-settings'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
      >
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">{isSetup ? 'First shader spark' : 'AI settings'}</span>
            <h2 id="api-settings-title" className="dialog-title">
              {isSetup ? 'Pick your pixel brain' : 'Choose how shaders are generated'}
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </header>
        <div className="dialog-body">
          <p className="dialog-note">
            {isSetup
              ? 'Two ways to grow shaders: a humble browser brain, or a strange paid cloud mind. Pick one to unlock Generate.'
              : 'Run open models entirely in this browser, or connect directly to OpenAI, Anthropic, or Gemini. Model files and API keys remain in this browser so you only set them up once.'}
          </p>

          <div className="ai-runtime-choice" role="radiogroup" aria-label="AI runtime">
            <button
              type="button"
              className={`ai-path-card ai-path-card-local ${settings.shaderRuntime === 'local' ? 'active' : ''}`}
              onClick={() => chooseRuntime('local')}
            >
              <LocalModelIcon />
              <div className="ai-path-card-copy">
                <span className="ai-path-card-tag">Cheap &amp; a bit stupid</span>
                <strong>Local models</strong>
                <span>Free, private, offline after download. Smaller browser brains — messier, funnier shaders.</span>
              </div>
            </button>
            <button
              type="button"
              className={`ai-path-card ai-path-card-cloud ${settings.shaderRuntime === 'api' ? 'active' : ''}`}
              onClick={() => chooseRuntime('api')}
            >
              <CloudModelIcon />
              <div className="ai-path-card-copy">
                <span className="ai-path-card-tag">Strange &amp; costly</span>
                <strong>Cloud API</strong>
                <span>Sharper results, weirder tricks, and a meter that notices. Recommended when quality matters.</span>
              </div>
            </button>
          </div>

          {settings.shaderRuntime === 'local' ? (
            <section className="dialog-section ai-model-section">
              <div className="ai-section-heading">
                <div>
                  <span className="panel-eyebrow">Local shader model</span>
                  <p className="helper-copy">
                    The local version is free and private, but browser-sized models can produce lower-quality or less
                    consistent shaders. For repeatable production work, a cloud API is the better choice.
                  </p>
                </div>
                <span className="ai-local-badge">WebGPU · browser cache</span>
              </div>
              <div className="local-model-list">
                {LOCAL_SHADER_MODELS.map((model) => (
                  <label key={model.id} className={`local-model-card ${settings.localShaderModel === model.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="local-model"
                      value={model.id}
                      checked={settings.localShaderModel === model.id}
                      onChange={() => onChange('localShaderModel', model.id)}
                    />
                    <span className="local-model-tier">{model.tier}</span>
                    <span className="local-model-copy">
                      <strong>{model.label}</strong>
                      <small>{model.note}</small>
                    </span>
                    <span className="local-model-meta">
                      <b>{model.size}</b>
                      <small>{model.memory}</small>
                    </span>
                  </label>
                ))}
              </div>
              <label className="vision-toggle">
                <input
                  type="checkbox"
                  checked={settings.visionEnabled}
                  onChange={(event) => onChange('visionEnabled', event.target.checked)}
                />
                <span>
                  <strong>Enable vision context</strong>
                  <small>
                    Optional. Downloads {LOCAL_VISION_MODEL.label} ({LOCAL_VISION_MODEL.size}) and lets it inspect the
                    current stage frame before GLSL generation.
                  </small>
                </span>
              </label>
              <div className="local-download-row">
                <div>
                  {selectedLocal ? (
                    <>
                      <strong>
                        {ready
                          ? 'Ready to make pixels dance'
                          : downloading
                            ? 'Teaching pixels a few new tricks…'
                            : `${selectedLocal.tier} selected`}
                      </strong>
                      <small>
                        {downloading
                          ? 'First time is slower — later runs usually zip. Good things are growing in your browser.'
                          : 'Download once; the browser keeps the files cached. First setup is the slowest.'}
                      </small>
                    </>
                  ) : (
                    <small>Select a model to continue.</small>
                  )}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!selectedLocal || downloading || ready}
                  onClick={() => void handleDownload()}
                >
                  {downloading ? 'Preparing…' : ready ? 'Downloaded' : 'Download model'}
                </button>
              </div>
              {downloading || ready ? (
                <div
                  className="model-download-progress"
                  role="progressbar"
                  aria-label="Model download"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(downloadProgress)}
                >
                  <span style={{ width: `${downloadProgress}%` }} />
                </div>
              ) : null}
              {downloadError ? <p className="dialog-error-copy">{downloadError}</p> : null}
            </section>
          ) : null}

          {settings.shaderRuntime === 'api' ? (
            <section className="dialog-section ai-model-section">
              <span className="panel-eyebrow">Cloud provider</span>
              <div className="stack gap-md">
                <div className="ai-runtime-choice ai-provider-choice" role="radiogroup" aria-label="Cloud AI provider">
                  {(
                    [
                      ['openai', 'OpenAI'],
                      ['anthropic', 'Anthropic'],
                      ['google', 'Gemini'],
                    ] as const
                  ).map(([provider, label]) => (
                    <button
                      key={provider}
                      type="button"
                      className={`ai-runtime-card ${settings.shaderProvider === provider ? 'active' : ''}`}
                      onClick={() => onChange('shaderProvider', provider)}
                    >
                      <strong>{label}</strong>
                    </button>
                  ))}
                </div>
                {settings.shaderProvider === 'openai' ? (
                  <>
                    <label className="field">
                      <span>OpenAI API key</span>
                      <input
                        className="text-field"
                        type="password"
                        autoComplete="off"
                        value={settings.openaiApiKey}
                        onChange={(event) => onChange('openaiApiKey', event.target.value)}
                        placeholder="sk-…"
                      />
                    </label>
                    <label className="field">
                      <span>OpenAI model</span>
                      <select
                        className="select-field"
                        value={settings.openaiShaderModel}
                        onChange={(event) => onChange('openaiShaderModel', event.target.value)}
                      >
                        {DEFAULT_OPENAI_MODEL_OPTIONS.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                {settings.shaderProvider === 'anthropic' ? (
                  <>
                    <label className="field">
                      <span>Anthropic API key</span>
                      <input
                        className="text-field"
                        type="password"
                        autoComplete="off"
                        value={settings.anthropicApiKey}
                        onChange={(event) => onChange('anthropicApiKey', event.target.value)}
                        placeholder="sk-ant-…"
                      />
                    </label>
                    <label className="field">
                      <span>Claude model</span>
                      <select
                        className="select-field"
                        value={settings.anthropicShaderModel}
                        onChange={(event) => onChange('anthropicShaderModel', event.target.value)}
                      >
                        {DEFAULT_ANTHROPIC_MODEL_OPTIONS.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                {settings.shaderProvider === 'google' ? (
                  <>
                    <label className="field">
                      <span>Google API key</span>
                      <input
                        className="text-field"
                        type="password"
                        autoComplete="off"
                        value={settings.googleApiKey}
                        onChange={(event) => onChange('googleApiKey', event.target.value)}
                        placeholder="AIza…"
                      />
                    </label>
                    <label className="field">
                      <span>Gemini model</span>
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
                  </>
                ) : null}
                <p className="helper-copy">
                  This key is saved only in local browser storage for this site and sent directly to the selected
                  provider when you generate. Client-side keys can be inspected on this device; use a restricted key
                  and rotate it if the device is shared.
                </p>
                <label className="vision-toggle">
                  <input
                    type="checkbox"
                    checked={settings.visionEnabled}
                    onChange={(event) => onChange('visionEnabled', event.target.checked)}
                  />
                  <span>
                    <strong>Enable vision context</strong>
                    <small>
                      Optional. Sends the current stage frame with the shader prompt. All listed cloud models support
                      image input.
                    </small>
                  </span>
                </label>
              </div>
            </section>
          ) : null}

          {!isSetup ? (
            <section className="dialog-section dialog-section-danger">
              <span className="panel-eyebrow">Local data</span>
              <div className="stack gap-md">
                <p className="helper-copy">
                  Clear projects, models/runtime cache, imported assets, and locally saved API keys for this site.
                </p>
                <button
                  type="button"
                  className="danger-button"
                  disabled={isClearingLocalData}
                  onClick={onClearLocalData}
                >
                  {isClearingLocalData ? 'Clearing Data…' : 'Clear Local Data'}
                </button>
              </div>
            </section>
          ) : null}
        </div>
        <footer className="dialog-footer">
          <button type="button" className="primary-button" onClick={onClose}>
            {isSetup ? 'Continue' : 'Done'}
          </button>
        </footer>
      </section>
    </div>
  );
}
