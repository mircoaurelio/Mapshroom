export type AudioRangeBound = 'min' | 'max';

/** Outside clicks expand that side; inside clicks move the nearest endpoint. */
export function audioRangeBoundAtValue(value: number, min: number, max: number): AudioRangeBound {
  if (value < min) return 'min';
  if (value > max || min === max) return 'max';
  return value - min <= max - value ? 'min' : 'max';
}

/** Keep the grabbed endpoint, even after the pointer crosses the other endpoint. */
export function clampAudioRangeBound(
  bound: AudioRangeBound, value: number, min: number, max: number,
  domainMin: number, domainMax: number,
): number {
  return bound === 'min'
    ? Math.max(domainMin, Math.min(max, value))
    : Math.min(domainMax, Math.max(min, value));
}
