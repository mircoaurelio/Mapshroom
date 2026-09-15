import assert from 'node:assert/strict';
import test from 'node:test';
import { audioRangeBoundAtValue, clampAudioRangeBound } from '../src/lib/audioRange.ts';
import { rangeValueAtPosition } from '../src/lib/rangeHover.ts';

test('track clicks to the left/right expand only the respective endpoint', () => {
  for (const [x, bound, expected] of [[14, 'min', 10], [94, 'max', 90]] as const) {
    const value = rangeValueAtPosition(x, 108, 0, 100, 1);
    assert.equal(audioRangeBoundAtValue(value, 30, 70), bound);
    assert.equal(clampAudioRangeBound(bound, value, 30, 70, 0, 100), expected);
  }
});

test('inside clicks choose the nearest endpoint and a deterministic midpoint', () => {
  assert.equal(audioRangeBoundAtValue(40, 30, 70), 'min');
  assert.equal(audioRangeBoundAtValue(60, 30, 70), 'max');
  assert.equal(audioRangeBoundAtValue(50, 30, 70), 'min');
});

test('coincident endpoints can reopen towards either side, including domain edges', () => {
  assert.equal(audioRangeBoundAtValue(49, 50, 50), 'min');
  assert.equal(audioRangeBoundAtValue(51, 50, 50), 'max');
  assert.equal(audioRangeBoundAtValue(1, 0, 0), 'max');
  assert.equal(audioRangeBoundAtValue(99, 100, 100), 'min');
});

test('dragging cannot cross the other bound and can return without switching endpoints', () => {
  assert.equal(clampAudioRangeBound('min', 90, 30, 70, 0, 100), 70);
  assert.equal(clampAudioRangeBound('min', 40, 70, 70, 0, 100), 40);
  assert.equal(clampAudioRangeBound('max', 10, 30, 70, 0, 100), 30);
  assert.equal(clampAudioRangeBound('max', 60, 30, 30, 0, 100), 60);
  assert.equal(clampAudioRangeBound('min', -100, 30, 70, 0, 100), 0);
  assert.equal(clampAudioRangeBound('max', 200, 30, 70, 0, 100), 100);
});

test('negative domains, fractional steps and zero-width domains remain bounded', () => {
  const value = rangeValueAtPosition(29, 108, -2, 2, 0.01);
  assert.equal(value, -1);
  assert.equal(audioRangeBoundAtValue(value, -0.5, 0.5), 'min');
  assert.equal(clampAudioRangeBound('min', value, -0.5, 0.5, -2, 2), -1);
  assert.equal(clampAudioRangeBound('max', 10, 2, 2, 2, 2), 2);
});
