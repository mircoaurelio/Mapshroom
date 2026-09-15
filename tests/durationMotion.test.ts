import assert from 'node:assert/strict';
import test from 'node:test';
import { accumulateDurationMotion, clampDurationInput } from '../src/lib/durationInput.ts';

test('drag movement accumulates small events into one-second detents', () => {
  const first = accumulateDurationMotion(0, 10, 24);
  assert.equal(first.steps, 0);
  const second = accumulateDurationMotion(first.remainder, 18, 24);
  assert.deepEqual(second, { steps: 1, remainder: 4 });
  assert.deepEqual(accumulateDurationMotion(second.remainder, 48, 24), { steps: 2, remainder: 4 });
});

test('reversing the wheel responds immediately without unwinding previous partial movement', () => {
  assert.deepEqual(accumulateDurationMotion(23, -24, 24), { steps: -1, remainder: 0 });
  assert.deepEqual(accumulateDurationMotion(-23, 24, 24), { steps: 1, remainder: 0 });
});

test('small trackpad deltas build a notch in either direction', () => {
  assert.deepEqual(accumulateDurationMotion(24, 16, 40), { steps: 1, remainder: 0 });
  assert.deepEqual(accumulateDurationMotion(-24, -16, 40), { steps: -1, remainder: 0 });
});

test('one-second steps preserve saved fractions and stop at clip/mix bounds', () => {
  assert.equal(clampDurationInput(7.5 + 1, 0.5, 600), 8.5);
  assert.equal(clampDurationInput(5.5 + 1, 0, 6), 6);
  assert.equal(clampDurationInput(0.75 - 1, 0, 6), 0);
});
