import type {
  SavedShader,
  TimelineStub,
  TimelineSequenceMode,
  TimelineTransitionEffect,
} from '../types';

export const TIMELINE_SEQUENCE_MODE_OPTIONS: Array<{
  value: TimelineSequenceMode;
  label: string;
}> = [
  { value: 'sequence', label: 'Sequence' },
  { value: 'random', label: 'Random' },
  { value: 'randomMix', label: 'Random Mix' },
];

export const TIMELINE_TRANSITION_EFFECT_OPTIONS: Array<{
  value: TimelineTransitionEffect;
  label: string;
}> = [
  { value: 'cut', label: 'Cut' },
  { value: 'mix', label: 'Mix' },
  { value: 'wipe', label: 'Wipe' },
  { value: 'radial', label: 'Radial' },
  { value: 'glitch', label: 'Glitch' },
];

export function roundTimelineSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function clampTimelineStepDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return roundTimelineSeconds(Math.max(0.5, Math.min(600, value)));
}

export function clampTransitionDuration(
  durationSeconds: number,
  transitionDurationSeconds: number,
): number {
  if (!Number.isFinite(transitionDurationSeconds)) {
    return 0;
  }

  return roundTimelineSeconds(Math.max(0, Math.min(durationSeconds, transitionDurationSeconds)));
}

export function createTimelineShaderStep(shaderId: string): TimelineStub['shaderSequence']['steps'][number] {
  return {
    id: crypto.randomUUID(),
    shaderId,
    durationSeconds: 8,
    transitionDurationSeconds: 0.75,
    transitionEffect: 'mix',
  };
}

export function getShaderTimelineDuration(
  steps: TimelineStub['shaderSequence']['steps'],
): number {
  return steps.reduce((total, step) => total + clampTimelineStepDuration(step.durationSeconds), 0);
}

function hashTimelineSeed(seedSource: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seedSource.length; index += 1) {
    hash ^= seedSource.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let next = state;
    next ^= next >>> 15;
    next = Math.imul(next | 1, next);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTimelineCycleSteps({
  mode,
  steps,
  cycleIndex,
}: {
  mode: TimelineSequenceMode;
  steps: TimelineStub['shaderSequence']['steps'];
  cycleIndex: number;
}): TimelineStub['shaderSequence']['steps'] {
  if ((mode !== 'random' && mode !== 'randomMix') || steps.length <= 1) {
    return steps;
  }

  const nextSteps = [...steps];
  const seed = hashTimelineSeed(`${cycleIndex}:${steps.map((step) => step.id).join('|')}`);
  const random = createDeterministicRandom(seed);

  for (let index = nextSteps.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextSteps[index], nextSteps[swapIndex]] = [nextSteps[swapIndex], nextSteps[index]];
  }

  return nextSteps;
}

interface TimelineResolution {
  currentStep: TimelineStub['shaderSequence']['steps'][number];
  currentShader: SavedShader;
  nextStep: TimelineStub['shaderSequence']['steps'][number] | null;
  nextShader: SavedShader | null;
  stepStartSeconds: number;
  stepEndSeconds: number;
  localTimeSeconds: number;
  totalDurationSeconds: number;
  transitionProgress: number;
  transitionEffect: TimelineTransitionEffect;
  isTransitioning: boolean;
}

export function resolveShaderTimelineState({
  shaders,
  mode,
  sharedTransitionEffect,
  sharedTransitionDurationSeconds,
  steps,
  timeSeconds,
  loop,
}: {
  shaders: SavedShader[];
  mode: TimelineSequenceMode;
  sharedTransitionEffect: TimelineTransitionEffect;
  sharedTransitionDurationSeconds: number;
  steps: TimelineStub['shaderSequence']['steps'];
  timeSeconds: number;
  loop: boolean;
}): TimelineResolution | null {
  if (!steps.length || !shaders.length) {
    return null;
  }

  const shaderMap = new Map(shaders.map((shader) => [shader.id, shader]));
  const validSteps = steps.filter((step) => shaderMap.has(step.shaderId));
  if (!validSteps.length) {
    return null;
  }

  const totalDurationSeconds = getShaderTimelineDuration(validSteps);
  if (totalDurationSeconds <= 0) {
    return null;
  }

  const absoluteTimeSeconds = Math.max(0, timeSeconds);
  const cycleIndex = loop
    ? Math.floor(absoluteTimeSeconds / totalDurationSeconds)
    : 0;
  const cycleSteps = getTimelineCycleSteps({
    mode,
    steps: validSteps,
    cycleIndex,
  });
  let resolvedTime = loop
    ? absoluteTimeSeconds % totalDurationSeconds
    : Math.min(absoluteTimeSeconds, totalDurationSeconds);

  let cursor = 0;
  for (let index = 0; index < cycleSteps.length; index += 1) {
    const step = cycleSteps[index];
    const durationSeconds = clampTimelineStepDuration(step.durationSeconds);
    const nextCursor = cursor + durationSeconds;
    const isLastStep = index === cycleSteps.length - 1;
    const withinStep = resolvedTime < nextCursor || isLastStep;

    if (withinStep) {
      const currentShader = shaderMap.get(step.shaderId);
      if (!currentShader) {
        return null;
      }

      const nextStep = cycleSteps[index + 1] ?? (loop ? cycleSteps[0] : null);
      const nextShader = nextStep ? shaderMap.get(nextStep.shaderId) ?? null : null;
      const localTimeSeconds = Math.max(0, Math.min(durationSeconds, resolvedTime - cursor));
      const effectiveTransitionEffect =
        mode === 'randomMix' ? sharedTransitionEffect : step.transitionEffect;
      const transitionDurationSeconds = clampTransitionDuration(
        durationSeconds,
        mode === 'randomMix' ? sharedTransitionDurationSeconds : step.transitionDurationSeconds,
      );
      const transitionStartSeconds = Math.max(0, durationSeconds - transitionDurationSeconds);
      const isTransitioning =
        transitionDurationSeconds > 0 &&
        nextStep !== null &&
        nextShader !== null &&
        localTimeSeconds >= transitionStartSeconds;
      const transitionProgress = isTransitioning
        ? Math.max(
            0,
            Math.min(
              1,
              (localTimeSeconds - transitionStartSeconds) / Math.max(transitionDurationSeconds, 0.0001),
            ),
          )
        : 0;

      return {
        currentStep: step,
        currentShader,
        nextStep,
        nextShader,
        stepStartSeconds: cursor,
        stepEndSeconds: nextCursor,
        localTimeSeconds,
        totalDurationSeconds,
        transitionProgress,
        transitionEffect: effectiveTransitionEffect,
        isTransitioning,
      };
    }

    cursor = nextCursor;
  }

  return null;
}
