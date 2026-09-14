import { useEffect, useRef, useState } from 'react';
import type { AiGenerationRoute } from '../lib/aiRoute';
import { CloudModelIcon } from './CloudModelIcon';
import { PanelSection } from './PanelSection';

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
  prompt: string;
  selectedRoute: AiGenerationRoute;
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
  prompt,
  selectedRoute,
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
  const [pasteMenuOpen, setPasteMenuOpen] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const pasteMenuRef = useRef<HTMLDivElement>(null);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const promptFieldRef = useRef<HTMLTextAreaElement>(null);
  const promptPointerActivationRef = useRef(false);
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);
  const hasPromptLine = prompt.split('\n').some((line) => line.trim().length > 0);
  const selectedRouteOption =
    AI_ROUTE_OPTIONS.find((option) => option.value === selectedRoute) ??
    AI_ROUTE_OPTIONS[0];
  useEffect(() => {
    if (!pasteMenuOpen && !routeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (pasteMenuOpen && !pasteMenuRef.current?.contains(target)) {
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
            placeholder="Describe the shader you want to create or change…"
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
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!aiLoading) {
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
                <span aria-hidden="true">+</span>
              </button>
              {pasteMenuOpen ? (
                <div className="ai-prompt-add-menu" role="menu">
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
                  aria-label={`Shader AI model: ${selectedRouteOption.label}`}
                  aria-haspopup="listbox"
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
                  <span>{selectedRouteOption.label}</span>
                  <span className="ai-prompt-route-chevron" aria-hidden="true">⌄</span>
                </button>
                {routeMenuOpen ? (
                  <div className="ai-prompt-route-menu" role="listbox" aria-label="Shader AI model">
                    {AI_ROUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === selectedRoute}
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
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`ai-prompt-send-button ${hasPromptLine ? 'is-ready' : ''}`}
                disabled={aiLoading}
                aria-label={aiLoading ? 'Generating shader' : 'Generate shader'}
                title={aiLoading ? 'Generating…' : 'Generate shader'}
                onClick={() => onSubmit()}
              >
                <span aria-hidden="true">{aiLoading ? '…' : '↑'}</span>
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

        {showFeedback ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
