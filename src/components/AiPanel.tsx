import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAiRouteIdentity, type AiGenerationRoute } from '../lib/aiRoute';
import type { AiSettings } from '../types';
import { CloudModelIcon } from './CloudModelIcon';
import { PanelSection } from './PanelSection';
import { ShaderChatIcon } from './ShaderChatIcon';

const AI_ROUTE_OPTIONS: Array<{
  value: AiGenerationRoute;
  label: string;
  note: string;
  mark: string;
  icon?: string;
}> = [
  { value: 'chatgpt', label: 'ChatGPT', note: 'Free handoff', mark: 'G', icon: 'chatgpt.svg' },
  {
    value: 'perplexity',
    label: 'Perplexity',
    note: 'Free handoff',
    mark: 'P',
    icon: 'perplexity.svg',
  },
  { value: 'local', label: 'Local model', note: 'Runs on device', mark: 'L' },
  { value: 'api', label: 'API', note: 'Use your key', mark: 'A' },
];

interface AiPanelProps {
  compact?: boolean;
  onCopyPrompt?: () => Promise<void>;
  prompt: string;
  selectedRoute: AiGenerationRoute;
  settings: AiSettings;
  onOpenSettings: () => void;
  cloudApiConfigured?: boolean;
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  onPromptChange: (value: string) => void;
  onPromptFocus: () => void;
  onRouteChange: (route: AiGenerationRoute) => void;
  onPasteShader: () => Promise<boolean>;
  onPastePosition: () => Promise<void>;
  onSubmit: () => void;
  onFixError: () => void;
}

