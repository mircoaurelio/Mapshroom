export type ProjectSaveStatus = 'saving' | 'saved' | 'error';

/** Coalesces edits without starving saves during a drag; retains failed work. */
export function createProjectAutosave<T extends { sessionId: string }>(options: {
  save: (project: T) => Promise<boolean>;
  onStatus?: (sessionId: string, status: ProjectSaveStatus) => void;
  onSaved?: (project: T) => void;
  delayMs?: number;
  maxWaitMs?: number;
  retryMs?: number;
}) {
  const pending = new Map<string, T>();
  let writing: T | null = null;
  let flight: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  function clearTimers() {
    clearTimeout(timer);
    clearTimeout(deadline);
    timer = undefined;
    deadline = undefined;
  }

  function flush(): Promise<boolean> {
    clearTimers();
    if (flight) return flight;
    flight = (async () => {
      while (pending.size) {
        const [id, value] = pending.entries().next().value!;
        pending.delete(id);
        writing = value;
        let saved = false;
        try { saved = await options.save(value); } catch { /* retry below */ }
        writing = null;
        if (!saved) {
          if (!pending.has(id)) pending.set(id, value);
          options.onStatus?.(id, 'error');
          return false;
        }
        options.onSaved?.(value);
        if (!pending.has(id)) options.onStatus?.(id, 'saved');
      }
      return true;
    })().finally(() => {
      flight = null;
      if (pending.size && !stopped) {
        timer = setTimeout(() => void flush(), options.retryMs ?? 2000);
      }
    });
    return flight;
  }

  return {
    schedule(project: T) {
      pending.set(project.sessionId, project);
      options.onStatus?.(project.sessionId, 'saving');
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), options.delayMs ?? 350);
      deadline ??= setTimeout(() => void flush(), options.maxWaitMs ?? 1500);
    },
    hasPending(sessionId?: string) {
      return sessionId
        ? pending.has(sessionId) || writing?.sessionId === sessionId
        : pending.size > 0 || writing !== null;
    },
    flush,
    start() { stopped = false; },
    stop() { stopped = true; clearTimers(); },
  };
}
