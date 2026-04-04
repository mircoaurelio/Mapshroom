import type {
  SavedShader,
  TimelineStub,
  TimelineTransitionEffect,
} from '../types';

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

export function clampTimelineStepDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0.5, Math.min(600, value));
}

export function clampTransitionDuration(
  durationSeconds: number,
  transitionDurationSeconds: number,
): number {
  if (!Number.isFinite(transitionDurationSeconds)) {
    return 0;
  }

  return Math.max(0, Math.min(durationSeconds, transitionDurationSeconds));
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
  steps,
  timeSeconds,
  loop,
}: {
  shaders: SavedShader[];
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

  let resolvedTime = Math.max(0, timeSeconds);
  if (loop) {
    resolvedTime %= totalDurationSeconds;
    if (resolvedTime < 0) {
      resolvedTime += totalDurationSeconds;
    }
  } else {
    resolvedTime = Math.min(resolvedTime, totalDurationSeconds);
  }

  let cursor = 0;
  for (let index = 0; index < validSteps.length; index += 1) {
    const step = validSteps[index];
    const durationSeconds = clampTimelineStepDuration(step.durationSeconds);
    const nextCursor = cursor + durationSeconds;
    const isLastStep = index === validSteps.length - 1;
    const withinStep = resolvedTime < nextCursor || isLastStep;

    if (withinStep) {
      const currentShader = shaderMap.get(step.shaderId);
      if (!currentShader) {
        return null;
      }

      const nextStep = validSteps[index + 1] ?? (loop ? validSteps[0] : null);
      const nextShader = nextStep ? shaderMap.get(nextStep.shaderId) ?? null : null;
      const localTimeSeconds = Math.max(0, Math.min(durationSeconds, resolvedTime - cursor));
      const transitionDurationSeconds = clampTransitionDuration(
        durationSeconds,
        step.transitionDurationSeconds,
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
        transitionEffect: step.transitionEffect,
        isTransitioning,
      };
    }

    cursor = nextCursor;
  }

  return null;
}
