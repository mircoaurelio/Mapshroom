import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewQueue } from '../../src/lib/surfaceMapping/preview-queue.js';

test('rapid control changes send only the latest pending render and never display stale frames', () => {
  const sent = [], displayed = [];
  const queue = createPreviewQueue(job => sent.push(job), reply => displayed.push(reply));
  queue.request({ palette: 'thermal' });
  for (let angle = 0; angle < 100; angle++) queue.request({ angle });
  assert.equal(sent.length, 1, 'UI changes must not create a worker message backlog');
  queue.complete({ requestId: 1, pixels: 'obsolete' });
  assert.equal(displayed.length, 0);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].angle, 99);
  queue.complete({ requestId: sent[1].requestId, pixels: 'current' });
  assert.deepEqual(displayed.map(reply => reply.pixels), ['current']);
});

test('a disposed analysis rejects late replies and duplicate replies cannot consume the current job', () => {
  const sent = [], displayed = [];
  const queue = createPreviewQueue(job => sent.push(job), reply => displayed.push(reply));
  queue.request({ output: 'gradient' });
  queue.request({ output: 'mask' });
  queue.complete({ requestId: 1 });
  queue.complete({ requestId: 1 });
  assert.equal(displayed.length, 0);
  assert.equal(sent.length, 2);
  queue.dispose();
  queue.complete({ requestId: 2 });
  queue.request({ output: 'edges' });
  assert.equal(displayed.length, 0);
  assert.equal(sent.length, 2);
});
