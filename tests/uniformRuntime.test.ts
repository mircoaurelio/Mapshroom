import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLiveUniformBindings, createUniformRuntime, prefixLiveUniformBindings, resolveLiveUniformValue,
} from '../src/lib/uniformRuntime.ts';

test('an existing render layer reads the latest drag value without a rebuild', () => {
  const runtime = createUniformRuntime();
  const saved = { speed: 1, enabled: true };
  const bindings = createLiveUniformBindings('shader-a', saved);
  for (const speed of [1.005, 2.5, 4.995, 0]) {
    runtime.set('shader-a', 'speed', speed);
    assert.equal(resolveLiveUniformValue(runtime, bindings.speed, saved.speed), speed);
  }
  runtime.set('shader-a', 'enabled', false);
  assert.equal(resolveLiveUniformValue(runtime, bindings.enabled, true), false);
  assert.deepEqual(saved, { speed: 1, enabled: true }, 'live edits must not mutate saved project data');
  runtime.clear('shader-a');
  assert.equal(resolveLiveUniformValue(runtime, bindings.speed, 0), 0, 'committed values take over after release');
});

test('nested input, overlay, pin and double-mix namespaces keep shader identities separate', () => {
  const runtime = createUniformRuntime();
  let left = createLiveUniformBindings('left', { speed: 1 });
  for (const namespace of ['timeline_input', 'timeline_base', 'timeline_pin', 'timeline_from']) {
    left = prefixLiveUniformBindings({ bindings: left, namespace });
  }
  const right = prefixLiveUniformBindings({ bindings: createLiveUniformBindings('right', { speed: 2 }), namespace: 'timeline_to' });
  const layer = { ...left, ...right };
  runtime.set('left', 'speed', 0.25);
  runtime.set('right', 'speed', 3.75);
  assert.equal(resolveLiveUniformValue(runtime, layer.timeline_from_timeline_pin_timeline_base_timeline_input_speed, 1), 0.25);
  assert.equal(resolveLiveUniformValue(runtime, layer.timeline_to_speed, 2), 3.75);
  assert.equal(resolveLiveUniformValue(runtime, undefined, 0.5), 0.5, 'generated transition parameters stay unchanged');
});

test('control snapshots are stable, isolated by shader, and release their subscriptions', () => {
  const runtime = createUniformRuntime();
  let notifications = 0;
  const unsubscribe = runtime.subscribe(() => notifications++);
  runtime.set('a', 'speed', 1);
  const first = runtime.get('a');
  runtime.set('a', 'speed', 1);
  assert.equal(notifications, 1);
  assert.equal(runtime.get('a'), first);
  runtime.set('b', 'speed', 2);
  assert.equal(runtime.get('a'), first);
  runtime.set('a', 'speed', 3);
  assert.equal(first?.speed, 1, 'previous React snapshots remain immutable');
  unsubscribe();
  runtime.clear('a');
  assert.equal(notifications, 3);
  assert.equal(runtime.get('a'), undefined);
  assert.deepEqual(runtime.get('b'), { speed: 2 });
});

test('live colour values and an absent runtime fall back correctly', () => {
  const runtime = createUniformRuntime();
  const bindings = createLiveUniformBindings('a', { color: [1, 1, 1] });
  runtime.set('a', 'color', [0.2, 0.3, 0.4]);
  assert.deepEqual(resolveLiveUniformValue(runtime, bindings.color, [1, 1, 1]), [0.2, 0.3, 0.4]);
  assert.deepEqual(resolveLiveUniformValue(undefined, bindings.color, [1, 1, 1]), [1, 1, 1]);
});
