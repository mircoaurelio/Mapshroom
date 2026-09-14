interface ThumbnailJob {
  subscribers: Map<AbortSignal, (value: string | null) => void>;
  render: (active: () => boolean) => Promise<string | null>;
}

/** One render at a time, shared by consumers; invisible queued jobs are skipped. */
export class ThumbnailQueue {
  private jobs = new Map<string, ThumbnailJob>();
  private running = false;
  private yieldWork: () => Promise<void>;
  private onIdle: () => void;
  constructor(yieldWork: () => Promise<void>, onIdle: () => void = () => {}) {
    this.yieldWork = yieldWork;
    this.onIdle = onIdle;
  }

  request(key: string, signal: AbortSignal, render: ThumbnailJob['render']): Promise<string | null> {
    if (signal.aborted) return Promise.resolve(null);
    let job = this.jobs.get(key);
    if (!job) { job = { subscribers: new Map(), render }; this.jobs.set(key, job); }
    const current = job;
    return new Promise(resolve => {
      const finish = (value: string | null) => {
        signal.removeEventListener('abort', abort);
        current.subscribers.delete(signal);
        resolve(value);
      };
      const abort = () => finish(null);
      current.subscribers.set(signal, finish);
      signal.addEventListener('abort', abort, { once: true });
      void this.drain();
    });
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      for (const [key, job] of this.jobs) {
        let result: string | null = null;
        try {
          await this.yieldWork();
          if (job.subscribers.size) result = await job.render(() => job.subscribers.size > 0);
        } catch { /* Return null so the card can show that its preview is unavailable. */ }
        this.jobs.delete(key);
        for (const finish of [...job.subscribers.values()]) finish(result);
      }
    } finally { this.running = false; this.onIdle(); }
  }
}
