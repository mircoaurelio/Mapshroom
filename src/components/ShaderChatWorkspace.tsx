import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ShaderChatTurn, ShaderVersion } from '../types';
import { getShaderChatResults } from '../lib/shaderChatResults';
import { getShaderChatSuggestions } from '../lib/shaderChatSuggestions';
import { ShaderThumbnail } from './ShaderThumbnail';
import { ShaderChatIcon } from './ShaderChatIcon';
import './ShaderChatWorkspace.css';

type ChatTab = 'chat' | 'code' | 'history';
interface ShaderChatWorkspaceProps {
  shaderCode: string;
  versions: ShaderVersion[];
  chatHistory: ShaderChatTurn[];
  pendingPrompt?: string;
  handoff?: ReactNode;
  loading: boolean;
  feedback: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  composer: ReactNode;
  performanceSuggestion?: ReactNode;
  codePanel: ReactNode;
  historyPanel: ReactNode;
  onRestore: (id: string) => void;
  onNewChat: () => void;
  onSuggest: (prompt: string) => void;
  onRetry: (prompt: string) => void;
  onRetryFailed?: () => void;
  onOpenAiSettings?: () => void;
}

export function ShaderChatWorkspace({
  shaderCode, versions, chatHistory, pendingPrompt, handoff, loading, feedback, feedbackTone,
  composer, performanceSuggestion, codePanel, historyPanel, onRestore, onNewChat, onSuggest, onRetry, onRetryFailed, onOpenAiSettings,
}: ShaderChatWorkspaceProps) {
  const [tab, setTab] = useState<ChatTab>('chat');
  const [hiddenVersions, setHiddenVersions] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');
  const [suggestions] = useState(getShaderChatSuggestions);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const id = useId();
  const shownVersions = getShaderChatResults(versions, chatHistory).filter(version => !hiddenVersions.includes(version.id)).slice(-20);
  const showWelcome = shownVersions.length === 0 && !pendingPrompt && !handoff && !loading && !feedback;

  useEffect(() => {
    if (tab === 'chat' && followRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = showWelcome ? 0 : scrollRef.current.scrollHeight;
    }
  }, [versions, pendingPrompt, feedback, loading, tab, showWelcome]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyCode = async (version: ShaderVersion) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(version.code);
      setCopied(version.id);
    } catch {
      setCopyError('Clipboard access was blocked. Open View code to copy the shader manually.');
    }
  };

  return (
    <section className="shader-chat-workspace" aria-label="Shader chat">
      <div className="shader-chat-tabs" role="tablist" aria-label="Shader workspace">
        {(['chat', 'code', 'history'] as const).map((value, index, tabs) => (
          <button
            key={value} type="button" role="tab" id={`${id}-${value}-tab`}
            aria-controls={`${id}-${value}`} aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
            onKeyDown={event => {
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              setTab(tabs[next]);
              document.getElementById(`${id}-${tabs[next]}-tab`)?.focus();
            }}
          >{value === 'chat' ? 'Chat' : value === 'code' ? 'Code' : 'History'}</button>
        ))}
        <button className="shader-chat-new" type="button" aria-label="New conversation" title="New conversation" disabled={loading}
          onClick={() => {
            setHiddenVersions(versions.map(version => version.id));
            setTab('chat');
            followRef.current = true;
            onNewChat();
          }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" /><path d="M12 7v7m-3.5-3.5h7" /></svg>
        </button>
      </div>
      <div id={`${id}-chat`} role="tabpanel" aria-labelledby={`${id}-chat-tab`} hidden={tab !== 'chat'} className="shader-chat-panel">
        <div className="shader-chat-messages" ref={scrollRef} role="log" aria-label="Shader conversation" aria-live="polite" aria-relevant="additions text"
          onScroll={event => {
            const node = event.currentTarget;
            followRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
          }}>
          {showWelcome ? <div className="shader-chat-welcome">
            <p className="shader-chat-greeting">Hi! What would you like to create? Describe your idea<span className="shader-chat-starters-invite"> or choose a suggestion below</span>.</p>
            <div className="shader-chat-starters" role="group" aria-label="Suggestions to get started">
              {suggestions.map(text => <button key={text} type="button" onClick={() => onSuggest(text)}>{text}</button>)}
            </div>
          </div> : null}
          {shownVersions.map(version => {
            const isCurrent = version.code === shaderCode;
            return <div className="shader-chat-exchange" key={version.id}>
              {version.prompt ? <article className="shader-chat-user"><small>You</small><p>{version.prompt}</p></article> : null}
              <article className="shader-chat-assistant">
                <small>Assistant</small>
                <p>Your shader version is ready.</p>
                <div className="shader-chat-result">
                  <div className="shader-chat-result-preview"><ShaderThumbnail shader={version} /></div>
                  <div className="shader-chat-result-heading"><strong>{version.name}</strong><span className={isCurrent ? 'is-applied' : ''}>{isCurrent ? <><ShaderChatIcon name="check" /> Current</> : 'Saved version'}</span></div>
                  <div className="shader-chat-result-actions">
                    {isCurrent ? <button type="button" onClick={() => setTab('code')}><ShaderChatIcon name="code" /> View code</button> : null}
                    <button type="button" disabled={loading || isCurrent} onClick={() => onRestore(version.id)}><ShaderChatIcon name="restore" /> Restore</button>
                  </div>
                  {!isCurrent ? <details className="shader-chat-version-code"><summary>View code</summary><pre>{version.code}</pre></details> : null}
                </div>
                <div className="shader-chat-message-actions">
                  <button type="button" onClick={() => { void copyCode(version); }}><ShaderChatIcon name={copied === version.id ? 'check' : 'copy'} /> {copied === version.id ? 'Copied' : 'Copy'}</button>
                  <button type="button" disabled={loading} onClick={() => { followRef.current = true; onRetry(version.prompt); }}><ShaderChatIcon name="retry" /> Retry</button>
                </div>
              </article>
            </div>;
          })}
          {pendingPrompt ? <article className="shader-chat-user"><small>You</small><p>{pendingPrompt}</p></article> : null}
          {handoff}
          {loading ? <article className="shader-chat-assistant shader-chat-working"><small>Assistant</small><p><span aria-hidden="true">•••</span> Creating your shader…</p></article> : null}
          {feedback && !loading ? <article className={`shader-chat-assistant shader-chat-feedback is-${feedbackTone}`}>
            <small>Assistant</small><p>{feedback}</p>
            {feedbackTone === 'error' && onRetryFailed ? <div className="shader-chat-message-actions shader-chat-error-actions">
              <button type="button" disabled={loading} onClick={() => { followRef.current = true; onRetryFailed(); }}><ShaderChatIcon name="retry" /> Retry request</button>
              {onOpenAiSettings ? <button type="button" onClick={onOpenAiSettings}>AI settings</button> : null}
            </div> : null}
          </article> : null}
          {copyError ? <p className="shader-chat-copy-error" role="alert">{copyError}</p> : null}
        </div>
        <div className="shader-chat-compose-area">
          {performanceSuggestion}
          {composer}
          <small className="shader-chat-keyboard-hint">Enter to send · Shift + Enter for a new line</small>
        </div>
      </div>
      <div id={`${id}-code`} role="tabpanel" aria-labelledby={`${id}-code-tab`} hidden={tab !== 'code'} className="shader-chat-tool-panel shader-chat-code-panel">{tab === 'code' ? codePanel : null}</div>
      <div id={`${id}-history`} role="tabpanel" aria-labelledby={`${id}-history-tab`} hidden={tab !== 'history'} className="shader-chat-tool-panel">{tab === 'history' ? historyPanel : null}</div>
    </section>
  );
}
