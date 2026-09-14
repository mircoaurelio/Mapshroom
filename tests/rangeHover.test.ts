import assert from 'node:assert/strict';
import test from 'node:test';
import { rangeValueAtPosition } from '../src/lib/rangeHover.ts';

test('hover preview accounts for the native thumb width and clamps both ends', () => {
  assert.equal(rangeValueAtPosition(-10, 108, 0, 5, 0.005), 0);
  assert.equal(rangeValueAtPosition(4, 108, 0, 5, 0.005), 0);
  assert.equal(rangeValueAtPosition(54, 108, 0, 5, 0.005), 2.5);
  assert.equal(rangeValueAtPosition(104, 108, 0, 5, 0.005), 5);
  assert.equal(rangeValueAtPosition(200, 108, 0, 5, 0.005), 5);
});

test('hover rounds from min to a reachable step, including decimal and negative ranges', () => {
  assert.equal(rangeValueAtPosition(55, 108, 1, 10, 2), 5);
  assert.equal(rangeValueAtPosition(108, 108, 1, 10, 2), 9);
  assert.equal(rangeValueAtPosition(54, 108, -2, 2, 0.1), 0);
  assert.equal(rangeValueAtPosition(29, 108, 0.1, 0.5, 0.01), 0.2);
});

test('vertical/RTL ranges reverse hover values and step-any preserves continuous values', () => {
  assert.equal(rangeValueAtPosition(4, 108, 0, 360, 1, true), 360);
  assert.equal(rangeValueAtPosition(104, 108, 0, 360, 1, true), 0);
  assert.equal(rangeValueAtPosition(29, 108, 0, 1, 'any'), 0.25);
  assert.equal(rangeValueAtPosition(20, 1, 2, 2, 0.1), 2);
});
