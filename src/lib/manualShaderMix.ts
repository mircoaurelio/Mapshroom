import type { TimelineTransitionEffect } from '../types.ts';

export interface ManualShaderMix<T> {
  from: T;
  to: T;
  targetKey: string;
  effect: TimelineTransitionEffect;
  durationSeconds: number;
  startedAtMs: number | null;
  progress: number;
}

export interface ManualShaderMixState<T> {
  selectionKey: string | null;
  layer: T;
  mix: ManualShaderMix<T> | null;
}

/** Keep the outgoing frame visible until the mix program and media are ready.
 * Rapid selections retain only the latest destination, finishing the active
 * fade first so shaders never accumulate inside nested manual transitions.
 */
export function advanceManualShaderMix<T>(
  previous: ManualShaderMixState<T> | null,
  request: {
    selectionKey: string | null;
    layer: T;
    effect: TimelineTransitionEffect;
    durationSeconds: number;
    nowMs: number;
    isReady: (mix: ManualShaderMix<T>) => boolean;
  },
): ManualShaderMixState<T> {
  const { selectionKey, layer, effect, nowMs, isReady } = request;
  const durationSeconds = Number.isFinite(request.durationSeconds)
    ? Math.max(0, Math.min(600, request.durationSeconds))
    : 0;
  const settled = { selectionKey, layer, mix: null };
  if (!previous || selectionKey === null || durationSeconds === 0) return settled;

  let mix = previous.mix;
  let from = previous.layer;
  let fromKey = previous.selectionKey;
  // A destination that is still loading has not appeared yet: a new click can
  // replace it immediately, including when that destination failed to compile.
  if (mix?.startedAtMs === null && mix.targetKey !== selectionKey) mix = null;
  if (mix) {
    // Uniform edits may update the destination without restarting its fade.
    if (mix.targetKey === selectionKey) mix = { ...mix, to: layer };
    const startedAtMs = mix.startedAtMs ?? (isReady(mix) ? nowMs : null);
    const progress = startedAtMs === null
      ? 0
      : Math.max(0, Math.min(1, (nowMs - startedAtMs) / (mix.durationSeconds * 1000)));
    if (progress < 1) {
      return { selectionKey: mix.targetKey, layer: mix.from, mix: { ...mix, startedAtMs, progress } };
    }
    from = mix.to;
    fromKey = mix.targetKey;
  }

  if (fromKey === selectionKey) return settled;
  mix = { from, to: layer, targetKey: selectionKey, effect, durationSeconds, startedAtMs: null, progress: 0 };
  if (isReady(mix)) mix.startedAtMs = nowMs;
  return { selectionKey, layer: from, mix };
}
