import { useCallback, useSyncExternalStore } from 'react';
import type { ShaderUniformValueMap } from '../types';
import type { UniformRuntime } from '../lib/uniformRuntime';

const noSubscription = () => () => {};

export function useLiveUniformValues(runtime: UniformRuntime | undefined, shaderId: string | undefined,
  savedValues: ShaderUniformValueMap): ShaderUniformValueMap {
  const getSnapshot = useCallback(() => shaderId ? runtime?.get(shaderId) : undefined, [runtime, shaderId]);
  const liveValues = useSyncExternalStore(runtime?.subscribe ?? noSubscription, getSnapshot, getSnapshot);
  return liveValues ? { ...savedValues, ...liveValues } : savedValues;
}
