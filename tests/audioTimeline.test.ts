import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAudioSectionDetector,
  updateAudioSectionDetector,
  type AudioSectionDetectorState,
} from '../src/lib/audioSectionDetection.ts';
import { activateAudioReactiveTimeline, resolveAudioReactiveTimelineState } from '../src/lib/audioTimeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { SavedShader, TimelineStub } from '../src/types.ts';

function advanceDetector(
  state: AudioSectionDetectorState,
  {
    fromMs,
    count,
    features,
    beat = 0,
    minSectionMs = 1_000,
    level = 0.5,
  }: {
    fromMs: number;
    count: number;
    features: number[];
    beat?: number;
    minSectionMs?: number;
    level?: number;
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
        level,
        beat,
      },
      {
        minSectionMs,
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

test('selecting Audio Reactive in the timeline releases the previous focused repeat', () => {
  const sequence = activateAudioReactiveTimeline({
    enabled: true, mode: 'randomMix', editorView: 'advanced', stagePreviewMode: 'focused',
    focusedStepId: 'step-b', pinnedStepId: null, randomSeedToken: 'seed',
    singleStepLoopEnabled: true, randomChoiceEnabled: false, manualSelectionTransition: 'cut',
    sharedTransitionEnabled: true, sharedTransitionEffect: 'radial',
    sharedTransitionDurationSeconds: 2, sharedSectionDurationSeconds: 8,
    steps: [createStep('step-a', 'shader-a'), createStep('step-b', 'shader-b')],
  });
  assert.equal(sequence.mode, 'audioReactive');
  assert.equal(sequence.stagePreviewMode, 'timeline');
  assert.equal(sequence.singleStepLoopEnabled, false);
  assert.equal(sequence.sharedTransitionEffect, 'radial');
  assert.equal(sequence.sharedTransitionDurationSeconds, 2);
});

test('a sustained music change during minimum hold is played when the hold expires', () => {
  let state = createAudioSectionDetector('hold', 0, 1_700_000_000_000);
  state = advanceDetector(state, {
    fromMs: 0, count: 40, features: [0.18, 0.24, 0.16, 0.21], minSectionMs: 8_000,
  });
  state = advanceDetector(state, {
    fromMs: 4_000, count: 40, features: [0.4, 0.48, 0.4, 0.51], beat: 1, minSectionMs: 8_000,
  });
  assert.equal(state.snapshot.revision, 0);
  state = advanceDetector(state, {
    fromMs: 8_000, count: 40, features: [0.4, 0.48, 0.4, 0.51], beat: 1, minSectionMs: 8_000,
  });
  assert.equal(state.snapshot.revision, 1);
  assert.ok(state.snapshot.changedAtEpochMs >= 1_700_000_008_000);
});

test('silence cancels a queued music change instead of advancing an idle timeline', () => {
  let state = createAudioSectionDetector('silence', 0, 1_700_000_000_000);
  state = advanceDetector(state, {
    fromMs: 0, count: 40, features: [0.1, 0.15, 0.2], minSectionMs: 8_000,
  });
  state = advanceDetector(state, {
    fromMs: 4_000, count: 20, features: [0.5, 0.6, 0.7], beat: 1, minSectionMs: 8_000,
  });
  state = advanceDetector(state, {
    fromMs: 6_000, count: 60, features: [0, 0, 0], level: 0, minSectionMs: 8_000,
  });
  assert.equal(state.snapshot.revision, 0);
});

test('audio-driven mixes use the requested duration independently of timeline card length', () => {
  const resolution = resolveAudioReactiveTimelineState({
    shaders: SHADERS,
    steps: [createStep('step-a', 'shader-a'), createStep('step-b', 'shader-b')],
    section: { runId: 'mix', revision: 1, changedAtEpochMs: 10_000, confidence: 1, novelty: 1 },
    nowEpochMs: 19_000,
    transitionEffect: 'radial', transitionDurationSeconds: 12,
  });
  assert.equal(resolution?.isTransitioning, true);
  assert.equal(resolution?.transitionEffect, 'radial');
  assert.equal(resolution?.transitionProgress, 0.75);
  assert.equal(resolution?.transitionDurationSeconds, 12);
});

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

test('section detector recognizes a realistic sustained spectral shift', () => {
  let state = createAudioSectionDetector('run-real-audio', 0, 1_700_000_000_000);
  state = advanceDetector(state, {
    fromMs: 0,
    count: 40,
    features: [0.18, 0.24, 0.16, 0.21, 0.19, 0.27],
  });
  state = advanceDetector(state, {
    fromMs: 4_000,
    count: 16,
    features: [0.235, 0.295, 0.215, 0.265, 0.245, 0.325],
    beat: 1,
  });

  assert.equal(state.snapshot.revision, 1);
  assert.ok(state.snapshot.novelty >= 0.03);
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

test('manual focused shader overrides audio progression until the hold is released', () => {
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
      revision: 7,
      changedAtEpochMs: 10_000,
      confidence: 0.9,
      novelty: 0.5,
    },
    nowEpochMs: 10_100,
    transitionEffect: 'mix',
    transitionDurationSeconds: 0.75,
    focusedStepId: 'step-c',
    singleStepLoopEnabled: true,
  });

  assert.equal(resolution?.currentStep.id, 'step-c');
  assert.equal(resolution?.nextStep, null);
  assert.equal(resolution?.transitionProgress, 0);
  assert.equal(resolution?.isTransitioning, false);
});
