import { BROADCAST_PREFIX, PROJECT_STORAGE_PREFIX } from '../config';
import { restoreTransport, snapshotTransport } from './clock';
import type { ProjectDocument } from '../types';

function getProjectStorageKey(sessionId: string): string {
  return `${PROJECT_STORAGE_PREFIX}${sessionId}`;
}

export function createSessionSync(
  sessionId: string,
  onProjectUpdate: (project: ProjectDocument) => void,
) {
  const channelName = `${BROADCAST_PREFIX}${sessionId}`;
  const broadcastChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;

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

  const handleMessage = (event: MessageEvent<ProjectDocument>) => {
    if (!event.data) {
      return;
    }
    onProjectUpdate({
      ...event.data,
      playback: {
        ...event.data.playback,
        transport: restoreTransport(event.data.playback.transport),
      },
    });
  };

  window.addEventListener('storage', handleStorage);
  broadcastChannel?.addEventListener('message', handleMessage);

  return {
    publish(project: ProjectDocument) {
      broadcastChannel?.postMessage({
        ...project,
        playback: {
          ...project.playback,
          transport: snapshotTransport(project.playback.transport),
        },
      });
    },
    destroy() {
      window.removeEventListener('storage', handleStorage);
      broadcastChannel?.removeEventListener('message', handleMessage);
      broadcastChannel?.close();
    },
  };
}
