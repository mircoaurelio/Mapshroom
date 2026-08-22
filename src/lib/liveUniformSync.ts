import type { ShaderUniformValue } from '../types';
import { isTauri, listenDesktop } from './desktop/index.ts';

const LIVE_UNIFORM_CHANNEL_PREFIX = 'mapshroom-v3:live-uniforms:';

export interface LiveUniformUpdate {
  sessionId: string;
  shaderId: string;
  name: string;
  value: ShaderUniformValue;
  sequence: number;
}

function getDesktopUniformEvent(sessionId: string): string {
  return `uniforms://sync/${sessionId}`;
}

export function createLiveUniformSync(
  sessionId: string,
  onUpdate?: (updates: LiveUniformUpdate[]) => void,
) {
  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(`${LIVE_UNIFORM_CHANNEL_PREFIX}${sessionId}`)
      : null;
  const pendingUpdates = new Map<string, LiveUniformUpdate>();
  let sequence = 0;
  let frameId: number | null = null;
  let unlistenDesktop: (() => void) | null = null;

  const flush = () => {
    frameId = null;
    if (!onUpdate || pendingUpdates.size === 0) {
      pendingUpdates.clear();
      return;
    }
    const updates = Array.from(pendingUpdates.values());
    pendingUpdates.clear();
    onUpdate(updates);
  };

  const queueUpdate = (update: LiveUniformUpdate) => {
    if (
      !update ||
      update.sessionId !== sessionId ||
      typeof update.shaderId !== 'string' ||
      typeof update.name !== 'string'
    ) {
      return;
    }
    const key = `${update.shaderId}\u0000${update.name}`;
    const previous = pendingUpdates.get(key);
    if (!previous || update.sequence >= previous.sequence) {
      pendingUpdates.set(key, update);
    }
    if (frameId === null) {
      frameId = window.requestAnimationFrame(flush);
    }
  };

  if (channel && onUpdate) {
    channel.onmessage = (event: MessageEvent<LiveUniformUpdate>) => {
      queueUpdate(event.data);
    };
  }

  if (isTauri() && onUpdate) {
    void listenDesktop<LiveUniformUpdate>(getDesktopUniformEvent(sessionId), (payload) => {
      queueUpdate(payload);
    }).then((unlisten) => {
      unlistenDesktop = unlisten;
    });
  }

  return {
    publish(shaderId: string, name: string, value: ShaderUniformValue) {
      sequence += 1;
      const update = {
        sessionId,
        shaderId,
        name,
        value,
        sequence,
      } satisfies LiveUniformUpdate;
      channel?.postMessage(update);
      if (isTauri()) {
        void import('@tauri-apps/api/event').then(({ emit }) => {
          void emit(getDesktopUniformEvent(sessionId), update);
        });
      }
    },
    destroy() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      pendingUpdates.clear();
      if (channel) {
        channel.onmessage = null;
        channel.close();
      }
      unlistenDesktop?.();
      unlistenDesktop = null;
    },
  };
}
