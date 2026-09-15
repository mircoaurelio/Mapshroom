import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDurationInput } from '../src/lib/durationInput.ts';
import { normalizeProjectTimeline, resolveShaderTimelineState, updateTimelineSharedSettings } from '../src/lib/timeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { ProjectDocument, SavedShader, TimelineStub } from '../src/types.ts';

const shaders: SavedShader[] = ['a', 'b', 'c'].map((id) => ({ id, name: id, code: 'void main() {}' }));
const sequence: TimelineStub['shaderSequence'] = {
  enabled: true, mode: 'sequence', editorView: 'advanced', stagePreviewMode: 'timeline',
  focusedStepId: null, pinnedStepId: null, randomSeedToken: 'duration', singleStepLoopEnabled: false,
  randomChoiceEnabled: false, sharedTransitionEnabled: true, sharedTransitionEffect: 'mix',
  sharedSectionDurationSeconds: 6, sharedTransitionDurationSeconds: 5,
  steps: shaders.map(({ id }) => ({ id, shaderId: id, durationSeconds: 8,
    transitionEffect: 'mix', transitionDurationSeconds: 0.75, assetSettings: normalizeTimelineStepAssetSettings() })),
};

test('committed decimal input accepts both separators and rejects empty or incomplete numbers', () => {
  assert.equal(parseDurationInput(' 5,25 '), 5.25);
  assert.equal(parseDurationInput('5.25'), 5.25);
  assert.equal(parseDurationInput('.5'), 0.5);
  assert.equal(parseDurationInput('0'), 0);
  for (const text of ['', ' ', '-', '.', ',', '1,2.3', '1e', 'NaN', 'Infinity', '-2']) {
    assert.equal(parseDurationInput(text), null, text);
  }
});

test('mix duration is limited to the clip, including when the clip becomes shorter', () => {
  assert.equal(updateTimelineSharedSettings(sequence, { sharedTransitionDurationSeconds: 20 }).sharedTransitionDurationSeconds, 6);
  const shorter = updateTimelineSharedSettings(sequence, { sharedSectionDurationSeconds: 3 });
  assert.equal(shorter.sharedSectionDurationSeconds, 3);
  assert.equal(shorter.sharedTransitionDurationSeconds, 3);
  const longer = updateTimelineSharedSettings(sequence, { sharedSectionDurationSeconds: 12 });
  assert.equal(longer.sharedTransitionDurationSeconds, 5);
  assert.equal(updateTimelineSharedSettings(sequence, { sharedTransitionDurationSeconds: 0 }).sharedTransitionDurationSeconds, 0);
});

test('loading an existing project corrects an oversized mix before playback', () => {
  const project = { timeline: { stub: { shaderSequence: { ...sequence, sharedTransitionDurationSeconds: 90 } } } } as ProjectDocument;
  const result = normalizeProjectTimeline(project);
  assert.equal(result.timeline.stub.shaderSequence.sharedTransitionDurationSeconds, 6);
  assert.equal(result.timeline.stub.shaderSequence.steps, sequence.steps);
  assert.equal(normalizeProjectTimeline(result), result);
});

for (const mode of ['sequence', 'random'] as const) {
  test(`${mode}: a six-second clip includes five seconds of mix without extending the timeline`, () => {
    const resolve = (timeSeconds: number, mix = 5) => {
      const state = resolveShaderTimelineState({ ...sequence, mode, shaders, sharedTransitionDurationSeconds: mix,
        timeSeconds, loop: true, randomSeedSalt: 'duration' });
      assert.ok(state);
      assert.equal(state.totalDurationSeconds, 18);
      return state;
    };
    assert.equal(resolve(0.5).isTransitioning, false);
    assert.equal(resolve(1).transitionProgress, 0);
    assert.equal(resolve(3.5).transitionProgress, 0.5);
    assert.equal(resolve(5.99).transitionDurationSeconds, 5);
    assert.ok(resolve(5.99).transitionProgress > 0.99);
    assert.equal(resolve(6).localTimeSeconds, 0);
    assert.equal(resolve(6).stepStartSeconds, 6);
    assert.equal(resolve(3, 6).transitionProgress, 0.5);
    assert.equal(resolve(5, 0).isTransitioning, false);
  });
}
