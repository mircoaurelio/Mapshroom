import test from 'node:test';
import assert from 'node:assert/strict';
import { latestVariant, planVariantGeneration, readVariantPreferences } from '../src/lib/assetVariantGeneration.ts';
import { defaultVariantKinds, type AssetVariantKind } from '../src/lib/assetVariants.ts';
import type { AssetRecord } from '../src/types';

const original = { id: 'photo', kind: 'image', name: 'Photo.png', lastModified: 1 } as AssetRecord;
const variant = (kind: AssetVariantKind, id = kind as string, lastModified = 2): AssetRecord => ({
  ...original, id, lastModified, derivation: { sourceAssetId: original.id, kind },
});
const enabled = { useBackgroundSource: true, allowDepth: true };

test('a saved background-source choice survives reopening with other preferences intact', () => {
  const saved = { outputs: ['depth', 'segmentation'], automatic: false, useBackgroundSource: true };
  const restored = readVariantPreferences(JSON.stringify(saved));
  assert.equal(restored.useBackgroundSource, true);
  assert.equal(restored.automatic, false);
  assert.deepEqual(new Set(restored.outputs), new Set(saved.outputs));
  assert.equal(readVariantPreferences(JSON.stringify({ ...restored, useBackgroundSource: false })).useBackgroundSource, false);
});

test('new, older and invalid preferences default to the cutout while preserving saved opt-out', () => {
  assert.equal(readVariantPreferences('{').useBackgroundSource, true);
  assert.deepEqual(readVariantPreferences(null).outputs, defaultVariantKinds);
  assert.deepEqual(readVariantPreferences('{"outputs":["depth","invalid"],"automatic":false}'), {
    outputs: ['depth'], automatic: false, useBackgroundSource: true,
  });
});

test('an isolated depth request creates the cutout first even when background is not an enabled output', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original], ['depth'], enabled), [
    { input: 'original', outputs: ['background'] }, { input: 'background', outputs: ['depth'] },
  ]);
});

test('all dependent outputs use one cutout and keep it attached to the same original', () => {
  const plan = planVariantGeneration(original.id, [original], ['edges', 'gradient', 'segmentation', 'field', 'depth'], enabled);
  assert.deepEqual(plan.map(batch => batch.input), ['original', 'background']);
  assert.deepEqual(plan[0].outputs, ['background']);
  assert.deepEqual(new Set(plan[1].outputs), new Set(['edges', 'gradient', 'segmentation', 'field', 'depth']));
});

test('an existing manually adjusted cutout is reused without overwriting it', () => {
  const cutout = variant('background');
  assert.deepEqual(planVariantGeneration(original.id, [original, cutout], defaultVariantKinds, enabled), [
    { input: 'background', outputs: ['segmentation', 'gradient', 'depth'] },
  ]);
});

test('regeneration can replace existing derived outputs while reusing the saved cutout', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original, variant('background'), variant('gradient')], ['gradient'], { ...enabled, regenerate: true }), [
    { input: 'background', outputs: ['gradient'] },
  ]);
});

test('explicit background regeneration runs before requested dependent regenerations', () => {
  const plan = planVariantGeneration(original.id, [original, variant('background'), variant('depth')], ['depth', 'background'], { ...enabled, regenerate: true });
  assert.deepEqual(plan, [{ input: 'original', outputs: ['background'] }, { input: 'background', outputs: ['depth'] }]);
});

test('concurrent requests share an already queued cutout and do not duplicate outputs', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original], ['background', 'depth', 'gradient'], {
    ...enabled, occupied: new Set(['background', 'gradient']),
  }), [{ input: 'background', outputs: ['depth'] }]);
});

test('disabling the preference sends all outputs the original even when a cutout exists', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original, variant('background')], ['gradient', 'depth'], {
    useBackgroundSource: false, allowDepth: true,
  }), [{ input: 'original', outputs: ['gradient', 'depth'] }]);
});

test('changing preferences does not regenerate existing outputs and blocked depth adds no background job', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original, variant('depth')], ['depth'], enabled), []);
  assert.deepEqual(planVariantGeneration(original.id, [original], ['depth'], { ...enabled, allowDepth: false }), []);
});

test('background removal itself always starts from the original and never creates a dependency cycle', () => {
  assert.deepEqual(planVariantGeneration(original.id, [original, variant('background')], ['background'], { ...enabled, regenerate: true }), [
    { input: 'original', outputs: ['background'] },
  ]);
});

test('the latest edited cutout wins even when updated in place earlier in the library', () => {
  const edited = variant('background', 'edited', 8), old = variant('background', 'old', 3);
  const otherPhoto = { ...variant('background', 'unrelated', 10), derivation: { sourceAssetId: 'another-photo', kind: 'background' as const } };
  assert.equal(latestVariant([original, edited, old, otherPhoto], original.id, 'background')?.id, edited.id);
});
