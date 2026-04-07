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
  { value: 'double', label: 'Double' },
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
    disabled: false,
    durationSeconds: 8,
    transitionDurationSeconds: 0.75,
    transitionEffect: 'mix',
  };
}

export function isTimelineStepEnabled(
  step: TimelineStub['shaderSequence']['steps'][number],
): boolean {
  return !step.disabled;
}

export function getShaderTimelineDuration(
  steps: TimelineStub['shaderSequence']['steps'],
): number {
  return steps.reduce(
    (total, step) =>
      isTimelineStepEnabled(step) ? total + clampTimelineStepDuration(step.durationSeconds) : total,
    0,
  );
}

export function scaleTimelineStepDurations(
  steps: TimelineStub['shaderSequence']['steps'],
  targetTotalSeconds: number,
): TimelineStub['shaderSequence']['steps'] {
  const enabledSteps = steps.filter(isTimelineStepEnabled);
  if (enabledSteps.length === 0) {
    return steps;
  }

  const minimumStepDurationSeconds = 0.5;
  const totalUnits = Math.max(
    enabledSteps.length * 50,
    Math.round(roundTimelineSeconds(targetTotalSeconds) * 100),
  );
  const clampedSourceDurations = enabledSteps.map((step) =>
    clampTimelineStepDuration(step.durationSeconds),
  );
  const totalSourceDuration = clampedSourceDurations.reduce(
    (sum, durationSeconds) => sum + durationSeconds,
    0,
  );

  if (totalSourceDuration <= 0) {
    return steps.map((step) =>
      !isTimelineStepEnabled(step)
        ? step
        : {
            ...step,
            durationSeconds: minimumStepDurationSeconds,
            transitionDurationSeconds: clampTransitionDuration(
              minimumStepDurationSeconds,
              step.transitionDurationSeconds,
            ),
          },
    );
  }

  const scaledDurations = new Array<number>(enabledSteps.length).fill(minimumStepDurationSeconds);
  let remainingTargetDuration = totalUnits / 100;
  let remainingSourceDuration = totalSourceDuration;
  let unresolvedIndices = enabledSteps.map((_, index) => index);

  while (unresolvedIndices.length > 0) {
    if (remainingSourceDuration <= 0) {
      const evenDuration = remainingTargetDuration / unresolvedIndices.length;
      unresolvedIndices.forEach((index) => {
        scaledDurations[index] = Math.max(minimumStepDurationSeconds, evenDuration);
      });
      break;
    }

    const scaleRatio = remainingTargetDuration / remainingSourceDuration;
    const belowMinimumIndices = unresolvedIndices.filter(
      (index) => clampedSourceDurations[index] * scaleRatio <= minimumStepDurationSeconds + 0.000001,
    );

    if (belowMinimumIndices.length === 0) {
      unresolvedIndices.forEach((index) => {
        scaledDurations[index] = clampedSourceDurations[index] * scaleRatio;
      });
      break;
    }

    belowMinimumIndices.forEach((index) => {
      scaledDurations[index] = minimumStepDurationSeconds;
      remainingTargetDuration -= minimumStepDurationSeconds;
      remainingSourceDuration -= clampedSourceDurations[index];
    });
    unresolvedIndices = unresolvedIndices.filter((index) => !belowMinimumIndices.includes(index));
  }

  const baseUnits = scaledDurations.map((durationSeconds) =>
    Math.max(50, Math.floor(durationSeconds * 100)),
  );
  let remainingUnits = totalUnits - baseUnits.reduce((sum, units) => sum + units, 0);
  const remainders = scaledDurations
    .map((durationSeconds, index) => ({
      index,
      remainder: durationSeconds * 100 - baseUnits[index],
    }))
    .sort((left, right) => right.remainder - left.remainder);

  for (let index = 0; index < remainders.length && remainingUnits > 0; index += 1) {
    baseUnits[remainders[index].index] += 1;
    remainingUnits -= 1;
  }

  let enabledStepIndex = 0;
  return steps.map((step) => {
    if (!isTimelineStepEnabled(step)) {
      return step;
    }

    const nextDurationSeconds = baseUnits[enabledStepIndex] / 100;
    const previousDurationSeconds = clampedSourceDurations[enabledStepIndex];
    const previousTransitionDurationSeconds = clampTransitionDuration(
      previousDurationSeconds,
      step.transitionDurationSeconds,
    );
    const nextTransitionDurationSeconds = clampTransitionDuration(
      nextDurationSeconds,
      previousDurationSeconds > 0
        ? previousTransitionDurationSeconds * (nextDurationSeconds / previousDurationSeconds)
        : previousTransitionDurationSeconds,
    );
    enabledStepIndex += 1;

    return {
      ...step,
      durationSeconds: nextDurationSeconds,
      transitionDurationSeconds: nextTransitionDurationSeconds,
    };
  });
}

