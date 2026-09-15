import { useId, useRef, useState } from 'react';
import { clampDurationInput, parseDurationInput } from '../lib/durationInput';
import './DurationInput.css';

interface DurationInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  className?: string;
  onCommit: (value: number) => void;
}

export function DurationInput({ label, value, min, max, step = 0.5, className = '', onCommit }: DurationInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const cancelBlurRef = useRef(false);
  const apply = (text: string) => {
    const parsed = parseDurationInput(text);
    setDraft(null);
    if (parsed === null) return;
    const next = clampDurationInput(parsed, min, max);
    if (next !== value) onCommit(next);
  };
  const adjust = (direction: number) => {
    const current = draft === null ? value : parseDurationInput(draft) ?? value;
    const next = clampDurationInput(current + direction * step, min, max);
    setDraft(null);
    if (next !== value) onCommit(next);
  };
  const editingValue = draft === null ? value : parseDurationInput(draft) ?? value;

  return (
    <div className={`duration-input ${className}`} role="group" aria-label={label}>
      <label htmlFor={inputId}>{label}</label>
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={editingValue <= min} onPointerDown={(event) => event.preventDefault()}
        onClick={() => adjust(-1)}>−</button>
      <input id={inputId} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
        aria-label={`${label} in seconds`} aria-describedby={`${inputId}-help`}
        value={draft ?? String(value)}
        onFocus={(event) => { setDraft(String(value)); event.currentTarget.select(); }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (cancelBlurRef.current) { cancelBlurRef.current = false; return; }
          apply(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelBlurRef.current = true;
            setDraft(null);
            event.currentTarget.blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const current = parseDurationInput(event.currentTarget.value) ?? value;
            setDraft(String(clampDurationInput(current + (event.key === 'ArrowUp' ? step : -step), min, max)));
          }
        }} />
      <span className="duration-input-unit" aria-hidden="true">s</span>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`}
        disabled={editingValue >= max} onPointerDown={(event) => event.preventDefault()}
        onClick={() => adjust(1)}>+</button>
      <span id={`${inputId}-help`} className="duration-input-help">
        Enter or leave the field to apply. Escape to cancel. Range {min} to {max} seconds.
      </span>
    </div>
  );
}
