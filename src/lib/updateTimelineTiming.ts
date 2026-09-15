import type { PlaybackTransport, SavedShader, TimelineStub } from '../types';
import { getTransportTimeSeconds, seekTransportPreservingRenderTime } from './clock.ts';
import {
  getEffectiveTimelinePlaybackSteps,
  getEffectiveTransitionDurationSeconds,
  getShaderTimelineDuration,
  getTimelineCycleSteps,
  resolveShaderTimelineState,
  shouldUseSharedTransition,
  updateTimelineSharedSettings,
} from './timeline.ts';

/** Change clip timing without seeking to a different shader or restarting its animation. */
export function updateTimelineTiming({
  sequence, transport, shaders, patch, randomSeedSalt = '', nowMs = performance.now(),
}: {
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  shaders: SavedShader[];
  patch: Parameters<typeof updateTimelineSharedSettings>[1];
  randomSeedSalt?: string;
  nowMs?: number;
}) {
  const nextSequence = updateTimelineSharedSettings(sequence, patch);
  if (sequence.mode === 'audioReactive' ||
      nextSequence.sharedSectionDurationSeconds === sequence.sharedSectionDurationSeconds) {
    return { sequence: nextSequence, transport };
  }

  const shaderIds = new Set(shaders.map(shader => shader.id));
  const playbackSteps = (value: typeof sequence) => getEffectiveTimelinePlaybackSteps({
    ...value, pinnedStepId: value.pinnedStepId ?? null,
  }).filter(step => !step.disabled && shaderIds.has(step.shaderId));
  const timeSeconds = getTransportTimeSeconds(transport, nowMs);
  const current = resolveShaderTimelineState({
    ...sequence, shaders, steps: playbackSteps(sequence), timeSeconds,
    loop: transport.loop, randomSeedSalt,
  });
  if (!current) return { sequence: nextSequence, transport };

  const nextSteps = playbackSteps(nextSequence);
  const nextTotal = getShaderTimelineDuration(nextSteps);
  const mode = sequence.mode === 'double' ? 'randomMix' : sequence.randomChoiceEnabled ? 'random' : sequence.mode;
  const orderedSteps = sequence.singleStepLoopEnabled ? nextSteps : getTimelineCycleSteps({
    mode, steps: nextSteps, cycleIndex: current.cycleIndex, randomSeedSalt,
  });
  const nextIndex = orderedSteps.findIndex(step => step.id === current.currentStep.id);
  if (nextIndex < 0) return { sequence: nextSequence, transport };

  const nextStep = orderedSteps[nextIndex];
  const nextDuration = nextStep.durationSeconds;
  const nextMix = getEffectiveTransitionDurationSeconds({
    stepDurationSeconds: nextDuration,
    stepTransitionDurationSeconds: nextStep.transitionDurationSeconds,
    usesSharedTransition: shouldUseSharedTransition(mode, nextSequence.sharedTransitionEnabled),
    sharedTransitionDurationSeconds: nextSequence.sharedTransitionDurationSeconds,
    singleStepLoopEnabled: sequence.singleStepLoopEnabled,
  });
  let nextLocal = current.localTimeSeconds / current.currentStep.durationSeconds * nextDuration;
  if (current.isTransitioning && nextMix > 0) {
    // Keep both shaders and their blend instead of jumping backwards or forwards through the mix.
    nextLocal = nextDuration - nextMix + current.transitionProgress * nextMix;
  } else if (current.nextStep && !current.isTransitioning && current.transitionStartSeconds > 0) {
    nextLocal = current.localTimeSeconds / current.transitionStartSeconds * (nextDuration - nextMix);
  }

  const ended = !transport.loop && !sequence.singleStepLoopEnabled && timeSeconds >= current.totalDurationSeconds;
  const nextTime = ended ? nextTotal :
    current.cycleIndex * nextTotal + getShaderTimelineDuration(orderedSteps.slice(0, nextIndex)) +
      Math.max(0, Math.min(nextDuration - 0.000001, nextLocal));
  return {
    sequence: nextSequence,
    transport: seekTransportPreservingRenderTime(transport, nextTime, nowMs),
  };
}
