import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { createTimelinePlaybackStore, getTimelineBorderStyle } from '../lib/timelinePlaybackIndicators';
import { TimelinePlaybackContext, useTimelinePlaybackStore } from '../lib/useTimelinePlaybackStore';

const subscribeIdle = () => () => {};

export function TimelinePlaybackProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createTimelinePlaybackStore);
  return <TimelinePlaybackContext.Provider value={store}>{children}</TimelinePlaybackContext.Provider>;
}

// Only the border subscribes to progress; thumbnails and the workspace do not
// re-render for each frame of the mix.
export function TimelinePlaybackBorder({ stepId, selected }: { stepId: string; selected: boolean }) {
  const store = useTimelinePlaybackStore();
  const progress = useSyncExternalStore(
    store?.subscribe ?? subscribeIdle,
    () => store?.getProgress(stepId) ?? null,
  );
  const amount = selected ? 1 : progress ?? 0;
  return (
    <span
      className="timeline-playback-border"
      data-progress={amount}
      data-visible={amount > 0}
      style={getTimelineBorderStyle(amount)}
      role={amount > 0 ? 'img' : undefined}
      aria-hidden={amount === 0 ? true : undefined}
      aria-label={amount === 0 ? undefined : selected ? 'Selected shader' : amount === 1 ? 'Shader on canvas' : 'Shader entering canvas'}
    />
  );
}
