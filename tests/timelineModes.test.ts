import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEffectiveTimelinePlaybackSteps,
  normalizeProjectTimeline,
  normalizeTimelineSequenceMode,
  resolveShaderTimelineState,
} from '../src/lib/timeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { ProjectDocument, SavedShader, TimelineStub } from '../src/types.ts';

const shaders: SavedShader[] = ['a', 'b', 'c'].map((id) => ({ id, name: id, code: 'void main() {}' }));
const sequence: TimelineStub['shaderSequence'] = {
  enabled: true, mode: 'sequence', editorView: 'advanced', stagePreviewMode: 'timeline',
  focusedStepId: null, pinnedStepId: null, randomSeedToken: 'shared-hold',
  singleStepLoopEnabled: false, randomChoiceEnabled: false,
  sharedTransitionEnabled: false, sharedTransitionEffect: 'wipe',
  sharedTransitionDurationSeconds: 1, sharedSectionDurationSeconds: 6,
  steps: shaders.map(({ id }, index) => ({
    id, shaderId: id, durationSeconds: [2, 9, 15][index],
    transitionEffect: 'radial', transitionDurationSeconds: 0.25,
    assetSettings: normalizeTimelineStepAssetSettings(),
  })),
};

for (const mode of ['sequence', 'random', 'double'] as const) {
  test(`${mode} uses Hold and shared Mix regardless of legacy individual durations`, () => {
    const effective = getEffectiveTimelinePlaybackSteps({ ...sequence, mode });
    assert.deepEqual(effective.map((step) => step.durationSeconds), [6, 6, 6]);
    assert.deepEqual(effective.map((step) => step.transitionDurationSeconds), [1, 1, 1]);
    const state = resolveShaderTimelineState({
      ...sequence, mode, shaders, timeSeconds: 5.5, loop: true, randomSeedSalt: 'shared-hold',
    });
    assert.ok(state);
    assert.equal(state.totalDurationSeconds, 18);
    assert.equal(state.transitionEffect, 'wipe');
    assert.equal(state.transitionDurationSeconds, 1);
    assert.equal(state.transitionProgress, 0.5);
    const shorter = getEffectiveTimelinePlaybackSteps({
      ...sequence, mode, sharedSectionDurationSeconds: 0.5,
    });
    assert.deepEqual(shorter.map((step) => step.transitionDurationSeconds), [0.5, 0.5, 0.5]);
    assert.deepEqual(sequence.steps.map((step) => step.durationSeconds), [2, 9, 15]);
  });
}

test('Sequence preserves card order while Random changes order with the same six-second timing', () => {
  const cycle = (mode: 'sequence' | 'random', salt = 'shared-hold') => [0, 6, 12].map((timeSeconds) => {
    const state = resolveShaderTimelineState({
      ...sequence, mode, shaders, timeSeconds, loop: true, randomSeedSalt: salt,
    });
    assert.ok(state);
    assert.equal(state.localTimeSeconds, 0);
    assert.equal(state.stepEndSeconds - state.stepStartSeconds, 6);
    return state.currentStep.id;
  });
  assert.deepEqual(cycle('sequence'), ['a', 'b', 'c']);
  const randomCycles = Array.from({ length: 8 }, (_, i) => cycle('random', `seed-${i}`));
  for (const ids of randomCycles) assert.deepEqual([...ids].sort(), ['a', 'b', 'c']);
  assert.ok(randomCycles.some((ids) => ids.join() !== 'a,b,c'));
  assert.deepEqual(cycle('random'), cycle('random'));
});

test('disabled and pinned shaders do not contribute to the shared duration', () => {
  const steps = sequence.steps.map((step) => ({ ...step, disabled: step.id === 'b' }));
  const effective = getEffectiveTimelinePlaybackSteps({ ...sequence, steps, pinnedStepId: 'c' });
  assert.deepEqual(effective.filter((step) => !step.disabled).map((step) => [step.id, step.durationSeconds]), [['a', 6]]);
});

test('retired modes migrate to Random without losing steps, Hold, Mix, or other project data', () => {
  for (const mode of ['randomMix'] as const) {
    const project = {
      name: 'Existing project',
      timeline: { stub: { shaderSequence: { ...sequence, mode } } },
    } as ProjectDocument;
    const migrated = normalizeProjectTimeline(project);
    const next = migrated.timeline.stub.shaderSequence;
    assert.equal(migrated.name, project.name);
    assert.equal(next.mode, 'random');
    assert.equal(next.randomChoiceEnabled, false);
    assert.equal(next.sharedTransitionEnabled, true);
    assert.equal(next.sharedSectionDurationSeconds, 6);
    assert.equal(next.sharedTransitionEffect, 'wipe');
    assert.equal(next.sharedTransitionDurationSeconds, 1);
    assert.equal(next.steps, sequence.steps);
    assert.equal(normalizeProjectTimeline(migrated), migrated);
  }
  assert.equal(normalizeTimelineSequenceMode('sequence', true), 'random');
  assert.equal(normalizeTimelineSequenceMode('sequence'), 'sequence');
  assert.equal(normalizeTimelineSequenceMode('audioReactive'), 'audioReactive');
});

test('Double survives save normalization, including old random-choice projects', () => {
  const project = { timeline: { stub: { shaderSequence: { ...sequence, mode: 'double', randomChoiceEnabled: true } } } } as ProjectDocument;
  const next = normalizeProjectTimeline(project);
  assert.equal(next.timeline.stub.shaderSequence.mode, 'double');
  assert.equal(next.timeline.stub.shaderSequence.steps, sequence.steps);
  assert.equal(normalizeProjectTimeline(next), next);
});
