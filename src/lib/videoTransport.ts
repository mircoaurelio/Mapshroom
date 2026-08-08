import type { PlaybackTransport } from '../types.ts';
import { getRenderTimeSeconds } from './clock.ts';

const VIDEO_TRANSPORT_DISCONTINUITY_SECONDS = 0.08;

/**
 * Detect a user-visible transport jump without treating a refreshed live-sync
 * anchor as a seek. Output windows receive fresh transport snapshots while a
 * video is playing; those snapshots should not restart the video decoder.
 */
export function shouldForceVideoTransportSeek(
  previous: PlaybackTransport,
  next: PlaybackTransport,
  nowMs = performance.now(),
): boolean {
  if (previous.loop !== next.loop || previous.externalClockEnabled !== next.externalClockEnabled) {
    return true;
  }

  const previousTime = getRenderTimeSeconds(previous, nowMs);
  const nextTime = getRenderTimeSeconds(next, nowMs);
  return Math.abs(nextTime - previousTime) > VIDEO_TRANSPORT_DISCONTINUITY_SECONDS;
}
