import { useState, type ComponentProps, type CSSProperties } from 'react';

type RangeInputProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'defaultValue'> & {
  value: number;
};

/** Native dragging and keyboard controls, with a fill that follows controlled values. */
export function RangeInput({ value, min = 0, max = 100, style, onChange, ...props }: RangeInputProps) {
  // Keep native input immediate even when the parent batches expensive updates.
  const [draft, setDraft] = useState({ source: value, value });
  const displayedValue = draft.source === value ? draft.value : value;
  if (draft.source !== value) {
    setDraft({ source: value, value });
  }
  const span = Number(max) - Number(min);
  const ratio = span > 0 ? Math.max(0, Math.min(1, (displayedValue - Number(min)) / span)) : 0;
  const rangeStyle = {
    ...style,
    '--range-fill-position': `calc(${ratio * 100}% + ${4 - ratio * 8}px)`,
  } as CSSProperties;

  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      value={displayedValue}
      style={rangeStyle}
      onChange={(event) => {
        setDraft({ source: value, value: Number(event.currentTarget.value) });
        onChange?.(event);
      }}
    />
  );
}
