import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAudioSectionDetector,
  updateAudioSectionDetector,
  type AudioSectionDetectorState,
} from '../src/lib/audioSectionDetection.ts';
import { resolveAudioReactiveTimelineState } from '../src/lib/audioTimeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { SavedShader, TimelineStub } from '../src/types.ts';

function advanceDetector(
  state: AudioSectionDetectorState,
  {
    fromMs,
    count,
    features,
    beat = 0,
  }: {
    fromMs: number;
    count: number;
    features: number[];
    beat?: number;
  },
): AudioSectionDetectorState {
  let nextState = state;

  for (let index = 0; index < count; index += 1) {
    const atMs = fromMs + index * 100;
    nextState = updateAudioSectionDetector(
      nextState,
      {
        atMs,
        epochMs: 1_700_000_000_000 + atMs,
        features,
        level: 0.5,
        beat,
      },
      {
        minSectionMs: 1_000,
      },
    ).state;
  }

  return nextState;
}

function createStep(
  id: string,
  shaderId: string,
  disabled = false,
): TimelineStub['shaderSequence']['steps'][number] {
  return {
    id,
    shaderId,
    disabled,
    durationSeconds: 8,
    transitionDurationSeconds: 0.75,
    transitionEffect: 'mix',
    assetSettings: normalizeTimelineStepAssetSettings(),
  };
}

const SHADERS: SavedShader[] = [
  { id: 'shader-a', name: 'A', code: 'void main() {}' },
  { id: 'shader-b', name: 'B', code: 'void main() {}' },
  { id: 'shader-c', name: 'C', code: 'void main() {}' },
];

test('section detector ignores a short transient but confirms a sustained music change', () => {
  let state = createAudioSectionDetector('run-1', 0, 1_700_000_000_000);
  state = advanceDetector(state, {
    fromMs: 0,
    count: 40,
    features: [0.15, 0.2, 0.12, 0.18],
  });

  state = advanceDetector(state, {
    fromMs: 4_000,
    count: 1,
    features: [0.9, 0.85, 0.8, 0.9],
    beat: 1,
  });
  state = advanceDetector(state, {
    fromMs: 4_100,
    count: 4,
    features: [0.15, 0.2, 0.12, 0.18],
  });
  assert.equal(state.snapshot.revision, 0);

  state = advanceDetector(state, {
    fromMs: 4_500,
    count: 14,
    features: [0.85, 0.8, 0.78, 0.9],
    beat: 1,
  });

  assert.equal(state.snapshot.revision, 1);
  assert.equal(state.snapshot.runId, 'run-1');
  assert.ok(state.snapshot.confidence > 0);
  assert.ok(state.snapshot.changedAtEpochMs >= 1_700_000_004_500);
});

test('section detector honors the minimum hold between confirmed changes', () => {
  let state = createAudioSectionDetector('run-2', 0, 1_700_000_000_000);
  state = advanceDetector(state, {
    fromMs: 0,
    count: 35,
    features: [0.1, 0.12, 0.15],
  });
  state = advanceDetector(state, {
    fromMs: 3_500,
    count: 14,
    features: [0.9, 0.85, 0.8],
    beat: 1,
  });
  assert.equal(state.snapshot.revision, 1);

  const firstChangeAt = state.snapshot.changedAtEpochMs;
  state = advanceDetector(state, {
    fromMs: 4_900,
    count: 5,
    features: [0.1, 0.12, 0.15],
    beat: 1,
  });

  assert.equal(state.snapshot.revision, 1);
  assert.equal(state.snapshot.changedAtEpochMs, firstChangeAt);
});

test('audio timeline advances by section revision and crossfades from the previous shader', () => {
  const steps = [
    createStep('step-a', 'shader-a'),
    createStep('step-b', 'shader-b'),
    createStep('step-c', 'shader-c'),
  ];
  const resolution = resolveAudioReactiveTimelineState({
    shaders: SHADERS,
    steps,
    section: {
      runId: 'run-1',
      revision: 1,
      changedAtEpochMs: 10_000,
      confidence: 0.9,
      novelty: 0.5,
    },
    nowEpochMs: 10_500,
    transitionEffect: 'wipe',
    transitionDurationSeconds: 1,
  });

  assert.equal(resolution?.currentStep.id, 'step-a');
  assert.equal(resolution?.nextStep?.id, 'step-b');
  assert.equal(resolution?.currentShader.id, 'shader-a');
  assert.equal(resolution?.nextShader?.id, 'shader-b');
  assert.equal(resolution?.transitionEffect, 'wipe');
  assert.equal(resolution?.transitionProgress, 0.5);
  assert.equal(resolution?.isTransitioning, true);
});

test('audio timeline skips disabled/missing shaders and settles on the detected section', () => {
  const steps = [
    createStep('step-a', 'shader-a'),
    createStep('step-disabled', 'shader-b', true),
    createStep('step-missing', 'missing'),
    createStep('step-c', 'shader-c'),
  ];
  const resolution = resolveAudioReactiveTimelineState({
    shaders: SHADERS,
    steps,
    section: {
      runId: 'run-1',
      revision: 1,
      changedAtEpochMs: 10_000,
      confidence: 0.9,
      novelty: 0.5,
    },
    nowEpochMs: 12_000,
    transitionEffect: 'mix',
    transitionDurationSeconds: 0.75,
  });

  assert.equal(resolution?.currentStep.id, 'step-c');
  assert.equal(resolution?.nextStep?.id, 'step-a');
  assert.equal(resolution?.transitionProgress, 0);
  assert.equal(resolution?.isTransitioning, false);
});
