import assert from 'node:assert/strict';
import test from 'node:test';
import { preserveStageFrame, readStageFrameAspectRatio, replaceStageAsset } from '../src/lib/assetReplacement.ts';
import { createMappingPositionFile, parseMappingPositionFile } from '../src/lib/mappingPosition.ts';
import type { ProjectDocument, StageTransform } from '../src/types';

const mapping: StageTransform = {
  offsetX: 47, offsetY: -31, widthAdjust: 84, heightAdjust: -22,
  precision: 9, rotationDegrees: 7, moveMode: true, rotationLocked: true, showGrid: true, distortMode: true,
  distortion: { topLeft: { x: .07, y: .06 }, topRight: { x: -.08, y: .02 }, bottomRight: { x: -.06, y: -.09 }, bottomLeft: { x: .04, y: -.04 } },
};

function projectFixture(): ProjectDocument {
  return {
    library: { assets: [{ id: 'wide' }, { id: 'tall' }, { id: 'depth' }], activeAssetId: 'wide' },
    playback: { activeAssetId: 'wide', transport: { isPlaying: true, currentTimeSeconds: 12 } },
    mapping: { stageTransform: mapping },
    timeline: { stub: { shaderSequence: { steps: [{ id: 'step', assetSettings: { scaleX: 1.4, offsetX: .23, fitMode: 'stretch' } }] } } },
    studio: { uniformValues: { intensity: .75 } },
  } as unknown as ProjectDocument;
}

test('replacing media preserves calibration, transport, shader controls and step positioning', () => {
  const original = projectFixture();
  const changed = replaceStageAsset(original, 'tall', 2);
  assert.equal(changed.library.activeAssetId, 'tall');
  assert.equal(changed.playback.activeAssetId, 'tall');
  assert.deepEqual(changed.mapping.stageTransform, { ...mapping, referenceAspectRatio: 2 });
  assert.equal(changed.playback.transport, original.playback.transport);
  assert.equal(changed.timeline, original.timeline);
  assert.equal(changed.studio, original.studio);
  assert.equal(original.mapping.stageTransform.referenceAspectRatio, undefined);
  assert.equal(original.library.activeAssetId, 'wide');
  const again = replaceStageAsset(changed, 'depth', .5);
  assert.equal(again.mapping.stageTransform, changed.mapping.stageTransform);
});

test('missing media cannot replace a working asset and removing the final asset preserves mapping', () => {
  const original = projectFixture();
  assert.equal(replaceStageAsset(original, 'deleted', 2), original);
  assert.deepEqual(replaceStageAsset(original, null, 2).mapping.stageTransform, { ...mapping, referenceAspectRatio: 2 });
});

test('frame capture uses undistorted CSS proportions and ignores unavailable dimensions', () => {
  const canvas = { style: { width: '637.25px', height: '318.625px' } } as HTMLCanvasElement;
  assert.equal(readStageFrameAspectRatio(canvas), 2);
  assert.equal(readStageFrameAspectRatio(null), undefined);
  for (const ratio of [0, -1, Infinity, NaN, undefined, null]) assert.equal(preserveStageFrame(mapping, ratio), mapping);
});

test('saved projects and exported positions retain the frame, while old position files still import', () => {
  const changed = replaceStageAsset(projectFixture(), 'tall', 2);
  const reloaded = JSON.parse(JSON.stringify(changed));
  assert.deepEqual(replaceStageAsset(reloaded, 'wide', .5).mapping, changed.mapping);
  const position = parseMappingPositionFile(JSON.stringify(createMappingPositionFile(changed.mapping.stageTransform)));
  assert.equal(position.referenceAspectRatio, 2);
  assert.deepEqual(position.distortion, mapping.distortion);
  const oldPosition = parseMappingPositionFile(JSON.stringify(createMappingPositionFile(mapping)));
  assert.equal(oldPosition.referenceAspectRatio, undefined);
  assert.equal(oldPosition.offsetX, mapping.offsetX);
});
