import assert from 'node:assert/strict';
import test from 'node:test';
import { enableTimelineStep } from '../src/lib/enableTimelineStep.ts';
import { getRenderTimeSeconds, getTransportTimeSeconds } from '../src/lib/clock.ts';
import { getEffectiveTimelinePlaybackSteps, resolveShaderTimelineState } from '../src/lib/timeline.ts';
import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';
import type { PlaybackTransport, SavedShader, TimelineStub } from '../src/types.ts';

const shaders: SavedShader[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, code: 'void main() {}' }));
const nowMs = 5000;
const randomSeedSalt = 'random:restore-test';
function fixture(mode: TimelineStub['shaderSequence']['mode'] = 'sequence') {
  const sequence: TimelineStub['shaderSequence'] = {
    enabled: true, mode, editorView: 'advanced', stagePreviewMode: 'timeline',
    focusedStepId: 'c', pinnedStepId: null, randomSeedToken: 'restore-test',
    singleStepLoopEnabled: false, randomChoiceEnabled: false, manualSelectionTransition: 'cut',
    sharedTransitionEnabled: true, sharedTransitionEffect: 'mix',
    sharedTransitionDurationSeconds: 0.75, sharedSectionDurationSeconds: 8,
    steps: shaders.map(({ id }, index) => ({
      id, shaderId: id, disabled: id === 'a', durationSeconds: 5 + index,
      transitionDurationSeconds: 0.75, transitionEffect: 'mix',
      assetSettings: normalizeTimelineStepAssetSettings(),
    })),
  };
  const transport: PlaybackTransport = {
    currentTimeSeconds: 9, isPlaying: true, anchorTimestampMs: 3000,
    playbackRate: 1, loop: true, renderTimeOffsetSeconds: 4,
  };
  return { sequence, transport };
}
function resolve(sequence: TimelineStub['shaderSequence'], transport: PlaybackTransport) {
  return resolveShaderTimelineState({
    ...sequence, shaders,
    steps: getEffectiveTimelinePlaybackSteps({ ...sequence, pinnedStepId: sequence.pinnedStepId ?? null }),
    timeSeconds: getTransportTimeSeconds(transport, nowMs), loop: transport.loop, randomSeedSalt,
  })!;
}

for (const mode of ['sequence', 'random', 'randomMix', 'double'] as const) {
  for (const isPlaying of [false, true]) {
    test(`enabling preserves the current shader and animation in ${mode}, playing=${isPlaying}`, () => {
      const { sequence, transport } = fixture(mode);
      transport.isPlaying = isPlaying;
      transport.currentTimeSeconds = 81.25;
      const before = resolve(sequence, transport);
      const result = enableTimelineStep({ sequence, transport, shaders, stepId: 'a', randomSeedSalt, nowMs });
      const after = resolve(result.sequence, result.transport);
      assert.equal(result.sequence.steps[0].disabled, false);
      assert.equal(sequence.steps[0].disabled, true);
      assert.equal(result.sequence.focusedStepId, 'c');
      assert.equal(result.sequence.stagePreviewMode, sequence.stagePreviewMode);
      assert.equal(result.sequence.singleStepLoopEnabled, false);
      assert.equal(after.currentStep.id, before.currentStep.id);
      assert.ok(Math.abs(after.localTimeSeconds - before.localTimeSeconds) < 0.00001);
      assert.equal(after.cycleIndex, before.cycleIndex);
      assert.equal(result.transport.isPlaying, isPlaying);
      assert.equal(getRenderTimeSeconds(result.transport, nowMs), getRenderTimeSeconds(transport, nowMs));
    });
  }
}

test('enabling another shader leaves focused repeat and its local phase intact', () => {
  const { sequence, transport } = fixture();
  sequence.singleStepLoopEnabled = true;
  sequence.stagePreviewMode = 'focused';
  const before = resolve(sequence, transport);
  const result = enableTimelineStep({ sequence, transport, shaders, stepId: 'a', nowMs });
  const after = resolve(result.sequence, result.transport);
  assert.equal(after.currentStep.id, 'c');
  assert.equal(after.localTimeSeconds, before.localTimeSeconds);
  assert.equal(result.sequence.stagePreviewMode, 'focused');
  assert.equal(result.sequence.singleStepLoopEnabled, true);
});

test('enabling keeps pinned shaders and other steps unchanged', () => {
  const { sequence, transport } = fixture();
  sequence.pinnedStepId = 'd';
  const result = enableTimelineStep({ sequence, transport, shaders, stepId: 'a', nowMs });
  assert.equal(result.sequence.pinnedStepId, 'd');
  assert.deepEqual(result.sequence.steps.slice(1), sequence.steps.slice(1));
  assert.equal(resolve(result.sequence, result.transport).currentStep.id, resolve(sequence, transport).currentStep.id);
});

test('missing or already enabled steps are a no-op', () => {
  const { sequence, transport } = fixture();
  for (const stepId of ['missing', 'b']) {
    const result = enableTimelineStep({ sequence, transport, shaders, stepId, nowMs });
    assert.equal(result.sequence, sequence);
    assert.equal(result.transport, transport);
  }
});

test('audio restore does not change focused selection, mode or its transport', () => {
  const { sequence, transport } = fixture('audioReactive');
  const result = enableTimelineStep({ sequence, transport, shaders, stepId: 'a', nowMs });
  assert.equal(result.sequence.focusedStepId, 'c');
  assert.equal(result.sequence.mode, 'audioReactive');
  assert.equal(result.transport, transport);
});