export function AiPanel({
  compact = false,
  onCopyPrompt,
  prompt,
  selectedRoute,
  settings,
  onOpenSettings,
  cloudApiConfigured = false,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  onPromptChange,
  onPromptFocus,
  onRouteChange,
  onPasteShader,
  onPastePosition,
  onSubmit,
  onFixError,
}: AiPanelProps) {
  const [copyMessage, setCopyMessage] = useState('');
  const [pasteMenuOpen, setPasteMenuOpen] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const pasteMenuRef = useRef<HTMLDivElement>(null);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const promptFieldRef = useRef<HTMLTextAreaElement>(null);
  const promptPointerActivationRef = useRef(false);
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);
  const hasPromptLine = prompt.split('\n').some((line) => line.trim().length > 0);
  const routeOptions = AI_ROUTE_OPTIONS.map(option => {
    const identity = getAiRouteIdentity(settings, option.value);
    return { ...option, ...identity, note: identity.model || option.note };
  });
  const selectedRouteOption = routeOptions.find(option => option.value === selectedRoute) ?? routeOptions[0];
  const selectedModelLabel = [selectedRouteOption.label, selectedRouteOption.model].filter(Boolean).join(' · ');
  useEffect(() => {
    if (!copyMessage) return;
    const timeout = window.setTimeout(() => setCopyMessage(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  useLayoutEffect(() => {
    const field = promptFieldRef.current;
    if (!compact || !field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(150, field.scrollHeight)}px`;
  }, [prompt, compact]);

  useEffect(() => {
    if (!pasteMenuOpen && !routeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (pasteMenuOpen && !pasteMenuRef.current?.contains(target) && !(target instanceof Element && target.closest('.ai-prompt-clipboard-button'))) {
        setPasteMenuOpen(false);
      }
      if (routeMenuOpen && !routeMenuRef.current?.contains(target)) {
        setRouteMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPasteMenuOpen(false);
        setRouteMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pasteMenuOpen, routeMenuOpen]);

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
        <div className="ai-prompt-composer">
          <textarea
            ref={promptFieldRef}
            className="prompt-field prompt-field-hero"
            aria-label="Shader prompt"
            placeholder={compact ? 'Describe a change…' : 'Describe the shader you want to create or change…'}
            rows={2}
            value={prompt}
            onPointerDown={() => {
              promptPointerActivationRef.current = true;
              onPromptFocus();
              window.queueMicrotask(() => {
                promptPointerActivationRef.current = false;
              });
            }}
            onFocus={() => {
              if (!promptPointerActivationRef.current) {
                onPromptFocus();
              }
            }}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!aiLoading && hasPromptLine) {
                  onSubmit();
                }
              }
            }}
          />
          <div className="ai-prompt-composer-footer">
            <div ref={pasteMenuRef} className="ai-prompt-add-shell">
              <button
                type="button"
                className={`ai-prompt-add-button ${pasteMenuOpen ? 'active' : ''}`}
                aria-label="Load from clipboard"
                aria-haspopup="menu"
                aria-expanded={pasteMenuOpen}
                title="Load from clipboard"
                onClick={() => setPasteMenuOpen((current) => !current)}
              >
                <ShaderChatIcon name="plus" />
              </button>
              {pasteMenuOpen ? (
                <div className="ai-prompt-add-menu" role="menu">
                  {compact && onCopyPrompt ? <button type="button" role="menuitem" disabled={!hasPromptLine} onClick={async () => {
                    setPasteMenuOpen(false);
                    try { await onCopyPrompt(); setCopyMessage('Copied'); }
                    catch { setCopyMessage('Copy failed'); }
                  }}><span className="ai-prompt-add-menu-icon" aria-hidden="true">⧉</span><span><strong>Copy prompt</strong><small>Ready for your preferred AI chat</small></span></button> : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPasteShader();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">{'{}'}</span>
                    <span>
                      <strong>Paste shader</strong>
                      <small>Clipboard → code</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPastePosition();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">⌖</span>
                    <span>
                      <strong>Paste position</strong>
                      <small>Clipboard → mapping</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="ai-prompt-route-actions">
              <div
                ref={routeMenuRef}
                className="ai-prompt-route-select"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setRouteMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setRouteMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className={`ai-prompt-route-trigger ${routeMenuOpen ? 'active' : ''}`}
                  aria-label={`Shader AI model: ${selectedModelLabel}`}
                  title={selectedModelLabel}
                  aria-haspopup="menu"
                  aria-expanded={routeMenuOpen}
                  onClick={() => setRouteMenuOpen((current) => !current)}
                >
                  <span className="ai-prompt-route-mark" aria-hidden="true">
                    {selectedRouteOption.value === 'api' ? (
                      <CloudModelIcon className="ai-prompt-route-provider-icon" compact />
                    ) : selectedRouteOption.icon ? (
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${selectedRouteOption.icon}`}
                        alt=""
                      />
                    ) : (
                      selectedRouteOption.mark
                    )}
                  </span>
                  <span className="ai-prompt-route-identity">
                    <strong>{selectedRouteOption.label}</strong>
                    {selectedRouteOption.model ? <small>{selectedRouteOption.model}</small> : null}
                  </span>
                  <ShaderChatIcon name="chevron" className="ai-prompt-route-chevron" />
                </button>
                {routeMenuOpen ? (
                  <div className="ai-prompt-route-menu" role="menu" aria-label="Shader AI model">
                    {routeOptions.filter(option => !cloudApiConfigured || option.value === 'api' || option.value === 'local').map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={option.value === selectedRoute}
                        className={option.value === selectedRoute ? 'active' : ''}
                        onClick={() => {
                          onRouteChange(option.value);
                          setRouteMenuOpen(false);
                        }}
                      >
                        <span className="ai-prompt-route-mark" aria-hidden="true">
                          {option.value === 'api' ? (
                            <CloudModelIcon className="ai-prompt-route-provider-icon" compact />
                          ) : option.icon ? (
                            <img
                              src={`${import.meta.env.BASE_URL}assets/icons/${option.icon}`}
                              alt=""
                            />
                          ) : (
                            option.mark
                          )}
                        </span>
                        <span className="ai-prompt-route-menu-copy">
                          <strong>{option.label}</strong>
                          <small>{option.note}</small>
                        </span>
                        {option.value === selectedRoute ? (
                          <span className="ai-prompt-route-check" aria-hidden="true">✓</span>
                        ) : null}
                      </button>
                    ))}
                    <button type="button" role="menuitem" className="ai-prompt-route-settings" onClick={() => {
                      setRouteMenuOpen(false);
                      onOpenSettings();
                    }}>AI settings <span aria-hidden="true">↗</span></button>
                  </div>
                ) : null}
              </div>
              {compact ? <button type="button" className="ai-prompt-clipboard-button" aria-label="Copy and paste options" title={copyMessage || 'Copy prompt or paste shader'} aria-haspopup="menu" aria-expanded={pasteMenuOpen} onClick={() => setPasteMenuOpen(value => !value)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="3" width="10" height="13" rx="2" /><path d="M4 6H3v12h10v-1" /></svg><span role="status">{copyMessage || 'Copy and paste'}</span>
              </button> : null}
              <button
                type="button"
                className={`ai-prompt-send-button ${hasPromptLine ? 'is-ready' : ''}`}
                disabled={aiLoading || !hasPromptLine}
                aria-label={aiLoading ? 'Generating shader' : 'Generate shader'}
                title={aiLoading ? 'Generating…' : 'Generate shader'}
                onClick={() => onSubmit()}
              >
                <ShaderChatIcon name={aiLoading ? 'more' : 'send'} />
              </button>
            </div>
          </div>
        </div>

        {shaderError ? (
          <div className="error-panel shader-chat-error">
            {shaderError}
            <button
              type="button"
              className="fix-error-button"
              disabled={aiLoading}
              onClick={onFixError}
            >
              {aiLoading ? 'Fixing...' : 'Fix Error'}
            </button>
          </div>
        ) : null}

        {showFeedback && !compact ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
