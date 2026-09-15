import assert from 'node:assert/strict';
import test from 'node:test';
import { updateTimelineTiming } from '../src/lib/updateTimelineTiming.ts';
import { getRenderTimeSeconds, getTransportTimeSeconds } from '../src/lib/clock.ts';
import { getEffectiveTimelinePlaybackSteps, resolveShaderTimelineState, updateTimelineSharedSettings } from '../src/lib/timeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { PlaybackTransport, SavedShader, TimelineStub } from '../src/types.ts';

const shaders: SavedShader[] = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, code: 'void main() {}' }));
const nowMs = 5000;
const randomSeedSalt = 'random:retiming-test';
function fixture(mode: TimelineStub['shaderSequence']['mode'] = 'sequence', timeSeconds = 87, isPlaying = false) {
  const sequence: TimelineStub['shaderSequence'] = {
    enabled: true, mode, editorView: 'advanced', stagePreviewMode: 'timeline',
    focusedStepId: 'c', pinnedStepId: null, randomSeedToken: 'retiming-test',
    singleStepLoopEnabled: false, randomChoiceEnabled: false, manualSelectionTransition: 'cut',
    sharedTransitionEnabled: true, sharedTransitionEffect: 'mix',
    sharedTransitionDurationSeconds: 2, sharedSectionDurationSeconds: 8,
    steps: shaders.map(({ id }, index) => ({
      id, shaderId: id, disabled: false, durationSeconds: 5 + index,
      transitionDurationSeconds: 0.75, transitionEffect: 'mix',
      assetSettings: normalizeTimelineStepAssetSettings(),
    })),
  };
  const transport: PlaybackTransport = {
    currentTimeSeconds: timeSeconds - (isPlaying ? 3 : 0),
    isPlaying, anchorTimestampMs: isPlaying ? 3000 : null,
    playbackRate: 1.5, loop: true, renderTimeOffsetSeconds: 4,
  };
  return { sequence, transport };
}
function resolve(sequence: TimelineStub['shaderSequence'], transport: PlaybackTransport, atMs = nowMs) {
  return resolveShaderTimelineState({
    ...sequence, shaders,
    steps: getEffectiveTimelinePlaybackSteps({ ...sequence, pinnedStepId: sequence.pinnedStepId ?? null }),
    timeSeconds: getTransportTimeSeconds(transport, atMs), loop: transport.loop, randomSeedSalt,
  })!;
}
function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} should equal ${expected}`);
}
function retime(state: ReturnType<typeof fixture>, duration: number) {
  return updateTimelineTiming({ ...state, shaders, randomSeedSalt, nowMs, patch: { sharedSectionDurationSeconds: duration } });
}

test('regression: editing duration must not reinterpret the old time as another clip', () => {
  const state = fixture('sequence', 18);
  const before = resolve(state.sequence, state.transport);
  const oldBehavior = updateTimelineSharedSettings(state.sequence, { sharedSectionDurationSeconds: 12 });
  assert.notEqual(resolve(oldBehavior, state.transport).currentStep.id, before.currentStep.id);
  const result = retime(state, 12);
  assert.equal(resolve(result.sequence, result.transport).currentStep.id, before.currentStep.id);
});

for (const mode of ['sequence', 'random', 'randomMix', 'double'] as const) {
  for (const isPlaying of [false, true]) {
    test(`repeated Clip edits preserve the shader, random cycle, blend and animation in ${mode}, playing=${isPlaying}`, () => {
      let state = fixture(mode, 87, isPlaying);
      const before = resolve(state.sequence, state.transport);
      const renderTime = getRenderTimeSeconds(state.transport, nowMs);
      assert.equal(before.isTransitioning, true);
      for (const duration of [25, 0.5, 600, 1.5, 8]) {
        state = retime(state, duration);
        const after = resolve(state.sequence, state.transport);
        assert.equal(after.currentStep.id, before.currentStep.id);
        assert.equal(after.nextStep?.id, before.nextStep?.id);
        assert.equal(after.cycleIndex, before.cycleIndex);
        near(after.transitionProgress, before.transitionProgress);
        near(getRenderTimeSeconds(state.transport, nowMs), renderTime);
        near(getRenderTimeSeconds(state.transport, nowMs + 500), renderTime + (isPlaying ? 0.75 : 0));
        assert.equal(state.transport.isPlaying, isPlaying);
        assert.equal(state.transport.playbackRate, 1.5);
        assert.equal(state.sequence.focusedStepId, 'c');
        assert.ok(state.sequence.sharedTransitionDurationSeconds <= duration);
      }
    });
  }
}

test('changing duration during the solo section keeps the current shader and resumes normal advancement', () => {
  const state = fixture('sequence', 82, true);
  const before = resolve(state.sequence, state.transport);
  const result = retime(state, 12);
  const after = resolve(result.sequence, result.transport);
  assert.equal(after.currentStep.id, before.currentStep.id);
  assert.equal(after.isTransitioning, false);
  near(after.localTimeSeconds / after.transitionStartSeconds, before.localTimeSeconds / before.transitionStartSeconds);
  const remainingMs = (after.currentStep.durationSeconds - after.localTimeSeconds) / result.transport.playbackRate * 1000;
  assert.equal(resolve(result.sequence, result.transport, nowMs + remainingMs + 1).currentStep.id, after.nextStep?.id);
});

test('pinned, disabled and missing shaders do not shift the preserved position', () => {
  const state = fixture('random', 27);
  state.sequence.pinnedStepId = 'a';
  state.sequence.steps[1].disabled = true;
  state.sequence.steps.push({ ...state.sequence.steps[0], id: 'missing', shaderId: 'missing' });
  const before = resolve(state.sequence, state.transport);
  const result = retime(state, 5);
  const after = resolve(result.sequence, result.transport);
  assert.equal(after.currentStep.id, before.currentStep.id);
  assert.equal(after.nextStep?.id, before.nextStep?.id);
  assert.equal(after.cycleIndex, before.cycleIndex);
  assert.equal(result.sequence.steps, state.sequence.steps);
  assert.equal(result.sequence.pinnedStepId, 'a');
});

test('focused repeat preserves the selected shader, phase and render clock', () => {
  const state = fixture('random', 85, true);
  state.sequence.singleStepLoopEnabled = true;
  state.sequence.stagePreviewMode = 'focused';
  const before = resolve(state.sequence, state.transport);
  const result = retime(state, 17);
  const after = resolve(result.sequence, result.transport);
  assert.equal(after.currentStep.id, 'c');
  assert.equal(after.nextStep, null);
  assert.equal(after.cycleIndex, before.cycleIndex);
  near(after.localTimeSeconds / 17, before.localTimeSeconds / 8);
  near(getRenderTimeSeconds(result.transport, nowMs), getRenderTimeSeconds(state.transport, nowMs));
  assert.equal(result.sequence.singleStepLoopEnabled, true);
});

test('non-looping playback preserves the current clip and keeps an ended timeline at its new end', () => {
  for (const timeSeconds of [18, 32, 45]) {
    const state = fixture('sequence', timeSeconds);
    state.transport.loop = false;
    const before = resolve(state.sequence, state.transport);
    const result = retime(state, 5);
    const after = resolve(result.sequence, result.transport);
    assert.equal(after.currentStep.id, before.currentStep.id);
    assert.equal(result.transport.loop, false);
    if (timeSeconds >= 32) {
      assert.equal(getTransportTimeSeconds(result.transport, nowMs), 20);
      assert.equal(after.localTimeSeconds, 5);
    }
  }
});

test('exact clip starts and times just before a boundary stay on the same shader', () => {
  for (const timeSeconds of [0, 8, 15.9999, 32, 80, 95.9999]) {
    const state = fixture('random', timeSeconds);
    const before = resolve(state.sequence, state.transport);
    for (const duration of [0.5, 3.37, 600]) {
      const result = retime(state, duration);
      const after = resolve(result.sequence, result.transport);
      assert.equal(after.currentStep.id, before.currentStep.id);
      assert.equal(after.cycleIndex, before.cycleIndex);
    }
  }
});

test('Mix-only changes and audio-reactive timing do not seek the timeline', () => {
  const state = fixture();
  const result = updateTimelineTiming({ ...state, shaders, nowMs, patch: { sharedTransitionDurationSeconds: 3 } });
  assert.equal(result.transport, state.transport);
  assert.equal(result.sequence.sharedTransitionDurationSeconds, 3);
  const audio = fixture('audioReactive');
  const audioResult = retime(audio, 12);
  assert.equal(audioResult.transport, audio.transport);
  assert.equal(audioResult.sequence.sharedSectionDurationSeconds, 12);
});

test('empty timelines apply Clip settings without seeking', () => {
  const state = fixture();
  state.sequence.steps = [];
  const result = retime(state, 12);
  assert.equal(result.transport, state.transport);
  assert.equal(result.sequence.sharedSectionDurationSeconds, 12);
});
