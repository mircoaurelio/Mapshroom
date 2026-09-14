const pendingPrograms = new WeakMap<object, Map<string, Promise<unknown>>>();

/** Variants sharing code must not compile duplicate programs concurrently. */
export function deduplicatePreviewCompile<T>(owner: object, code: string, compile: () => Promise<T>): Promise<T> {
  let pending = pendingPrograms.get(owner);
  if (!pending) { pending = new Map(); pendingPrograms.set(owner, pending); }
  const existing = pending.get(code);
  if (existing) return existing as Promise<T>;
  const promise = compile().finally(() => pending.delete(code));
  pending.set(code, promise);
  return promise;
}

/** Yield before driver status reads; poll non-blockingly when supported. */
export async function waitForPreviewProgram(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const extension = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
  const deadline = performance.now() + 20_000;
  do {
    await new Promise<void>(resolve => window.setTimeout(resolve, 16));
    if (gl.isContextLost() || performance.now() > deadline) return false;
  } while (extension && !gl.getProgramParameter(program, extension.COMPLETION_STATUS_KHR));
  return Boolean(gl.getProgramParameter(program, gl.LINK_STATUS));
}