function getFocusedTimelineStep(
  steps: TimelineStub['shaderSequence']['steps'],
  focusedStepId: string | null | undefined,
): TimelineStub['shaderSequence']['steps'][number] | null {
  if (!steps.length) {
    return null;
  }

  return steps.find((step) => step.id === focusedStepId) ?? steps[0] ?? null;
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
  randomSeedSalt = '',
}: {
  mode: TimelineSequenceMode;
  steps: TimelineStub['shaderSequence']['steps'];
  cycleIndex: number;
  randomSeedSalt?: string;
}): TimelineStub['shaderSequence']['steps'] {
  if ((mode !== 'random' && mode !== 'randomMix' && mode !== 'double') || steps.length <= 1) {
    return steps;
  }

  const nextSteps = [...steps];
  const seed = hashTimelineSeed(
    `${mode}:${randomSeedSalt}:${cycleIndex}:${steps.map((step) => step.id).join('|')}`,
  );
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
  focusedStepId,
  singleStepLoopEnabled,
  randomChoiceEnabled,
  sharedTransitionEnabled,
  sharedTransitionEffect,
  sharedTransitionDurationSeconds,
  steps,
  timeSeconds,
  loop,
  randomSeedSalt = '',
}: {
  shaders: SavedShader[];
  mode: TimelineSequenceMode;
  focusedStepId: string | null;
  singleStepLoopEnabled: boolean;
  randomChoiceEnabled: boolean;
  sharedTransitionEnabled: boolean;
  sharedTransitionEffect: TimelineTransitionEffect;
  sharedTransitionDurationSeconds: number;
  steps: TimelineStub['shaderSequence']['steps'];
  timeSeconds: number;
  loop: boolean;
  randomSeedSalt?: string;
}): TimelineResolution | null {
  if (!steps.length || !shaders.length) {
    return null;
  }

  const shaderMap = new Map(shaders.map((shader) => [shader.id, shader]));
  const validSteps = steps.filter(
    (step) => shaderMap.has(step.shaderId) && isTimelineStepEnabled(step),
  );
  if (!validSteps.length) {
    return null;
  }

  const focusedStep = getFocusedTimelineStep(validSteps, focusedStepId);
  const playbackSteps =
    singleStepLoopEnabled && focusedStep ? [focusedStep] : validSteps;
  const effectiveMode =
    mode === 'double' ? 'randomMix' : randomChoiceEnabled ? 'random' : mode;
  const usesSharedTransition =
    effectiveMode === 'randomMix' || sharedTransitionEnabled;

  const totalDurationSeconds = getShaderTimelineDuration(playbackSteps);
  if (totalDurationSeconds <= 0) {
    return null;
  }

  const absoluteTimeSeconds = Math.max(0, timeSeconds);
  const cycleIndex = loop
    ? Math.floor(absoluteTimeSeconds / totalDurationSeconds)
    : 0;
  const cycleSteps = getTimelineCycleSteps({
    mode: effectiveMode,
    steps: playbackSteps,
    cycleIndex,
    randomSeedSalt,
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
        usesSharedTransition ? sharedTransitionEffect : step.transitionEffect;
      const transitionDurationSeconds = clampTransitionDuration(
        durationSeconds,
        singleStepLoopEnabled
          ? 0
          : usesSharedTransition
            ? sharedTransitionDurationSeconds
            : step.transitionDurationSeconds,
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
