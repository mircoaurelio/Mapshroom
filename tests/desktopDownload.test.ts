import assert from 'node:assert/strict';
import test from 'node:test';
import { desktopDownload, parseDownloadRange } from '../workers/growth/src/lib/desktopDownload.ts';

const bytes = new TextEncoder().encode('MZ-test-installer');
function bucket() {
  const metadata = { size: bytes.length, httpEtag: '"test-v1"', writeHttpMetadata() {} };
  return {
    head: async () => metadata,
    get: async (_key: string, options?: { range: { offset: number; length: number } }) => ({
      ...metadata,
      body: new Blob([options ? bytes.slice(options.range.offset, options.range.offset + options.range.length) : bytes]).stream(),
    }),
  } as unknown as R2Bucket;
}

test('installer responses support full downloads, metadata probes and resumable byte ranges', async () => {
  const store = bucket();
  const request = (method = 'GET', headers = {}) => new Request('https://mapshroom.dev/api/download', { method, headers });
  const full = await desktopDownload(request(), store, 'Mapshroom_setup.exe');
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-length'), String(bytes.length));
  assert.match(full.headers.get('content-disposition')!, /attachment; filename="Mapshroom_setup.exe"/);
  assert.equal(full.headers.get('accept-ranges'), 'bytes');
  assert.equal(await full.text(), 'MZ-test-installer');
  const head = await desktopDownload(request('HEAD'), store, 'Mapshroom_setup.exe');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (let retry = 0; retry < 2; retry++) {
    const part = await desktopDownload(request('GET', { Range: 'bytes=3-6' }), store, 'Mapshroom_setup.exe');
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), `bytes 3-6/${bytes.length}`);
    assert.equal(part.headers.get('content-length'), '4');
    assert.equal(await part.text(), 'test');
  }
  const stale = await desktopDownload(request('GET', { Range: 'bytes=3-6', 'If-Range': '"old"' }), store, 'Mapshroom_setup.exe');
  assert.equal(stale.status, 200);
  assert.equal(await stale.text(), 'MZ-test-installer');
  const invalid = await desktopDownload(request('GET', { Range: 'bytes=900-' }), store, 'Mapshroom_setup.exe');
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get('content-range'), `bytes */${bytes.length}`);
});

test('download range parser handles suffixes, open ends and invalid input', () => {
  assert.deepEqual(parseDownloadRange('bytes=-4', 10), { offset: 6, length: 4 });
  assert.deepEqual(parseDownloadRange('bytes=4-', 10), { offset: 4, length: 6 });
  assert.deepEqual(parseDownloadRange('bytes=4-999', 10), { offset: 4, length: 6 });
  for (const value of ['bytes=10-', 'bytes=4-2', 'bytes=-0']) assert.equal(parseDownloadRange(value, 10), 'unsatisfiable');
  for (const value of [null, 'no', 'bytes=-', 'bytes=1-2,4-5']) assert.equal(parseDownloadRange(value, 10), null);
});

test('missing installers return a retryable error', async () => {
  const store = { head: async () => null } as unknown as R2Bucket;
  const response = await desktopDownload(new Request('https://mapshroom.dev/api/download'), store, 'missing.exe');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'download_unavailable');
});
