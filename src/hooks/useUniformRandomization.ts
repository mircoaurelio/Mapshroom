import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ShaderUniformDefinition,
  ShaderUniformMap,
  ShaderUniformValue,
} from '../types';

const STORAGE_KEY = 'mapshroom-v3:uniform-randomization-locks';

type UniformRandomizationLockMap = Record<string, string[]>;

function loadLockMap(): UniformRandomizationLockMap {
  if (typeof window === 'undefined') {
    return {};
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
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

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lockMap));
}

function getRandomValue(definition: ShaderUniformDefinition): number {
  if (definition.type === 'int') {
    const min = Math.ceil(definition.min);
    const max = Math.floor(definition.max);
    return min >= max ? min : min + Math.floor(Math.random() * (max - min + 1));
  }

  const range = definition.max - definition.min;
  if (!Number.isFinite(range) || range <= 0) {
    return definition.min;
  }

  const stepIndex = Math.floor(Math.random() * 101);
  return Number((definition.min + (range * stepIndex) / 100).toPrecision(12));
}

interface UseUniformRandomizationOptions {
  randomizationKey: string;
  uniformDefinitions: ShaderUniformMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
}

export function useUniformRandomization({
  randomizationKey,
  uniformDefinitions,
  onUniformChange,
}: UseUniformRandomizationOptions) {
  const [lockedUniforms, setLockedUniforms] = useState<Set<string>>(() =>
    loadLockedUniforms(randomizationKey),
  );

  useEffect(() => {
    setLockedUniforms(loadLockedUniforms(randomizationKey));
  }, [randomizationKey]);

  const numericUniforms = useMemo(
    () =>
      Object.entries(uniformDefinitions).filter(
        ([, definition]) => definition.type === 'float' || definition.type === 'int',
      ),
    [uniformDefinitions],
  );

  const randomizableCount = numericUniforms.reduce(
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
    numericUniforms.forEach(([name, definition]) => {
      if (!lockedUniforms.has(name)) {
        onUniformChange(name, getRandomValue(definition));
      }
    });
  }, [lockedUniforms, numericUniforms, onUniformChange]);

  return {
    isUniformLocked: (name: string) => lockedUniforms.has(name),
    randomizableCount,
    randomizeUniforms,
    toggleUniformLock,
  };
}
