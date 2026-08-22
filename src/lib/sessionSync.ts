import { BROADCAST_PREFIX, PROJECT_STORAGE_PREFIX } from '../config';
import { restoreTransport } from './clock';
import { isTauri, listenDesktop } from './desktop/index.ts';
import { createProjectSnapshot } from './storage';
import type { ProjectDocument } from '../types';

function getProjectStorageKey(sessionId: string): string {
  return `${PROJECT_STORAGE_PREFIX}${sessionId}`;
}

function getDesktopProjectEvent(sessionId: string): string {
  return `project://sync/${sessionId}`;
}

export function createSessionSync(
  sessionId: string,
  onProjectUpdate: (project: ProjectDocument) => void,
) {
  const channelName = `${BROADCAST_PREFIX}${sessionId}`;
  const broadcastChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;
  const shouldUseStorageFallback = broadcastChannel === null;
  let unlistenDesktop: (() => void) | null = null;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== getProjectStorageKey(sessionId) || !event.newValue) {
      return;
    }

    try {
      const nextProject = JSON.parse(event.newValue) as ProjectDocument;
      onProjectUpdate({
        ...nextProject,
        playback: {
          ...nextProject.playback,
          transport: restoreTransport(nextProject.playback.transport),
        },
      });
    } catch (error) {
      console.warn('Unable to parse synced project payload.', error);
    }
  };

  const applyProject = (nextProject: ProjectDocument) => {
    onProjectUpdate({
      ...nextProject,
      playback: {
        ...nextProject.playback,
        transport: restoreTransport(nextProject.playback.transport),
      },
    });
  };

  const handleMessage = (event: MessageEvent<ProjectDocument>) => {
    if (!event.data) {
      return;
    }
    applyProject(event.data);
  };

  if (shouldUseStorageFallback) {
    window.addEventListener('storage', handleStorage);
  }
  broadcastChannel?.addEventListener('message', handleMessage);

  if (isTauri()) {
    void listenDesktop<ProjectDocument>(getDesktopProjectEvent(sessionId), (payload) => {
      if (payload) {
        applyProject(payload);
      }
    }).then((unlisten) => {
      unlistenDesktop = unlisten;
    });
  }

  return {
    publish(project: ProjectDocument) {
      const liveShaderIds = new Set([
        project.studio.activeShaderId,
        ...project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
      ]);
      const snapshot = createProjectSnapshot(project, liveShaderIds);
      broadcastChannel?.postMessage(snapshot);
      if (isTauri()) {
        void import('@tauri-apps/api/event').then(({ emit }) => {
          void emit(getDesktopProjectEvent(sessionId), snapshot);
        });
      }
    },
    destroy() {
      if (shouldUseStorageFallback) {
        window.removeEventListener('storage', handleStorage);
      }
      broadcastChannel?.removeEventListener('message', handleMessage);
      broadcastChannel?.close();
      unlistenDesktop?.();
      unlistenDesktop = null;
    },
  };
}
