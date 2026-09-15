import assert from 'node:assert/strict';
import test from 'node:test';
import { ShaderLoadMonitor } from '../src/lib/shaderLoadMonitor.ts';

function session() {
  const monitor = new ShaderLoadMonitor();
  let now = 0;
  function run(duration: number, frameMs = 16.7, gpuMs: number | null = 3, key = 'shader:source:1280x720', valid = true) {
    const end = now + duration;
    let lastQuery = now;
    while (now < end) {
      now += frameMs;
      const query = now - lastQuery >= 200;
      if (query) lastQuery = now;
      monitor.sample({ now, key, frameMs, gpuMs: query ? gpuMs : null, valid });
    }
    return monitor.warning;
  }
  return { monitor, run };
}

test('sustained GPU cost warns even before the whole preview falls below 25 FPS', () => {
  const { run } = session();
  assert.equal(run(2000, 25, 24), null);
  assert.equal(run(3000, 25, 24), 'gpu');
});

test('a cheap shader and an isolated spike do not warn', () => {
  const { run } = session();
  assert.equal(run(5000), null);
  assert.equal(run(100, 100, 90), null);
  assert.equal(run(5000), null);
});

test('without GPU timing, sustained low FPS is described as a slow preview', () => {
  const { run } = session();
  assert.equal(run(6000, 70, null), 'frame');
});

test('low FPS with a cheap GPU draw is not attributed to shader load', () => {
  const { run } = session();
  assert.equal(run(6000, 70, 3), 'frame');
});

test('warning clears after sustained recovery when settings become cheaper', () => {
  const { run } = session();
  assert.equal(run(6000, 50, 35), 'gpu');
  assert.equal(run(500), 'gpu');
  assert.equal(run(5000), null);
});

test('shader, asset, resolution and context changes discard previous measurements', () => {
  for (const key of ['other-shader:source:1280x720', 'shader:other-source:1280x720', 'shader:source:640x360', 'restored-context']) {
    const { run } = session();
    assert.equal(run(6000, 50, 35), 'gpu');
    assert.equal(run(100, 16.7, 3, key), null);
    assert.equal(run(5000, 16.7, 3, key), null);
  }
});

test('hidden or compiling previews discard warnings and warm up on return', () => {
  const { run } = session();
  assert.equal(run(6000, 50, 35), 'gpu');
  assert.equal(run(5000, 500, 300, undefined, false), null);
  assert.equal(run(1500, 50, 35), null);
  assert.equal(run(5000, 50, 35), 'gpu');
});

test('missing and invalid samples do not fabricate GPU load', () => {
  const { monitor, run } = session();
  for (const value of [NaN, Infinity, -10, 0]) {
    monitor.sample({now:1,key:'bad',frameMs:value,gpuMs:100,valid:true});
    assert.equal(monitor.warning,null);
  }
  assert.equal(run(5000,16.7,NaN),null);
});

test('the report uses window measurements and resets them with shader identity', () => {
  const { monitor, run } = session();
  run(6000, 50, 35);
  assert.deepEqual(monitor.measurement, { frameMs: 50, gpuMs: 35 });
  monitor.reset(7000, 'next-shader');
  assert.equal(monitor.measurement, null);
  assert.equal(monitor.warning, null);
});

test('very slow shaders still collect enough samples to trigger a warning', () => {
  const { run } = session();
  assert.equal(run(15000, 350, 320), 'gpu');
});
