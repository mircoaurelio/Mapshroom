import { useRef, useState } from 'react';

export function EditableAssetName({ name, label = 'photo', onSave, initiallyEditing = false }: {
  name: string;
  label?: string;
  onSave: (name: string) => void;
  initiallyEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initiallyEditing);
  const [draft, setDraft] = useState(name);
  const cancelled = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = () => requestAnimationFrame(() => triggerRef.current?.focus());
  const commit = () => {
    if (cancelled.current) return;
    const nextName = draft.trim();
    setEditing(false);
    if (nextName && nextName !== name) onSave(nextName);
  };
  return <span className={`ml-editable-name${editing ? ' is-editing' : ''}`}>
    {editing ? <input
      autoFocus
      aria-label={`${label === 'photo' ? 'Photo' : 'Asset'} name`}
      value={draft}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); restoreFocus(); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelled.current = true; setEditing(false); restoreFocus(); }
      }}
    /> : <button ref={triggerRef} type="button" aria-label={`Rename ${label}: ${name}`} title="Click to rename" onClick={() => { setDraft(name); cancelled.current = false; setEditing(true); }}>
      <span>{name}</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m12.5 3.5 4 4M3 17l4.5-1 10-10a1.4 1.4 0 0 0 0-2l-1.5-1.5a1.4 1.4 0 0 0-2 0l-10 10L3 17Z" /></svg>
    </button>}
  </span>;
}
