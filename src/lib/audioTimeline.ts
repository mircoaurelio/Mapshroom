import type { AudioSectionSnapshot } from './audioSectionDetection';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  getShaderTimelineDuration,
  isTimelineStepEnabled,
  type TimelineResolution,
} from './timeline.ts';
import type {
  SavedShader,
  TimelineStub,
  TimelineTransitionEffect,
} from '../types';

function getStepStartSeconds(
  steps: TimelineStub['shaderSequence']['steps'],
  stepIndex: number,
): number {
  return steps
    .slice(0, stepIndex)
    .reduce(
      (totalSeconds, step) =>
        totalSeconds + clampTimelineStepDuration(step.durationSeconds),
      0,
    );
}

export function resolveAudioReactiveTimelineState({
  shaders,
  steps,
  section,
  nowEpochMs,
  transitionEffect,
  transitionDurationSeconds,
}: {
  shaders: SavedShader[];
  steps: TimelineStub['shaderSequence']['steps'];
  section: AudioSectionSnapshot | null | undefined;
  nowEpochMs: number;
  transitionEffect: TimelineTransitionEffect;
  transitionDurationSeconds: number;
}): TimelineResolution | null {
  const shaderMap = new Map(shaders.map((shader) => [shader.id, shader]));
  const validSteps = steps.filter(
    (step) => isTimelineStepEnabled(step) && shaderMap.has(step.shaderId),
  );
  if (validSteps.length === 0) {
    return null;
  }

  const revision = Math.max(0, Math.floor(section?.revision ?? 0));
  const targetIndex = revision % validSteps.length;
  const targetStep = validSteps[targetIndex];
  const targetShader = shaderMap.get(targetStep.shaderId);
  if (!targetShader) {
    return null;
  }

  const requestedTransitionDurationSeconds = clampTransitionDuration(
    clampTimelineStepDuration(targetStep.durationSeconds),
    transitionDurationSeconds,
  );
  const changedAtEpochMs = Math.max(0, section?.changedAtEpochMs ?? 0);
  const transitionProgress =
    revision > 0 &&
    changedAtEpochMs > 0 &&
    requestedTransitionDurationSeconds > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (nowEpochMs - changedAtEpochMs) /
              (requestedTransitionDurationSeconds * 1_000),
          ),
        )
      : 1;
  const isTransitioning =
    validSteps.length > 1 &&
    revision > 0 &&
    requestedTransitionDurationSeconds > 0 &&
    transitionProgress < 1;
  const currentIndex = isTransitioning
    ? (targetIndex - 1 + validSteps.length) % validSteps.length
    : targetIndex;
  const currentStep = validSteps[currentIndex];
  const currentShader = shaderMap.get(currentStep.shaderId);
  if (!currentShader) {
    return null;
  }

  const nextIndex = isTransitioning
    ? targetIndex
    : (targetIndex + 1) % validSteps.length;
  const nextStep = validSteps.length > 1 ? validSteps[nextIndex] : null;
  const nextShader = nextStep ? shaderMap.get(nextStep.shaderId) ?? null : null;
  const stepStartSeconds = getStepStartSeconds(validSteps, currentIndex);
  const durationSeconds = clampTimelineStepDuration(currentStep.durationSeconds);
  const elapsedSinceChangeSeconds =
    changedAtEpochMs > 0 ? Math.max(0, (nowEpochMs - changedAtEpochMs) / 1_000) : 0;

  return {
    currentStep,
    currentShader,
    nextStep,
    nextShader,
    stepStartSeconds,
    stepEndSeconds: stepStartSeconds + durationSeconds,
    localTimeSeconds: Math.min(durationSeconds, elapsedSinceChangeSeconds),
    totalDurationSeconds: getShaderTimelineDuration(validSteps),
    transitionProgress: isTransitioning ? transitionProgress : 0,
    transitionEffect,
    transitionStartSeconds: 0,
    transitionDurationSeconds: isTransitioning
      ? requestedTransitionDurationSeconds
      : 0,
    cycleIndex: Math.floor(revision / validSteps.length),
    isTransitioning,
  };
}
