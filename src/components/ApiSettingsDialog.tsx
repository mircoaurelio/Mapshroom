import { useEffect, useState } from 'react';
import {
  DEFAULT_ANTHROPIC_MODEL_OPTIONS,
  DEFAULT_GOOGLE_MODEL_OPTIONS,
  DEFAULT_OPENAI_MODEL_OPTIONS,
} from '../config';
import { isLocalModelReady, LOCAL_SHADER_MODELS, LOCAL_VISION_MODEL, prepareLocalModel } from '../lib/localAi';
import {
  focusExternalAiWindow,
  openExternalAiWindow,
  type ExternalAiWindowResult,
} from '../lib/openExternalAiWindow';
import type { AiSettings, ShaderRuntime } from '../types';

export type ApiSettingsVariant = 'setup' | 'settings';

interface ApiSettingsDialogProps {
  open: boolean;
  settings: AiSettings;
  variant?: ApiSettingsVariant;
  externalChatPrompt?: string;
  isClearingLocalData?: boolean;
  onClose: () => void;
  onChange: (field: keyof AiSettings, value: string | boolean) => void;
  onApplyExternalChatResponse: (response: string) => Promise<void>;
  onClearLocalData: () => void;
}

type AiPath = 'perplexity' | 'chatgpt' | Exclude<ShaderRuntime, ''>;

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

function ChatModelIcon() {
  return (
    <svg className="ai-path-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M12 15.5h40v28H29l-10 8v-8h-7v-28Z"
        fill="rgba(129,140,248,.12)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M21 25h22M21 33h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m45 8 1.7 4.3L51 14l-4.3 1.7L45 20l-1.7-4.3L39 14l4.3-1.7L45 8Z"
        fill="currentColor"
        opacity=".72"
      />
    </svg>
  );
}

