import { useEffect, useId, useRef, useState } from 'react';
import { pasteExternalShader } from '../lib/pasteExternalShader';
import { ShaderChatIcon } from './ShaderChatIcon';

interface ShaderChatHandoffProps {
  provider: 'ChatGPT' | 'Perplexity';
  blocked: boolean;
  onOpenChat: () => void;
  onApplyCode: (code: string) => Promise<void>;
}

export function ShaderChatHandoff({ provider, blocked, onOpenChat, onApplyCode }: ShaderChatHandoffProps) {
  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pasteButtonRef = useRef<HTMLButtonElement>(null);
  const clipboardAbortRef = useRef<AbortController | null>(null);
  const id = useId();

  useEffect(() => () => clipboardAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!showInput) return;
    const frame = window.requestAnimationFrame(() => {
      const form = formRef.current;
      const messages = form?.closest<HTMLElement>('.shader-chat-messages');
      if (form && messages) {
        const overflow = form.getBoundingClientRect().bottom - messages.getBoundingClientRect().bottom + 20;
        if (overflow > 0) messages.scrollTop += overflow;
      }
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showInput, error]);

  const handlePaste = async () => {
    if (applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    setError('');
    const controller = new AbortController();
    clipboardAbortRef.current = controller;
    try {
      const result = await pasteExternalShader(() => navigator.clipboard.readText(), onApplyCode, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.applied) {
        if (result.code) setCode(result.code);
        setError(result.error ?? '');
        setShowInput(true);
      }
    } finally {
      applyingRef.current = false;
      if (!controller.signal.aborted) setApplying(false);
    }
  };

  return <article className="shader-chat-assistant shader-chat-handoff">
    <p>{blocked
      ? `Il browser ha bloccato l’apertura di ${provider}. Puoi riprovare qui sotto.`
      : `È stata aperta l’interfaccia di ${provider}. Attendi il caricamento, poi premi Invio per inviare il prompt già inserito.`}</p>
    <p>Quando la risposta è pronta, copia il codice e premi “Incolla codice” qui sotto.</p>
    {blocked ? <button type="button" className="shader-chat-handoff-button" onClick={onOpenChat}>Apri {provider}</button> : null}
    <button ref={pasteButtonRef} type="button" className="shader-chat-handoff-button" aria-expanded={showInput} aria-controls={`${id}-input`} disabled={applying}
      onClick={() => { void handlePaste(); }}>
      <ShaderChatIcon name="code" /> {applying ? 'Applicazione…' : 'Incolla codice'}
    </button>
    {showInput ? <form ref={formRef} id={`${id}-input`} className="shader-chat-paste-form" onSubmit={event => {
      event.preventDefault();
      if (!code.trim() || applyingRef.current) return;
      applyingRef.current = true;
      setApplying(true);
      setError('');
      void onApplyCode(code.trim()).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Impossibile applicare il codice. Controlla la risposta e riprova.');
      }).finally(() => {
        applyingRef.current = false;
        setApplying(false);
      });
    }}>
      <label htmlFor={`${id}-code`}>Incolla codice</label>
      <textarea ref={inputRef} id={`${id}-code`} value={code} onChange={event => setCode(event.target.value)}
        spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={7}
        placeholder="Incolla qui il codice GLSL ricevuto…" disabled={applying}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      {error ? <p id={`${id}-error`} className="shader-chat-copy-error" role="alert">{error}</p> : null}
      <div className="shader-chat-paste-actions">
        <button type="button" disabled={applying} onClick={() => {
          setShowInput(false);
          pasteButtonRef.current?.focus({ preventScroll: true });
        }}>Annulla</button>
        <button type="submit" disabled={!code.trim() || applying}>{applying ? 'Applicazione…' : 'Applica codice'}</button>
      </div>
    </form> : null}
  </article>;
}
