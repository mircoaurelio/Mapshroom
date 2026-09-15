export type TimelinePlaybackProgress = Readonly<Record<string, number>>;

// A step can be current in one Double layer and incoming in the other.
// Keep its strongest indication, independently of the order of those layers.
export function mergeTimelinePlaybackProgress(
  layers: readonly { playbackProgress?: TimelinePlaybackProgress }[],
): TimelinePlaybackProgress {
  const progress: Record<string, number> = {};
  for (const layer of layers) {
    for (const [stepId, value] of Object.entries(layer.playbackProgress ?? {})) {
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      progress[stepId] = Math.max(progress[stepId] ?? 0, clamped);
    }
  }
  return progress;
}

export function createTimelinePlaybackStore() {
  let progress: TimelinePlaybackProgress = {};
  const listeners = new Set<() => void>();
  return {
    getProgress: (stepId: string): number | null => progress[stepId] ?? null,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    publish(next: TimelinePlaybackProgress) {
      const ids = Object.keys(next);
      if (ids.length === Object.keys(progress).length && ids.every(id => next[id] === progress[id])) {
        return;
      }
      progress = next;
      listeners.forEach(listener => listener());
    },
  };
}

export function getTimelineBorderStyle(progress: number) {
  const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return {
    opacity: amount,
    background: `linear-gradient(135deg, rgb(${Math.round(249 - 10 * amount)}, ${Math.round(145 - 77 * amount)}, ${Math.round(42 + 26 * amount)}), rgb(239, 68, 68))`,
  };
}
