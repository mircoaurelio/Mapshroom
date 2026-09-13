import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceManualShaderMix, type ManualShaderMixState } from '../src/lib/manualShaderMix.ts';

function select(
  previous: ManualShaderMixState<string> | null,
  key: string | null,
  nowMs: number,
  ready = true,
  durationSeconds = 2,
  layer = key ?? 'timeline',
  enabled = true,
) {
  return advanceManualShaderMix(previous, {
    enabled, selectionKey: key, layer, nowMs, durationSeconds, effect: 'radial', isReady: () => ready,
  });
}

test('manual selection enters with the configured radial mix for the full two seconds', () => {
  const playing = select(null, null, 0);
  const clicked = select(playing, 'B', 100);
  assert.equal(clicked.mix?.from, 'timeline');
  assert.equal(clicked.mix?.effect, 'radial');
  assert.equal(clicked.mix?.progress, 0);
  const halfway = select(clicked, 'B', 1100);
  assert.equal(halfway.mix?.progress, 0.5);
  const held = select(halfway, 'B', 2100);
  assert.equal(held.layer, 'B');
  assert.equal(held.mix, null);
  assert.equal(select(held, 'B', 12100).mix, null);
});

test('the editing canvas cuts immediately while the output keeps its long mix', () => {
  const previous = select(null, 'A', 0);
  const canvas = select(previous, 'B', 100, false, 120, 'B', false);
  assert.equal(canvas.layer, 'B');
  assert.equal(canvas.mix, null, 'the canvas does not wait for a transition program');
  const nextClick = select(canvas, 'C', 200, false, 120, 'C', false);
  assert.equal(nextClick.layer, 'C');
  assert.equal(nextClick.mix, null);

  const output = select(previous, 'B', 100, true, 120);
  assert.equal(output.layer, 'A');
  assert.equal(output.mix?.durationSeconds, 120);
  assert.equal(select(output, 'B', 60100, true, 120).mix?.progress, 0.5);
  assert.equal(select(output, 'B', 120100, true, 120).layer, 'B');
});

test('disabling selection fades drops any pending or active mix immediately', () => {
  const previous = select(null, 'A', 0);
  for (const ready of [false, true]) {
    const mixing = select(previous, 'B', 100, ready, 120);
    const canvas = select(mixing, 'C', 500, false, 120, 'C', false);
    assert.equal(canvas.layer, 'C');
    assert.equal(canvas.mix, null);
  }
});

test('shader compilation and media loading do not consume the mix duration', () => {
  const a = select(null, 'A', 0);
  const waiting = select(a, 'B', 100, false);
  assert.equal(waiting.layer, 'A');
  const stillWaiting = select(waiting, 'B', 5100, false);
  assert.equal(stillWaiting.mix?.startedAtMs, null);
  assert.equal(stillWaiting.mix?.progress, 0);
  const ready = select(stillWaiting, 'B', 6100);
  assert.equal(ready.mix?.progress, 0);
  assert.equal(select(ready, 'B', 7100).mix?.progress, 0.5);
  assert.equal(select(ready, 'B', 8100).mix, null);
});

test('repeat changes mix too, while reselecting or editing the held shader does not restart', () => {
  const a = select(null, 'A', 0);
  assert.equal(select(a, 'A', 100).mix, null);
  const b = select(a, 'B', 200);
  const edited = select(b, 'B', 1200, true, 2, 'B edited');
  assert.equal(edited.mix?.progress, 0.5);
  assert.equal(edited.mix?.to, 'B edited');
});

test('rapid clicks finish the active fade and then mix to the most recent selection', () => {
  const a = select(null, 'A', 0);
  const b = select(a, 'B', 100);
  const c = select(b, 'C', 500);
  const d = select(c, 'D', 800);
  assert.equal(d.mix?.to, 'B');
  const latest = select(d, 'D', 2100);
  assert.equal(latest.mix?.from, 'B');
  assert.equal(latest.mix?.to, 'D');
  assert.equal(latest.mix?.progress, 0);
  assert.equal(select(latest, 'D', 4100).layer, 'D');
});

test('zero duration cuts immediately and exiting repeat cancels a pending manual mix', () => {
  const a = select(null, 'A', 0);
  assert.equal(select(a, 'B', 100, true, 0).mix, null);
  const b = select(a, 'B', 100);
  assert.equal(select(b, 'C', 500, true, 0).layer, 'C');
  assert.equal(select(b, 'C', 500, true, 0).mix, null);
  const resumed = select(b, null, 500);
  assert.equal(resumed.mix, null);
  assert.equal(resumed.layer, 'timeline');
});

test('a new selection replaces a destination that has not finished compiling', () => {
  const a = select(null, 'A', 0);
  const b = select(a, 'B', 100, false);
  const c = select(b, 'C', 400);
  assert.equal(c.mix?.from, 'A');
  assert.equal(c.mix?.to, 'C');
  assert.equal(c.mix?.progress, 0);
  assert.equal(select(c, 'C', 2400).layer, 'C');
});
