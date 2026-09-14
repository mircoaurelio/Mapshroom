import { useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent } from 'react';
import { rangeValueAtPosition } from '../lib/rangeHover';

type RangeInputProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'defaultValue'> & {
  value: number;
  onHoverValueChange?: (value: number | null) => void;
};

/** Native dragging and keyboard controls, with a fill that follows controlled values. */
export function RangeInput({ value, min = 0, max = 100, style, onChange, onHoverValueChange,
  onPointerEnter, onPointerMove, onPointerLeave, onPointerCancel, onKeyDown, ...props }: RangeInputProps) {
  const hoverDirection = useRef({ vertical: false, reversed: false });
  const clearHover = (input: HTMLInputElement) => {
    input.style.removeProperty('--range-hover-position');
    onHoverValueChange?.(null);
  };
  const updateHover = (event: PointerEvent<HTMLInputElement>) => {
    if (event.pointerType !== 'mouse' || event.currentTarget.disabled) return;
    const input = event.currentTarget;
    const rect = input.getBoundingClientRect();
    const { vertical, reversed } = hoverDirection.current;
    const position = vertical ? event.clientY - rect.top : event.clientX - rect.left;
    const length = vertical ? rect.height : rect.width;
    input.style.setProperty('--range-hover-position', `${Math.max(1, Math.min(length - 1, position))}px`);
    input.style.setProperty('--range-hover-angle', vertical ? '180deg' : '90deg');
    onHoverValueChange?.(rangeValueAtPosition(position, length, Number(min), Number(max),
      input.step === 'any' ? 'any' : Number(input.step) || 1, reversed));
  };
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
      onPointerEnter={(event) => {
        const computed = getComputedStyle(event.currentTarget);
        hoverDirection.current = { vertical: computed.writingMode.startsWith('vertical'), reversed: computed.direction === 'rtl' };
        updateHover(event);
        onPointerEnter?.(event);
      }}
      onPointerMove={(event) => { updateHover(event); onPointerMove?.(event); }}
      onPointerLeave={(event) => { clearHover(event.currentTarget); onPointerLeave?.(event); }}
      onPointerCancel={(event) => { clearHover(event.currentTarget); onPointerCancel?.(event); }}
      onKeyDown={(event) => { clearHover(event.currentTarget); onKeyDown?.(event); }}
      onChange={(event) => {
        setDraft({ source: value, value: Number(event.currentTarget.value) });
        onChange?.(event);
      }}
    />
  );
}
