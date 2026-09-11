import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASSET_DRAG_TYPE,
  captureImageTransfer,
  fetchImageFile,
  getTransferredImageUrl,
  hasImageTransfer,
  imageFileType,
  imageSourceUrl,
  type ImageTransfer,
} from '../src/lib/imageTransfer.ts';

const empty = (): ImageTransfer => ({ files: [], assetId: null, html: '', uriList: '', text: '' });

test('recognizes images from file managers without a MIME type, but excludes non-images', () => {
  assert.equal(imageFileType({ name: 'PHOTO.JPG', type: '' }), 'image/jpeg');
  assert.equal(imageFileType({ name: 'image.webp', type: 'application/octet-stream' }), 'image/webp');
  assert.equal(imageFileType({ name: 'photo.png', type: 'text/html' }), null);
  assert.equal(imageFileType({ name: 'movie.mp4', type: 'video/mp4' }), null);
});

test('accepts direct image sources without interpreting code or unsafe URLs as images', () => {
  assert.equal(imageSourceUrl(' https://example.com/image.png?width=200 '), 'https://example.com/image.png?width=200');
  assert.equal(imageSourceUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  for (const value of ['javascript:alert(1)', 'file:///image.png', 'data:text/html,test', 'https://user:password@example.com/a.png', 'See https://example.com/a.png', 'void main() {}']) {
    assert.equal(imageSourceUrl(value), null, value);
  }
  assert.equal(hasImageTransfer({ ...empty(), text: 'ordinary shader text' }), false);
});

test('captures clipboard files synchronously, including items-only clipboard data', () => {
  const image = new File(['png'], 'sample.png', { type: 'image/png' });
  const values: Record<string, string> = { [ASSET_DRAG_TYPE]: 'existing-image' };
  const data = {
    files: [] as File[],
    items: [{ kind: 'file', getAsFile: () => image }],
    getData: (type: string) => values[type] ?? '',
  } as unknown as DataTransfer;
  const captured = captureImageTransfer(data);
  values[ASSET_DRAG_TYPE] = '';
  assert.deepEqual(captured.files, [image]);
  assert.equal(captured.assetId, 'existing-image');
  assert.equal(hasImageTransfer(captured), true);
});

test('does not duplicate files listed in both DataTransfer files and items', () => {
  const image = new File(['png'], 'sample.png', { type: 'image/png' });
  const captured = captureImageTransfer({
    files: [image], items: [{ kind: 'file', getAsFile: () => image }], getData: () => '',
  } as unknown as DataTransfer);
  assert.equal(captured.files.length, 1);
});

test('handles URI lists with comments and falls back to a pasted direct URL', () => {
  assert.equal(getTransferredImageUrl({ ...empty(), uriList: '# copied image\r\nhttps://example.com/photo.png\r\n' }), 'https://example.com/photo.png');
  assert.equal(getTransferredImageUrl({ ...empty(), text: 'https://example.com/next.webp' }), 'https://example.com/next.webp');
});

test('downloads an image without site credentials and preserves the original bytes', async (t) => {
  const png = new Uint8Array([137, 80, 78, 71]);
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.mode, 'cors');
    return new Response(png, { headers: { 'Content-Type': 'image/png' } });
  });
  const file = await fetchImageFile('https://example.com/photo.png');
  assert.equal(file.name, 'photo.png');
  assert.equal(file.type, 'image/png');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), png);
});

test('rejects page links and gives an actionable error when a host blocks image access', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('<html>page</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(fetchImageFile('https://example.com/page'), /does not contain an image/);
  mock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(fetchImageFile('https://example.com/photo.png'), /Copy image/);
});
