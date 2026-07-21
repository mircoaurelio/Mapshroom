import { useState } from 'react';
import { DEFAULT_GOOGLE_MODEL_OPTIONS } from '../config';
import { isLocalModelReady, LOCAL_SHADER_MODELS, LOCAL_VISION_MODEL, prepareLocalModel, type LocalModelProgress } from '../lib/localAi';
import type { AiSettings, ShaderRuntime } from '../types';

interface ApiSettingsDialogProps {
  open: boolean;
  settings: AiSettings;
  isClearingLocalData?: boolean;
  onClose: () => void;
  onChange: (field: keyof AiSettings, value: string | boolean) => void;
  onClearLocalData: () => void;
}

export function ApiSettingsDialog({ open, settings, isClearingLocalData = false, onClose, onChange, onClearLocalData }: ApiSettingsDialogProps) {
  const [download, setDownload] = useState<LocalModelProgress | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  if (!open) return null;

  const chooseRuntime = (runtime: ShaderRuntime) => onChange('shaderRuntime', runtime);
  const selectedLocal = LOCAL_SHADER_MODELS.find((model) => model.id === settings.localShaderModel);
  const ready = settings.localShaderModel ? isLocalModelReady(settings.localShaderModel, settings.visionEnabled) : false;
  const handleDownload = async () => {
    if (!settings.localShaderModel) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await prepareLocalModel(settings.localShaderModel, settings.visionEnabled, setDownload);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'The model download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog-panel ai-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
        <header className="dialog-header">
          <div><span className="panel-eyebrow">AI setup</span><h2 id="api-settings-title" className="dialog-title">Choose how shaders are generated</h2></div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </header>
        <div className="dialog-body">
          <p className="dialog-note">Run open models entirely in this browser, or connect directly to Gemini. Local model files remain in the browser cache. API keys remain in this browser's local storage so you only enter them once.</p>

          <div className="ai-runtime-choice" role="radiogroup" aria-label="AI runtime">
            <button type="button" className={`ai-runtime-card ${settings.shaderRuntime === 'local' ? 'active' : ''}`} onClick={() => chooseRuntime('local')}>
              <strong>Use local models</strong><span>Private, offline after download, no usage fee</span>
            </button>
            <button type="button" className={`ai-runtime-card ${settings.shaderRuntime === 'api' ? 'active' : ''}`} onClick={() => chooseRuntime('api')}>
              <strong>Use Gemini API</strong><span>Fastest setup and strongest results</span>
            </button>
          </div>

          {settings.shaderRuntime === 'local' ? (
            <section className="dialog-section ai-model-section">
              <div className="ai-section-heading"><div><span className="panel-eyebrow">Local shader model</span><p className="helper-copy">Choose for your device. Sizes are approximate quantized downloads.</p></div><span className="ai-local-badge">WebGPU · browser cache</span></div>
              <div className="local-model-list">
                {LOCAL_SHADER_MODELS.map((model) => (
                  <label key={model.id} className={`local-model-card ${settings.localShaderModel === model.id ? 'active' : ''}`}>
                    <input type="radio" name="local-model" value={model.id} checked={settings.localShaderModel === model.id} onChange={() => onChange('localShaderModel', model.id)} />
                    <span className="local-model-tier">{model.tier}</span>
                    <span className="local-model-copy"><strong>{model.label}</strong><small>{model.note}</small></span>
                    <span className="local-model-meta"><b>{model.size}</b><small>{model.memory}</small></span>
                  </label>
                ))}
              </div>
              <label className="vision-toggle">
                <input type="checkbox" checked={settings.visionEnabled} onChange={(event) => onChange('visionEnabled', event.target.checked)} />
                <span><strong>Enable vision context</strong><small>Optional. Downloads {LOCAL_VISION_MODEL.label} ({LOCAL_VISION_MODEL.size}) and lets it inspect the current stage frame before GLSL generation.</small></span>
              </label>
              <div className="local-download-row">
                <div>{selectedLocal ? <><strong>{ready ? 'Ready on this page' : `${selectedLocal.tier} selected`}</strong><small>{download ? `${download.phase === 'vision' ? 'Vision' : download.phase === 'shader' ? 'Shader model' : 'Ready'} · ${download.percent}%${download.file ? ` · ${download.file}` : ''}` : 'Download once; the browser keeps the files cached.'}</small></> : <small>Select a model to continue.</small>}</div>
                <button type="button" className="primary-button" disabled={!selectedLocal || downloading || ready} onClick={() => void handleDownload()}>{downloading ? 'Downloading…' : ready ? 'Downloaded' : 'Download model'}</button>
              </div>
              {download && downloading ? <progress className="model-download-progress" value={download.percent} max="100" /> : null}
              {downloadError ? <p className="dialog-error-copy">{downloadError}</p> : null}
            </section>
          ) : null}

          {settings.shaderRuntime === 'api' ? (
            <section className="dialog-section ai-model-section">
              <span className="panel-eyebrow">Google Gemini</span>
              <div className="stack gap-md">
                <label className="field"><span>API key</span><input className="text-field" type="password" autoComplete="off" value={settings.googleApiKey} onChange={(event) => onChange('googleApiKey', event.target.value)} placeholder="AIza…" /></label>
                <p className="helper-copy">Saved only in local browser storage for this site. It is sent directly to Google when you generate and is never embedded in the app bundle.</p>
                <label className="field"><span>Gemini model</span><select className="select-field" value={settings.googleShaderModel} onChange={(event) => onChange('googleShaderModel', event.target.value)}>{DEFAULT_GOOGLE_MODEL_OPTIONS.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                <label className="vision-toggle"><input type="checkbox" checked={settings.visionEnabled} onChange={(event) => onChange('visionEnabled', event.target.checked)} /><span><strong>Enable vision context</strong><small>Optional. Sends a current stage-frame image with the shader prompt. Gemini models are multimodal, so no second model download is needed.</small></span></label>
              </div>
            </section>
          ) : null}

          <section className="dialog-section dialog-section-danger"><span className="panel-eyebrow">Local data</span><div className="stack gap-md"><p className="helper-copy">Clear projects, models/runtime cache, imported assets, and locally saved API keys for this site.</p><button type="button" className="danger-button" disabled={isClearingLocalData} onClick={onClearLocalData}>{isClearingLocalData ? 'Clearing Data…' : 'Clear Local Data'}</button></div></section>
        </div>
        <footer className="dialog-footer"><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
