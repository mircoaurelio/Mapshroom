import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseRandomShaderReplacement } from '../src/lib/randomShader.ts';
import type { SavedShader } from '../src/types.ts';

const preset: SavedShader = { id: 'a', name: 'A', code: 'shader A' };
const alternative: SavedShader = { id: 'b', name: 'B', code: 'shader B' };

test('random replacement excludes the current draft source, copies and unavailable shaders', () => {
  const draft = { ...preset, id: 'draft', code: 'edited A', sourceShaderId: 'a', isTemporary: true };
  const pool = [
    preset,
    draft,
    { ...draft, id: 'copy', isTemporary: false },
    { ...preset, id: 'same-code', code: ' edited A ' },
    { ...alternative, id: 'temporary', isTemporary: true },
    { ...alternative, id: 'broken', compileError: 'Invalid shader' },
    { ...alternative, id: 'empty', code: ' ' },
    alternative,
  ];
  assert.equal(chooseRandomShaderReplacement(pool, draft, () => 0), alternative);
  assert.equal(chooseRandomShaderReplacement(pool, draft, () => 0.999), alternative);
});

test('random replacement can choose either end of the eligible pool without mutating it', () => {
  const third = { id: 'c', name: 'C', code: 'shader C' };
  const pool = [preset, alternative, third];
  const original = structuredClone(pool);
  assert.equal(chooseRandomShaderReplacement(pool, preset, () => 0), alternative);
  assert.equal(chooseRandomShaderReplacement(pool, preset, () => 0.999), third);
  assert.deepEqual(pool, original);
  assert.equal(chooseRandomShaderReplacement(pool, undefined, () => 0), preset);
});

test('random replacement has no fallback to the same shader when no alternative exists', () => {
  assert.equal(chooseRandomShaderReplacement([], preset), undefined);
  assert.equal(chooseRandomShaderReplacement([preset], preset), undefined);
});
