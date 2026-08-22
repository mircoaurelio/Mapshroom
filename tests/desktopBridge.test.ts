import assert from 'node:assert/strict';
import test from 'node:test';

test('desktop runtime detection helpers are pure and side-effect free', async () => {
  const runtime = await import('../src/lib/desktop/runtime.ts');
  assert.equal(typeof runtime.isTauri, 'function');
  assert.equal(runtime.isTauri(), false);
});

test('desktop save helpers fall back to browser downloads outside Tauri', async () => {
  const files = await import('../src/lib/desktop/files.ts');
  assert.equal(typeof files.saveTextFile, 'function');
  assert.equal(typeof files.saveBlobFile, 'function');
  assert.equal(typeof files.openExternalUrl, 'function');
});

test('desktop monitor and audio adapters export expected APIs', async () => {
  const desktop = await import('../src/lib/desktop/index.ts');
  assert.equal(typeof desktop.listDesktopMonitors, 'function');
  assert.equal(typeof desktop.openDesktopOutputWindow, 'function');
  assert.equal(typeof desktop.startDesktopAudioCapture, 'function');
  assert.equal(typeof desktop.startDesktopMidiListen, 'function');
  assert.equal(typeof desktop.desktopProxyHttp, 'function');
  assert.equal(typeof desktop.saveDesktopCredential, 'function');
});
