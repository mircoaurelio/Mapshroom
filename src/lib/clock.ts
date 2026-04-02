import type { PlaybackTransport } from '../types';

export function getTransportTimeSeconds(
  transport: PlaybackTransport,
  nowMs = performance.now(),
): number {
  if (!transport.isPlaying || transport.anchorTimestampMs === null) {
    return transport.currentTimeSeconds;
  }

  const elapsedSeconds = ((nowMs - transport.anchorTimestampMs) / 1000) * transport.playbackRate;
  return Math.max(0, transport.currentTimeSeconds + elapsedSeconds);
}

export function playTransport(
  transport: PlaybackTransport,
  nowMs = performance.now(),
): PlaybackTransport {
  if (transport.isPlaying) {
    return transport;
  }

  return {
    ...transport,
    isPlaying: true,
    anchorTimestampMs: nowMs,
  };
}

export function pauseTransport(
  transport: PlaybackTransport,
  nowMs = performance.now(),
): PlaybackTransport {
  if (!transport.isPlaying) {
    return transport;
  }

  return {
    ...transport,
    isPlaying: false,
    currentTimeSeconds: getTransportTimeSeconds(transport, nowMs),
    anchorTimestampMs: null,
  };
}

export function seekTransport(
  transport: PlaybackTransport,
  nextTimeSeconds: number,
  nowMs = performance.now(),
): PlaybackTransport {
  return {
    ...transport,
    currentTimeSeconds: Math.max(0, nextTimeSeconds),
    anchorTimestampMs: transport.isPlaying ? nowMs : null,
  };
}

export function resetTransport(
  transport: PlaybackTransport,
  nowMs = performance.now(),
): PlaybackTransport {
  return {
    ...transport,
    currentTimeSeconds: 0,
    anchorTimestampMs: transport.isPlaying ? nowMs : null,
  };
}
