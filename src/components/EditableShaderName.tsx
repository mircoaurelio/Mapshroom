import { useState } from 'react';

interface EditableShaderNameProps {
  name: string;
  onChange: (name: string) => void;
}

export function EditableShaderName({ name, onChange }: EditableShaderNameProps) {
  const [draft, setDraft] = useState({ source: name, value: name });
  if (draft.source !== name) setDraft({ source: name, value: name });

  return (
    <input
      className="shader-name-input"
      aria-label="Shader name"
      title="Edit shader name · saves on Enter or when you leave the field"
      value={draft.source === name ? draft.value : name}
      onChange={(event) => setDraft({ source: name, value: event.target.value })}
      onBlur={(event) => {
        const nextName = event.currentTarget.value.replace(/\s+/g, ' ').trim() || name;
        setDraft({ source: name, value: nextName });
        if (nextName !== name) onChange(nextName);
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.value = name;
          setDraft({ source: name, value: name });
          event.currentTarget.blur();
        }
      }}
    />
  );
}
