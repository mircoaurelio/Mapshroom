import { createContext, useContext } from 'react';
import type { createTimelinePlaybackStore } from './timelinePlaybackIndicators';

export const TimelinePlaybackContext = createContext<ReturnType<typeof createTimelinePlaybackStore> | null>(null);

export function useTimelinePlaybackStore() {
  return useContext(TimelinePlaybackContext);
}
