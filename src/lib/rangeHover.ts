/** Match the native thumb's travel and step rounding without changing its value. */
export function rangeValueAtPosition(position: number, length: number, min: number, max: number,
  step: number | 'any' = 1, reversed = false): number {
  // Native range hit testing rounds pointer/track coordinates to CSS pixels.
  const ratio = Math.max(0, Math.min(1, (Math.round(position) - 4) / Math.max(1, Math.round(length) - 8)));
  const raw = min + (reversed ? 1 - ratio : ratio) * Math.max(0, max - min);
  const increment = step === 'any' ? 0 : step > 0 ? step : 1;
  const value = increment ? min + Math.round((raw - min) / increment) * increment : raw;
  const reachableMax = increment ? min + Math.floor((max - min) / increment + 1e-9) * increment : max;
  return Number(Math.max(min, Math.min(reachableMax, value)).toFixed(12));
}
