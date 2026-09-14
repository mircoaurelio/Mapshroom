import type { ShaderUniformValue, ShaderUniformValueMap } from '../types';

export type LiveUniformBindings = Record<string, { shaderId: string; name: string }>;

/** Small live edits shared by the controls and WebGL, outside the project render/save cycle. */
export function createUniformRuntime() {
  const values = new Map<string, ShaderUniformValueMap>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    get: (shaderId: string) => values.get(shaderId),
    entries: () => values.entries(),
    set(shaderId: string, name: string, value: ShaderUniformValue) {
      if (Object.is(values.get(shaderId)?.[name], value)) return;
      values.set(shaderId, { ...values.get(shaderId), [name]: value });
      notify();
    },
    clear(shaderId: string) {
      if (values.delete(shaderId)) notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type UniformRuntime = ReturnType<typeof createUniformRuntime>;

export function createLiveUniformBindings(shaderId: string, values: ShaderUniformValueMap): LiveUniformBindings {
  return Object.fromEntries(Object.keys(values).map(name => [name, { shaderId, name }]));
}

export function prefixLiveUniformBindings({ bindings, namespace }: {
  bindings: LiveUniformBindings;
  namespace: string;
}): LiveUniformBindings {
  return Object.fromEntries(Object.entries(bindings).map(([name, binding]) => [`${namespace}_${name}`, binding]));
}

export function resolveLiveUniformValue(runtime: UniformRuntime | undefined, binding: LiveUniformBindings[string] | undefined,
  fallback: ShaderUniformValue | undefined): ShaderUniformValue | undefined {
  return binding ? runtime?.get(binding.shaderId)?.[binding.name] ?? fallback : fallback;
}
