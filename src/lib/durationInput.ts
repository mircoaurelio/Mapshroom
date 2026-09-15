export function parseDurationInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function clampDurationInput(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

/** Keep sub-notch movement, but discard it when the user reverses direction. */
export function accumulateDurationMotion(remainder: number, delta: number, pixelsPerStep: number) {
  const distance = (remainder * delta < 0 ? 0 : remainder) + delta;
  const steps = Math.trunc(distance / pixelsPerStep);
  return { steps, remainder: distance - steps * pixelsPerStep };
}
