import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ThumbnailQueue } from '../src/lib/thumbnailQueue.ts';
import { shaderThumbnailKey } from '../src/lib/shaderThumbnailKey.ts';

test('snapshot identity reuses normalized source and uniform ordering, invalidates visual changes', () => {
  const key = shaderThumbnailKey('code\r\nline', { speed: 2, tint: [1, .5, 0] });
  assert.equal(key, shaderThumbnailKey('code\nline', { tint: [1, .5, 0], speed: 2 }));
  assert.notEqual(key, shaderThumbnailKey('code\nline', { speed: 3, tint: [1, .5, 0] }));
  assert.notEqual(key, shaderThumbnailKey('new code', { speed: 2, tint: [1, .5, 0] }));
});

test('two consumers share one render and cancelling one does not cancel the other', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let renders = 0, idle = 0;
  const queue = new ThumbnailQueue(() => gate, () => { idle++; });
  const first = new AbortController(), second = new AbortController();
  const render = async () => { renders++; return 'snapshot'; };
  const a = queue.request('same', first.signal, render);
  const b = queue.request('same', second.signal, render);
  first.abort(); release();
  assert.equal(await a, null);
  assert.equal(await b, 'snapshot');
  assert.equal(renders, 1);
  assert.equal(idle, 1);
});

test('invisible queued work never renders, exceptions do not block the next card', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const queue = new ThumbnailQueue(() => gate);
  const hidden = new AbortController();
  let hiddenRenders = 0;
  const a = queue.request('hidden', hidden.signal, async () => { hiddenRenders++; return 'hidden'; });
  const b = queue.request('broken', new AbortController().signal, async () => { throw new Error('GL unavailable'); });
  const c = queue.request('next', new AbortController().signal, async () => 'next');
  hidden.abort(); release();
  assert.deepEqual(await Promise.all([a, b, c]), [null, null, 'next']);
  assert.equal(hiddenRenders, 0);
});

test('different snapshots are rendered serially and inactive compilation is observable', async () => {
  const queue = new ThumbnailQueue(async () => {});
  const first = new AbortController();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const began = new Promise<void>(resolve => { started = resolve; });
  const calls: string[] = [];
  const a = queue.request('a', first.signal, async active => {
    calls.push('a:start'); started(); await gate;
    assert.equal(active(), false); calls.push('a:end'); return null;
  });
  await began;
  const b = queue.request('b', new AbortController().signal, async () => { calls.push('b'); return 'b'; });
  first.abort(); release();
  assert.deepEqual(await Promise.all([a, b]), [null, 'b']);
  assert.deepEqual(calls, ['a:start', 'a:end', 'b']);
});

test('every generated catalog entry has a packaged WebP and no rendering error', () => {
  const root = new URL('../', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('public/assets/shader-thumbnails/catalog.json', root), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('src/lib/shaderThumbnailManifest.json', root), 'utf8'));
  assert.ok(catalog.length > 700);
  for (const item of catalog) {
    assert.equal(item.error, undefined, item.name);
    assert.ok(manifest[item.key], item.name);
  }
  for (const item of Object.values(manifest) as { file: string }[]) {
    const bytes = readFileSync(new URL(`public/assets/shader-thumbnails/${item.file}`, root));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', item.file);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', item.file);
  }
});
