import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ANTHROPIC_MODEL_OPTIONS,
  DEFAULT_GOOGLE_MODEL_OPTIONS,
  DEFAULT_OPENAI_MODEL_OPTIONS,
} from '../config';
import {
  type AiGenerationRoute,
  getCloudAiConfiguration,
  resolveAiGenerationRoute,
  routeAfterAiSettingsEdit,
  storeConfiguredLocalModel,
} from '../lib/aiRoute';
import {
  normalizeAiSettingsDraft,
  saveAiSettingsDraft,
  type SaveAiSetting,
} from '../lib/aiSettingsDraft';
import { isTauri } from '../lib/desktop';
import {
  hasStoredCloudApiKey,
  isDesktopKeyringSentinel,
} from '../lib/desktopSecrets';
import {
  isLocalModelReady,
  LOCAL_SHADER_MODELS,
  LOCAL_VISION_MODEL,
  prepareLocalModel,
} from '../lib/localAi';
import type { AiSettings } from '../types';
import './AppSettingsDialog.css';

interface AppSettingsDialogProps {
  settings: AiSettings;
  initialPath?: AiGenerationRoute;
  isClearingLocalData?: boolean;
  onClose: () => void;
  onChange: SaveAiSetting;
  onRouteChange?: (route: AiGenerationRoute) => void;
  onClearLocalData: () => void;
}

const PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    modelLabel: 'OpenAI model',
    key: 'openaiApiKey',
    model: 'openaiShaderModel',
    placeholder: 'sk-…',
    options: DEFAULT_OPENAI_MODEL_OPTIONS,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    modelLabel: 'Claude model',
    key: 'anthropicApiKey',
    model: 'anthropicShaderModel',
    placeholder: 'sk-ant-…',
    options: DEFAULT_ANTHROPIC_MODEL_OPTIONS,
  },
  {
    id: 'google',
    label: 'Google',
    modelLabel: 'Gemini model',
    key: 'googleApiKey',
    model: 'googleShaderModel',
    placeholder: 'AIza…',
    options: DEFAULT_GOOGLE_MODEL_OPTIONS,
  },
] as const;

const SECTIONS = [
  { id: 'api', label: 'API keys & models', icon: 'cloud' },
  { id: 'local', label: 'Local models', icon: 'chip' },
  { id: 'data', label: 'Local data', icon: 'database' },
] as const;
type SettingsSection = (typeof SECTIONS)[number]['id'];

function SettingsIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'cloud' ? (
        <path d="M7 18a5 5 0 0 1-1-9.9A6 6 0 0 1 17.5 7a5.5 5.5 0 0 1 0 11H7Z" />
      ) : name === 'chip' ? (
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z" />
        </>
      ) : name === 'database' ? (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
        </>
      ) : (
        <path d="m6 6 12 12M6 18 18 6" />
      )}
    </svg>
  );
}

