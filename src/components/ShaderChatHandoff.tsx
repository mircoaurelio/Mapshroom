import { useId, useRef, useState } from 'react';
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
  const id = useId();

  return <article className="shader-chat-assistant shader-chat-handoff">
    <p>{blocked
      ? `Il browser ha bloccato l’apertura di ${provider}. Puoi riprovare qui sotto.`
      : `Continua su ${provider}, poi torna qui e incolla il codice della risposta.`}</p>
    {blocked ? <button type="button" className="shader-chat-handoff-button" onClick={onOpenChat}>Apri {provider}</button> : null}
    <button type="button" className="shader-chat-handoff-button" aria-expanded={showInput} aria-controls={`${id}-input`} disabled={applying}
      onClick={() => { setShowInput(current => !current); setError(''); }}>
      <ShaderChatIcon name="code" /> Incolla codice
    </button>
    {showInput ? <form id={`${id}-input`} className="shader-chat-paste-form" onSubmit={event => {
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
      <textarea id={`${id}-code`} value={code} onChange={event => setCode(event.target.value)}
        autoFocus spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={7}
        placeholder="Incolla qui il codice GLSL ricevuto…" disabled={applying}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      {error ? <p id={`${id}-error`} className="shader-chat-copy-error" role="alert">{error}</p> : null}
      <div className="shader-chat-paste-actions">
        <button type="button" disabled={applying} onClick={() => setShowInput(false)}>Annulla</button>
        <button type="submit" disabled={!code.trim() || applying}>{applying ? 'Applicazione…' : 'Applica codice'}</button>
      </div>
    </form> : null}
  </article>;
}