export function ApiSettingsDialog({
  open,
  settings,
  variant = 'settings',
  externalChatPrompt = '',
  isClearingLocalData = false,
  onClose,
  onChange,
  onApplyExternalChatResponse,
  onClearLocalData,
}: ApiSettingsDialogProps) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<AiPath | ''>('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [externalWindowMode, setExternalWindowMode] = useState<ExternalAiWindowResult | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [isApplyingChatResponse, setIsApplyingChatResponse] = useState(false);
  const isSetup = variant === 'setup';

  useEffect(() => {
    if (!downloading) return;
    const intervalId = window.setInterval(() => {
      setDownloadProgress((current) => Math.min(92, current + Math.max(0.35, (92 - current) * 0.025)));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [downloading]);

  useEffect(() => {
    setSelectedPath('');
    setChatResponse('');
    setChatMessage('');
    setExternalWindowMode(null);
    setPromptCopied(false);
    setShowCopyTooltip(false);
    setIsApplyingChatResponse(false);
  }, [externalChatPrompt, open]);

  useEffect(() => {
    if (!showCopyTooltip) return;
    const timeoutId = window.setTimeout(() => setShowCopyTooltip(false), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [showCopyTooltip]);

  if (!open) return null;

  const chooseRuntime = (runtime: Exclude<ShaderRuntime, ''>) => {
    setSelectedPath(runtime);
    onChange('shaderRuntime', runtime);
  };
  const showRuntimeChoice = (path: AiPath) => !selectedPath || selectedPath === path;
  const usingPerplexity = selectedPath === 'perplexity';
  const usingChatGpt = selectedPath === 'chatgpt';
  const usingDirectChat = usingPerplexity || usingChatGpt;
  const usingPairedExternalWindow = usingDirectChat && externalWindowMode === 'popup';
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
  const handleCopyChatPrompt = async () => {
    if (!externalChatPrompt) return;
    setChatMessage('');
    try {
      await navigator.clipboard.writeText(externalChatPrompt);
      setPromptCopied(true);
      setShowCopyTooltip(true);
    } catch {
      setPromptCopied(false);
      setShowCopyTooltip(false);
      setChatMessage('Clipboard access was blocked. Select the prompt text and copy it manually.');
    }
  };
  const handleChooseChatGpt = () => {
    if (usingChatGpt && focusExternalAiWindow()) {
      return;
    }
    setSelectedPath('chatgpt');
    onChange('shaderRuntime', 'chat');
    setChatMessage('');
    if (!externalChatPrompt) return;
    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(externalChatPrompt)}`;
    const openResult = openExternalAiWindow(chatGptUrl);
    setExternalWindowMode(openResult);
    if (openResult === 'blocked') {
      setChatMessage('The browser blocked the ChatGPT window. Allow popups for Mapshroom, then open it again.');
    }
  };
  const handleChooseChatRuntime = () => {
    chooseRuntime('chat');
    if (externalChatPrompt) {
      void handleCopyChatPrompt();
    }
  };
  const handleChoosePerplexity = () => {
    if (usingPerplexity && focusExternalAiWindow()) {
      return;
    }
    setSelectedPath('perplexity');
    onChange('shaderRuntime', 'chat');
    setChatMessage('');
    if (!externalChatPrompt) return;
    const perplexityUrl = `https://www.perplexity.ai/?q=${encodeURIComponent(externalChatPrompt)}`;
    const openResult = openExternalAiWindow(perplexityUrl);
    setExternalWindowMode(openResult);
    if (openResult === 'blocked') {
      setChatMessage('The browser blocked the Perplexity window. Allow popups for Mapshroom, then open it again.');
    }
  };
  const handleFocusDirectChat = () => {
    if (focusExternalAiWindow()) {
      return;
    }

    if (usingPerplexity) {
      handleChoosePerplexity();
    } else {
      handleChooseChatGpt();
    }
  };
  const handlePasteAndApply = async (responseOverride?: string) => {
    setChatMessage('');
    let response = responseOverride?.trim() || chatResponse.trim();

    if (!response) {
      try {
        response = (await navigator.clipboard.readText()).trim();
        setChatResponse(response);
      } catch {
        setChatMessage('Clipboard access was blocked. Paste the AI reply into the response box, then try again.');
        return;
      }
    }

    if (!response) {
      setChatMessage('Copy the shader reply from your AI chat, or paste it into the response box first.');
      return;
    }

    setIsApplyingChatResponse(true);
    try {
      await onApplyExternalChatResponse(response);
    } catch (error) {
      setChatMessage(error instanceof Error ? error.message : 'That reply could not be applied as a shader.');
    } finally {
      setIsApplyingChatResponse(false);
    }
  };
  const directProviderName = usingPerplexity ? 'Perplexity' : 'ChatGPT';
  const externalSurfaceLabel =
    externalWindowMode === 'popup'
      ? 'right-side window'
      : externalWindowMode === 'tab'
        ? 'browser tab'
        : 'AI window';
  const pasteReplyControls = (
    <div className="ai-chat-paste-zone">
      <div className="ai-chat-paste-heading">
        <span className="ai-chat-paste-label">Paste the shader reply</span>
        <small>
          Copy the GLSL code block from {usingDirectChat ? directProviderName : 'your AI chat'}, then paste it here.
        </small>
      </div>
      <textarea
        className="prompt-field ai-chat-response"
        aria-label="AI chat shader response"
        placeholder="Paste the GLSL code block or the full AI reply here…"
        value={chatResponse}
        disabled={isApplyingChatResponse}
        onChange={(event) => setChatResponse(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isApplyingChatResponse) {
            event.preventDefault();
            void handlePasteAndApply();
          }
        }}
      />
      <button
        type="button"
        className="primary-button ai-chat-apply-button"
        disabled={isApplyingChatResponse}
        onClick={() => void handlePasteAndApply()}
      >
        {isApplyingChatResponse
          ? 'Applying shader…'
          : chatResponse.trim()
            ? 'Apply shader'
            : 'Paste clipboard & apply'}
      </button>
    </div>
  );

  return (
    <div
      className={usingPairedExternalWindow ? 'dialog-backdrop ai-direct-chat-layout' : 'dialog-backdrop'}
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`dialog-panel ai-settings-dialog ${isSetup ? 'ai-settings-dialog-setup' : 'ai-settings-dialog-settings'} ${usingDirectChat ? 'ai-settings-dialog-direct-chat' : ''}`}
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
          {!selectedPath ? (
            <p className="dialog-note">
              {isSetup
                ? 'Choose a browser brain, connect a cloud API, or borrow the AI chat you already use.'
                : 'Run a model in this browser, connect an API, or copy a ready-made prompt into your usual AI chat.'}
            </p>
          ) : null}

          <div
            className={`ai-runtime-choice ${selectedPath ? 'has-selection' : ''}`}
            role="radiogroup"
            aria-label="AI runtime"
          >
            {showRuntimeChoice('chatgpt') ? (
              <button
                type="button"
                className={`ai-path-card ai-path-card-chat ${usingChatGpt ? 'active' : ''}`}
                onClick={handleChooseChatGpt}
              >
                <span className="ai-path-brand-mark ai-path-brand-mark-chatgpt" aria-hidden="true">
                  <img src={`${import.meta.env.BASE_URL}assets/icons/chatgpt.svg`} alt="" />
                </span>
                <div className="ai-path-card-copy">
                  <span className="ai-path-card-tag">Direct &amp; free</span>
                  <strong>Use ChatGPT for free</strong>
                  <span>Open ChatGPT with the prompt, then copy its shader reply back into Mapshroom.</span>
                </div>
              </button>
            ) : null}
            {showRuntimeChoice('perplexity') ? (
              <button
                type="button"
                className={`ai-path-card ai-path-card-perplexity ${usingPerplexity ? 'active' : ''}`}
                onClick={handleChoosePerplexity}
              >
                <span className="ai-path-brand-mark ai-path-brand-mark-perplexity" aria-hidden="true">
                  <img src={`${import.meta.env.BASE_URL}assets/icons/perplexity.svg`} alt="" />
                </span>
                <div className="ai-path-card-copy">
                  <span className="ai-path-card-tag">Direct &amp; free</span>
                  <strong>Use Perplexity for free</strong>
                  <span>Open Perplexity with the prompt, then copy its shader reply back into Mapshroom.</span>
                </div>
              </button>
            ) : null}
            {showRuntimeChoice('local') ? (
              <button
                type="button"
                className={`ai-path-card ai-path-card-local ${selectedPath === 'local' ? 'active' : ''}`}
                onClick={() => chooseRuntime('local')}
              >
                <LocalModelIcon />
                <div className="ai-path-card-copy">
                  <span className="ai-path-card-tag">Cheap &amp; a bit stupid</span>
                  <strong>Use local models for free</strong>
                  <span>Free, private, offline after download. Smaller browser brains — messier, funnier shaders.</span>
                </div>
              </button>
            ) : null}
            {showRuntimeChoice('api') ? (
              <button
                type="button"
                className={`ai-path-card ai-path-card-cloud ${selectedPath === 'api' ? 'active' : ''}`}
                onClick={() => chooseRuntime('api')}
              >
                <CloudModelIcon />
                <div className="ai-path-card-copy">
                  <span className="ai-path-card-tag">Strange &amp; costly</span>
                  <strong>Cloud API</strong>
                  <span>Sharper results, weirder tricks, and a meter that notices. Recommended when quality matters.</span>
                </div>
              </button>
            ) : null}
            {showRuntimeChoice('chat') ? (
              <button
                type="button"
                className={`ai-path-card ai-path-card-generic ${selectedPath === 'chat' ? 'active' : ''}`}
                onClick={handleChooseChatRuntime}
              >
                <ChatModelIcon />
                <div className="ai-path-card-copy">
                  <span className="ai-path-card-tag">Any chat &amp; free</span>
                  <strong>Use your AI chat for free</strong>
                  <span>Copy the prompt into another AI chat, then paste its shader reply back here.</span>
                </div>
                {showCopyTooltip ? (
                  <span className="ai-chat-copied-tooltip" role="status" aria-live="polite">
                    <span aria-hidden="true">✓</span>
                    Prompt copied
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>

          {selectedPath === 'chat' || usingDirectChat ? (
            <section className="dialog-section ai-model-section ai-chat-section">
              {externalChatPrompt ? (
                <div className="ai-chat-workflow ai-chat-workflow-compact">
                  {usingDirectChat ? (
                    externalWindowMode === 'blocked' ? (
                      <div className="ai-chat-copy-confirmation" role="alert">
                        <span className="ai-chat-copy-check" aria-hidden="true">!</span>
                        <div>
                          <strong>{directProviderName} could not open</strong>
                          <small>Allow popups for Mapshroom, then try opening the AI window again.</small>
                        </div>
                        <button
                          type="button"
                          className="ghost-button ai-chat-copy-again"
                          onClick={handleFocusDirectChat}
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                    <div className="ai-chat-window-handoff" role="status" aria-live="polite">
                      <div className="ai-chat-window-header">
                        <span className="ai-chat-window-presence" aria-hidden="true">
                          <span />
                        </span>
                        <div>
                          <span className="ai-chat-window-eyebrow">
                            {directProviderName} · {externalSurfaceLabel} open
                          </span>
                          <strong>Finish these steps in {directProviderName}</strong>
                          <small>Keep this Mapshroom modal open, then paste the finished shader below.</small>
                        </div>
                        <button
                          type="button"
                          className="ghost-button ai-chat-focus-window"
                          onClick={handleFocusDirectChat}
                        >
                          Bring to front
                        </button>
                      </div>
                      <ol className="ai-chat-handoff-steps" aria-label={`${directProviderName} handoff steps`}>
                        <li className="is-current">
                          <span className="ai-chat-step-number">1</span>
                          <div>
                            <strong>Wait for the prompt, then send it</strong>
                            <small>
                              When the prepared prompt appears, click the black arrow at the bottom-right of {directProviderName}.
                            </small>
                          </div>
                          <span className="ai-chat-send-button-cue" aria-hidden="true">↑</span>
                        </li>
                        <li>
                          <span className="ai-chat-step-number">2</span>
                          <div>
                            <strong>Wait for the shader code</strong>
                            <small>{directProviderName} will return one GLSL code block with a Copy button.</small>
                          </div>
                        </li>
                        <li>
                          <span className="ai-chat-step-number">3</span>
                          <div>
                            <strong>Copy, paste, and apply</strong>
                            <small>Copy that code, paste it below, then click Apply shader.</small>
                          </div>
                        </li>
                      </ol>
                      <div className="ai-chat-waiting">
                        <span aria-hidden="true" />
                        Waiting for the shader code
                      </div>
                    </div>
                    )
                  ) : (
                    <div
                      className={`ai-chat-copy-confirmation ${promptCopied ? 'is-copied' : ''}`}
                      role="status"
                      aria-live="polite"
                    >
                      <span className="ai-chat-copy-check" aria-hidden="true">{promptCopied ? '✓' : '…'}</span>
                      <div>
                        <strong>{promptCopied ? 'Prompt copied' : 'Prompt ready'}</strong>
                        <small>
                          {promptCopied
                            ? 'Paste it into your AI chat, then copy the returned shader back here.'
                            : 'Copy the prompt to continue.'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="ghost-button ai-chat-copy-again"
                        onClick={() => void handleCopyChatPrompt()}
                      >
                        {promptCopied ? 'Copy again' : 'Copy prompt'}
                      </button>
                    </div>
                  )}
                  <details className="ai-chat-prompt-details">
                    <summary>View prompt</summary>
                    <textarea
                      className="prompt-field ai-chat-prompt"
                      aria-label="Prepared shader prompt"
                      readOnly
                      value={externalChatPrompt}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </details>
                  {pasteReplyControls}
                  {chatMessage ? <p className="ai-chat-message" role="status">{chatMessage}</p> : null}
                </div>
              ) : (
                <p className="helper-copy ai-chat-empty">
                  Write what you want, then press Generate.
                </p>
              )}
            </section>
          ) : null}

          {selectedPath === 'local' ? (
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

          {selectedPath === 'api' ? (
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

          {!isSetup && selectedPath ? (
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