export function AppSettingsDialog({
  settings,
  initialPath,
  isClearingLocalData = false,
  onClose,
  onChange,
  onRouteChange,
  onClearLocalData,
}: AppSettingsDialogProps) {
  const [draft, setDraft] = useState(() => ({ ...settings }));
  const initialRoute = resolveAiGenerationRoute(settings, initialPath ?? null);
  const [route, setRoute] = useState<AiGenerationRoute>(initialRoute);
  const [section, setSection] = useState<SettingsSection>('api');
  const [visibleKey, setVisibleKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busy = saving || isClearingLocalData;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const provider =
    PROVIDERS.find((item) => item.id === draft.shaderProvider) ?? PROVIDERS[0];
  const cloudConfiguration = getCloudAiConfiguration(draft);
  const hasCloudDraft = Boolean(
    cloudConfiguration.key.trim() && cloudConfiguration.model.trim(),
  );
  const normalized = normalizeAiSettingsDraft(draft, route);
  const changed =
    route !== initialRoute ||
    Object.keys(normalized).some(
      (field) =>
        normalized[field as keyof AiSettings] !==
        settings[field as keyof AiSettings],
    );
  const localReady = Boolean(
    draft.localShaderModel &&
      isLocalModelReady(draft.localShaderModel, draft.visionEnabled),
  );
  const selectedLocal = LOCAL_SHADER_MODELS.find(
    (model) => model.id === draft.localShaderModel,
  );

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current?.focus();
    const keepFocusInDialog = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !dialogRef.current?.contains(event.target)
      )
        dialogRef.current?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, input, select, [tabindex="0"]',
        ) ?? [],
      ).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getClientRects().length > 0,
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', keepFocusInDialog);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', keepFocusInDialog);
      previousFocus?.focus();
    };
  }, []);

  const updateDraft = (field: keyof AiSettings, value: string | boolean) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    setRoute((current) => routeAfterAiSettingsEdit(next, field, current));
    setSaveError('');
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await saveAiSettingsDraft(settings, normalized, onChange);
      if (route !== initialRoute) onRouteChange?.(route);
      if (
        normalized.localShaderModel &&
        isLocalModelReady(normalized.localShaderModel, normalized.visionEnabled)
      ) {
        storeConfiguredLocalModel(normalized.localShaderModel);
      }
      onClose();
    } catch {
      setSaveError(
        'Your changes could not be saved. Check storage access on this device and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    if (!selectedLocal) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await prepareLocalModel(selectedLocal.id, draft.visionEnabled);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'The model could not be prepared. Try again.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="dialog-backdrop app-settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="app-settings"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        tabIndex={-1}
      >
        <header className="app-settings-header">
          <div>
            <h2 id="app-settings-title">Settings</h2>
            <p>Manage your AI providers, models, and local data.</p>
          </div>
          <button
            type="button"
            className="app-settings-close"
            aria-label="Close settings"
            disabled={busy}
            onClick={onClose}
          >
            <SettingsIcon name="close" />
          </button>
        </header>
        <div className="app-settings-layout">
          <nav className="app-settings-nav" aria-label="Settings sections">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={section === item.id ? 'page' : undefined}
                onClick={() => {
                  setSection(item.id);
                  setVisibleKey(false);
                  contentRef.current?.scrollTo({ top: 0 });
                }}
              >
                <SettingsIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
            <p>Saved on this device</p>
          </nav>
          <form
            id="app-settings-form"
            ref={contentRef}
            className="app-settings-content"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy && !downloading) void save();
            }}
          >
            <fieldset disabled={busy} className="app-settings-fields">
              {section !== 'data' && (
                <label className="app-settings-generator">
                  <span>
                    <strong>Default generator</strong>
                    <small>Used when you generate a shader.</small>
                  </span>
                  <select
                    aria-label="Default generator"
                    className="select-field"
                    value={route}
                    onChange={(event) =>
                      setRoute(event.target.value as AiGenerationRoute)
                    }
                  >
                    {!hasCloudDraft && <option value="chatgpt">ChatGPT</option>}
                    {!hasCloudDraft && (
                      <option value="perplexity">Perplexity</option>
                    )}
                    <option value="api">Cloud API</option>
                    <option value="local">Local model</option>
                  </select>
                </label>
              )}
              {section === 'api' && (
                <>
                  <div className="app-settings-heading">
                    <h3>API keys & models</h3>
                    <p>
                      Connect a provider for shader generation inside Mapshroom.
                    </p>
                    {hasCloudDraft && (
                      <p>API replies appear directly in this chat.</p>
                    )}
                  </div>
                  <div
                    className="app-settings-providers"
                    role="group"
                    aria-label="Cloud AI provider"
                  >
                    {PROVIDERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={provider.id === item.id}
                        onClick={() => {
                          updateDraft('shaderProvider', item.id);
                          setVisibleKey(false);
                        }}
                      >
                        <strong>{item.label}</strong>
                        <small>
                          {hasStoredCloudApiKey(settings[item.key])
                            ? 'Key saved'
                            : 'No saved key'}
                        </small>
                      </button>
                    ))}
                  </div>
                  <label className="field" htmlFor="settings-api-key">
                    <span>{provider.label} API key</span>
                  </label>
                  <div className="app-settings-key-row">
                    <input
                      id="settings-api-key"
                      className="text-field"
                      type={visibleKey ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="none"
                      value={
                        isDesktopKeyringSentinel(draft[provider.key])
                          ? ''
                          : draft[provider.key]
                      }
                      placeholder={
                        isDesktopKeyringSentinel(draft[provider.key])
                          ? 'Saved in the device credential manager'
                          : provider.placeholder
                      }
                      onChange={(event) =>
                        updateDraft(provider.key, event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="ghost-button"
                      aria-label={visibleKey ? 'Hide API key' : 'Show API key'}
                      aria-pressed={visibleKey}
                      disabled={
                        !draft[provider.key] ||
                        isDesktopKeyringSentinel(draft[provider.key])
                      }
                      onClick={() => setVisibleKey((value) => !value)}
                    >
                      {visibleKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {draft[provider.key] && (
                    <button
                      type="button"
                      className="app-settings-remove-key"
                      onClick={() => {
                        updateDraft(provider.key, '');
                        setVisibleKey(false);
                      }}
                    >
                      Remove key
                    </button>
                  )}
                  <label className="field app-settings-model">
                    <span>{provider.modelLabel}</span>
                    <input
                      className="text-field"
                      list={`settings-models-${provider.id}`}
                      value={draft[provider.model]}
                      placeholder="Choose or enter a model ID"
                      spellCheck={false}
                      onChange={(event) =>
                        updateDraft(provider.model, event.target.value)
                      }
                    />
                    <datalist id={`settings-models-${provider.id}`}>
                      {provider.options.map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                    <small>
                      Choose a suggested model or enter a model ID available to
                      your API account.
                    </small>
                  </label>
                  <p className="app-settings-storage-note">
                    {isTauri()
                      ? 'Keys are stored in your device’s credential manager.'
                      : 'Keys are stored in this browser on this device.'}{' '}
                    API requests go to the selected provider and use your API
                    account.
                  </p>
                  <label className="app-settings-vision">
                    <input
                      type="checkbox"
                      checked={draft.visionEnabled}
                      onChange={(event) =>
                        updateDraft('visionEnabled', event.target.checked)
                      }
                    />
                    <span>
                      <strong>Include the stage image</strong>
                      <small>
                        Send the current frame with your prompt. Requires a
                        model that supports image input.
                      </small>
                    </span>
                  </label>
                  {route === 'api' &&
                    (!normalized[provider.key] ||
                      !normalized[provider.model]) && (
                      <p className="app-settings-notice">
                        Add an API key and model to generate with{' '}
                        {provider.label}.
                      </p>
                    )}
                </>
              )}
              {section === 'local' && (
                <>
                  <div className="app-settings-heading">
                    <h3>Local models</h3>
                    <p>
                      Run a model on this device. Download it once for offline
                      use; larger models need more memory.
                    </p>
                  </div>
                  <div className="app-settings-models">
                    {LOCAL_SHADER_MODELS.map((model) => (
                      <label
                        key={model.id}
                        className={`app-settings-local-model ${draft.localShaderModel === model.id ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="settings-local-model"
                          checked={draft.localShaderModel === model.id}
                          disabled={downloading}
                          onChange={() => {
                            updateDraft('localShaderModel', model.id);
                            setDownloadError('');
                          }}
                        />
                        <span>
                          <strong>{model.label}</strong>
                          <small>{model.note}</small>
                        </span>
                        <span className="app-settings-model-size">
                          <strong>{model.size}</strong>
                          <small>{model.memory}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="app-settings-vision">
                    <input
                      type="checkbox"
                      checked={draft.visionEnabled}
                      disabled={downloading}
                      onChange={(event) => {
                        updateDraft('visionEnabled', event.target.checked);
                        setDownloadError('');
                      }}
                    />
                    <span>
                      <strong>Include the stage image</strong>
                      <small>
                        Also prepares {LOCAL_VISION_MODEL.label} (
                        {LOCAL_VISION_MODEL.size}) to describe the frame.
                      </small>
                    </span>
                  </label>
                  <div className="app-settings-download">
                    <span role="status">
                      <strong>
                        {downloading
                          ? 'Preparing model…'
                          : localReady
                            ? 'Ready on this device'
                            : selectedLocal
                              ? selectedLocal.label
                              : 'Select a model'}
                      </strong>
                      <small>
                        {downloading
                          ? 'Downloading files and loading the model. This may take a few minutes.'
                          : 'Cached files are reused when you prepare the model again.'}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!selectedLocal || downloading || localReady}
                      onClick={() => void download()}
                    >
                      {downloading
                        ? 'Preparing…'
                        : localReady
                          ? 'Ready'
                          : 'Prepare model'}
                    </button>
                  </div>
                  {downloading && (
                    <progress
                      className="app-settings-progress"
                      aria-label="Preparing local model"
                    />
                  )}
                  {downloadError && (
                    <p className="app-settings-error" role="alert">
                      {downloadError}
                    </p>
                  )}
                </>
              )}
              {section === 'data' && (
                <>
                  <div className="app-settings-heading">
                    <h3>Local data</h3>
                    <p>Manage the data Mapshroom keeps on this device.</p>
                  </div>
                  <div className="app-settings-data">
                    <SettingsIcon name="database" />
                    <div>
                      <strong>Clear local data</strong>
                      <p>
                        Removes saved projects, imported assets, model caches,
                        and API keys. Export any projects you want to keep
                        first.
                      </p>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={isClearingLocalData || downloading}
                        onClick={onClearLocalData}
                      >
                        {isClearingLocalData
                          ? 'Clearing data…'
                          : 'Clear local data…'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </fieldset>
          </form>
        </div>
        <footer className="app-settings-footer">
          <p
            role={saveError ? 'alert' : 'status'}
            className={saveError ? 'app-settings-error' : ''}
          >
            {saveError ||
              (changed
                ? 'You have unsaved changes.'
                : 'Your settings are up to date.')}
          </p>
          <div>
            <button
              type="button"
              className="ghost-button"
              disabled={busy}
              onClick={onClose}
            >
              {changed ? 'Cancel' : 'Close'}
            </button>
            <button
              type="submit"
              form="app-settings-form"
              className="primary-button"
              disabled={!changed || busy || downloading}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
