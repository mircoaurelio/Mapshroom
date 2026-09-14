import type { ComponentProps, CSSProperties } from 'react';

type RangeInputProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'defaultValue'> & {
  value: number;
};

/** Native dragging and keyboard controls, with a fill that follows controlled values. */
export function RangeInput({ value, min = 0, max = 100, style, ...props }: RangeInputProps) {
  const span = Number(max) - Number(min);
  const ratio = span > 0 ? Math.max(0, Math.min(1, (value - Number(min)) / span)) : 0;
  const rangeStyle = {
    ...style,
    '--range-fill-position': `calc(${ratio * 100}% + ${4 - ratio * 8}px)`,
  } as CSSProperties;

  return <input {...props} type="range" min={min} max={max} value={value} style={rangeStyle} />;
}
