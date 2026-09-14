import { useCallback, useEffect, useMemo, useState } from 'react';
import { randomizeUniformValues } from '../lib/uniformRandomization';
import type {
  ShaderUniformMap,
  ShaderUniformValue,
} from '../types';

const STORAGE_KEY = 'mapshroom-v3:uniform-randomization-locks';

type UniformRandomizationLockMap = Record<string, string[]>;

function loadLockMap(): UniformRandomizationLockMap {
  if (typeof window === 'undefined') {
    return {};
  }

  let storedValue: string | null = null;
  try {
    storedValue = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every((name) => typeof name === 'string'),
      ),
    );
  } catch {
    return {};
  }
}

function loadLockedUniforms(randomizationKey: string): Set<string> {
  return new Set(loadLockMap()[randomizationKey] ?? []);
}

function saveLockedUniforms(randomizationKey: string, lockedUniforms: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const lockMap = loadLockMap();
  const nextLockedUniforms = [...lockedUniforms].sort();

  if (nextLockedUniforms.length > 0) {
    lockMap[randomizationKey] = nextLockedUniforms;
  } else {
    delete lockMap[randomizationKey];
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lockMap));
  } catch (error) {
    // Locks are a convenience. A full localStorage must never crash the workspace.
    console.warn('Unable to persist uniform randomization locks.', error);
  }
}

interface UseUniformRandomizationOptions {
  randomizationKey: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: Record<string, ShaderUniformValue>;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onUniformValuesChange?: (values: Record<string, ShaderUniformValue>) => void;
}

export function useUniformRandomization({
  randomizationKey,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  onUniformValuesChange,
}: UseUniformRandomizationOptions) {
  const [lockedUniforms, setLockedUniforms] = useState<Set<string>>(() =>
    loadLockedUniforms(randomizationKey),
  );

  useEffect(() => {
    setLockedUniforms(loadLockedUniforms(randomizationKey));
  }, [randomizationKey]);

  const randomizableUniforms = useMemo(
    () =>
      Object.entries(uniformDefinitions).filter(
        ([, definition]) => definition.type === 'float' || definition.type === 'int' || definition.type === 'vec3',
      ),
    [uniformDefinitions],
  );

  const randomizableCount = randomizableUniforms.reduce(
    (count, [name]) => count + (lockedUniforms.has(name) ? 0 : 1),
    0,
  );

  const toggleUniformLock = useCallback(
    (name: string) => {
      setLockedUniforms((currentLockedUniforms) => {
        const nextLockedUniforms = new Set(currentLockedUniforms);
        if (nextLockedUniforms.has(name)) {
          nextLockedUniforms.delete(name);
        } else {
          nextLockedUniforms.add(name);
        }

        saveLockedUniforms(randomizationKey, nextLockedUniforms);
        return nextLockedUniforms;
      });
    },
    [randomizationKey],
  );

  const randomizeUniforms = useCallback(() => {
    const changes = randomizeUniformValues(uniformDefinitions, lockedUniforms);
    const randomizedValues: Record<string, ShaderUniformValue> = {
      ...uniformValues,
      ...changes,
    };
    const changedEntries = Object.entries(changes);

    if (changedEntries.length === 0) {
      return;
    }

    if (onUniformValuesChange) {
      onUniformValuesChange(randomizedValues);
      return;
    }

    changedEntries.forEach(([name, value]) => onUniformChange(name, value));
  }, [
    lockedUniforms,
    uniformDefinitions,
    onUniformChange,
    onUniformValuesChange,
    uniformValues,
  ]);

  return {
    isUniformLocked: (name: string) => lockedUniforms.has(name),
    randomizableCount,
    randomizeUniforms,
    toggleUniformLock,
  };
}
