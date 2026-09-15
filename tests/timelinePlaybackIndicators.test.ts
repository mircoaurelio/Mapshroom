import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTimelinePlaybackStore,
  getTimelineBorderStyle,
  mergeTimelinePlaybackProgress,
} from '../src/lib/timelinePlaybackIndicators.ts';

test('Double shows both incoming shaders and preserves a current shader shared by the layers', () => {
  const primary = { playbackProgress: { a: 1, b: 0.25 } };
  const secondary = { playbackProgress: { c: 1, d: 0.75 } };
  assert.deepEqual(mergeTimelinePlaybackProgress([primary, secondary]), { a: 1, b: 0.25, c: 1, d: 0.75 });
  const overlap = { playbackProgress: { b: 1, a: 0.1 } };
  assert.deepEqual(mergeTimelinePlaybackProgress([primary, overlap]), { a: 1, b: 1 });
  assert.deepEqual(mergeTimelinePlaybackProgress([overlap, primary]), { a: 1, b: 1 });
});

test('incoming border starts invisible, warms to red, and finishes uniformly red', () => {
  assert.equal(getTimelineBorderStyle(0).opacity, 0);
  assert.deepEqual(getTimelineBorderStyle(0.5), {
    opacity: 0.5,
    background: 'linear-gradient(135deg, rgb(244, 107, 55), rgb(239, 68, 68))',
  });
  assert.deepEqual(getTimelineBorderStyle(1), {
    opacity: 1,
    background: 'linear-gradient(135deg, rgb(239, 68, 68), rgb(239, 68, 68))',
  });
  assert.equal(getTimelineBorderStyle(-1).opacity, 0);
  assert.equal(getTimelineBorderStyle(2).opacity, 1);
  assert.equal(getTimelineBorderStyle(NaN).opacity, 0);
});

test('handoff removes the previous shader, preserves zero for a waiting shader, and supports scrubbing', () => {
  const store = createTimelinePlaybackStore();
  let updates = 0;
  const unsubscribe = store.subscribe(() => { updates++; });
  store.publish({ a: 1, b: 0 });
  assert.equal(store.getProgress('b'), 0);
  store.publish({ a: 1, b: 0.8 });
  store.publish({ a: 1, b: 0.2 });
  assert.equal(store.getProgress('b'), 0.2);
  store.publish({ b: 1, c: 0 });
  assert.equal(store.getProgress('a'), null);
  assert.equal(store.getProgress('b'), 1);
  store.publish({ c: 0, b: 1 });
  assert.equal(updates, 4);
  store.publish({});
  assert.equal(store.getProgress('b'), null);
  unsubscribe();
  store.publish({ c: 1 });
  assert.equal(updates, 5);
});
