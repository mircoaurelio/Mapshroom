import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlaybackTransport } from '../src/types.ts';
import { shouldForceVideoTransportSeek } from '../src/lib/videoTransport.ts';

function transport(patch: Partial<PlaybackTransport> = {}): PlaybackTransport {
  return {
    isPlaying: true,
    currentTimeSeconds: 4,
    renderTimeOffsetSeconds: 0,
    anchorTimestampMs: 5_000,
    playbackRate: 1,
    loop: true,
    externalClockEnabled: false,
    ...patch,
  };
}

test('does not seek when a live output snapshot only refreshes the clock anchor', () => {
  const previous = transport();
  const refreshed = transport({ currentTimeSeconds: 8.99, anchorTimestampMs: 9_990 });

  assert.equal(shouldForceVideoTransportSeek(previous, refreshed, 10_000), false);
});

test('seeks after an explicit transport jump', () => {
  const previous = transport();
  const seeked = transport({ currentTimeSeconds: 2, anchorTimestampMs: 10_000 });

  assert.equal(shouldForceVideoTransportSeek(previous, seeked, 10_000), true);
});

test('seeks when a paused transport is scrubbed', () => {
  const previous = transport({ isPlaying: false, currentTimeSeconds: 4, anchorTimestampMs: null });
  const seeked = transport({ isPlaying: false, currentTimeSeconds: 4.5, anchorTimestampMs: null });

  assert.equal(shouldForceVideoTransportSeek(previous, seeked, 10_000), true);
});

test('does not seek for a continuous play-to-pause handoff', () => {
  const previous = transport();
  const paused = transport({ isPlaying: false, currentTimeSeconds: 9, anchorTimestampMs: null });

  assert.equal(shouldForceVideoTransportSeek(previous, paused, 10_000), false);
});
