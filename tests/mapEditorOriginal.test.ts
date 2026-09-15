import assert from 'node:assert/strict';
import test from 'node:test';
import type { AssetRecord } from '../src/types.ts';
import { mapEditorOriginalForAsset } from '../src/lib/assetVariants.ts';

function asset(id: string, derivation?: AssetRecord['derivation']): AssetRecord {
  return { id, name: `${id}.png`, kind: 'image', mimeType: 'image/png', size: 8, lastModified: 1, createdAt: '', sourceType: 'uploaded', derivation };
}
const original = asset('original');
const firstMask = asset('first-mask', { kind: 'background', sourceAssetId: original.id, inputAssetId: original.id });
const revisedMask = asset('revised-mask', { kind: 'background', sourceAssetId: original.id, inputAssetId: firstMask.id });
const depth = asset('depth', { kind: 'depth', sourceAssetId: original.id, inputAssetId: revisedMask.id });
const assets = [original, firstMask, revisedMask, depth];

test('background versions compare with the original photo across repeated edits', () => {
  assert.equal(mapEditorOriginalForAsset(firstMask, assets), original);
  assert.equal(mapEditorOriginalForAsset(revisedMask, assets), original);
});

test('depth keeps its inference input as the comparison source', () => {
  assert.equal(mapEditorOriginalForAsset(depth, assets), revisedMask);
});

test('depth falls back to the original when its inference input is missing', () => {
  assert.equal(mapEditorOriginalForAsset(depth, [original, depth]), original);
});

test('missing originals and source images do not compare with the result itself', () => {
  assert.equal(mapEditorOriginalForAsset(firstMask, [firstMask]), null);
  assert.equal(mapEditorOriginalForAsset(original, assets), null);
  assert.equal(mapEditorOriginalForAsset(null, assets), null);
});
