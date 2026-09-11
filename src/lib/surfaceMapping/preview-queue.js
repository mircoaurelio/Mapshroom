// Keep one render in flight and only the newest pending value. Slider movement must
// not leave a queue of obsolete frames delaying the final selected dropdown value.
export function createPreviewQueue(send, accept) {
  let latest = 0, active = null, pending = null, disposed = false;
  function dispatch() {
    if (disposed || active || !pending) return;
    active = pending; pending = null; send(active);
  }
  return {
    request(options) {
      if (disposed) return;
      pending = { ...options, requestId: ++latest }; dispatch();
    },
    complete(message) {
      if (disposed || message.requestId !== active?.requestId) return;
      active = null;
      if (message.requestId === latest) accept(message);
      dispatch();
    },
    dispose() { disposed = true; active = pending = null; },
  };
}
