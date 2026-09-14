import type { PlaybackTransport, SavedShader, TimelineStub } from '../types';
import { getTransportTimeSeconds, seekTransportPreservingRenderTime } from './clock.ts';
import {
  getEffectiveTimelinePlaybackSteps,
  getShaderTimelineDuration,
  getTimelineCycleSteps,
  resolveShaderTimelineState,
} from './timeline.ts';

// Restoring a card changes availability, never the editor or focused selection.
export function enableTimelineStep({
  sequence, transport, shaders, stepId, randomSeedSalt = '', nowMs = performance.now(),
}: {
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  shaders: SavedShader[];
  stepId: string;
  randomSeedSalt?: string;
  nowMs?: number;
}) {
  if (!sequence.steps.some((step) => step.id === stepId && step.disabled)) {
    return { sequence, transport };
  }

  const nextSequence = {
    ...sequence,
    steps: sequence.steps.map((step) => step.id === stepId ? { ...step, disabled: false } : step),
  };
  if (sequence.mode === 'audioReactive' || !sequence.enabled) {
    return { sequence: nextSequence, transport };
  }

  const playbackSteps = (value: typeof sequence) => getEffectiveTimelinePlaybackSteps({
    ...value, pinnedStepId: value.pinnedStepId ?? null,
  }).filter((step) => !step.disabled && shaders.some((shader) => shader.id === step.shaderId));
  const timeSeconds = getTransportTimeSeconds(transport, nowMs);
  const current = resolveShaderTimelineState({
    ...sequence, shaders, steps: playbackSteps(sequence), timeSeconds,
    loop: transport.loop, randomSeedSalt,
  });
  if (!current) {
    return { sequence: nextSequence, transport };
  }

  const nextSteps = playbackSteps(nextSequence);
  const isFocused = sequence.singleStepLoopEnabled &&
    current.currentStep.id === sequence.focusedStepId;
  const orderedSteps = isFocused ? nextSteps : getTimelineCycleSteps({
    mode: sequence.mode === 'double' ? 'randomMix' : sequence.randomChoiceEnabled ? 'random' : sequence.mode,
    steps: nextSteps,
    cycleIndex: current.cycleIndex,
    randomSeedSalt,
  });
  const nextIndex = orderedSteps.findIndex((step) => step.id === current.currentStep.id);
  if (nextIndex < 0) {
    return { sequence: nextSequence, transport };
  }

  const nextStart = getShaderTimelineDuration(orderedSteps.slice(0, nextIndex));
  // Inserting an enabled step can shift both offsets and random order. Keep the
  // current shader and its local phase, while the render clock remains continuous.
  const nextTime = isFocused
    ? timeSeconds + nextStart - current.stepStartSeconds
    : current.cycleIndex * getShaderTimelineDuration(nextSteps) + nextStart +
      Math.min(current.localTimeSeconds, orderedSteps[nextIndex].durationSeconds - 0.000001);
  return {
    sequence: nextSequence,
    transport: Math.abs(nextTime - timeSeconds) < 0.000001
      ? transport
      : seekTransportPreservingRenderTime(transport, nextTime, nowMs),
  };
}
