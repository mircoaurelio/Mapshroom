import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

// Run the actual editor message flow, replacing only browser/worker boundaries.
const source = readFileSync(new URL('../segmentation/main.js', import.meta.url), 'utf8')
  .replaceAll('import.meta.url', JSON.stringify('https://mapshroom.test/segmentation/main.js'));

function editor(embedded = true) {
  const messages: Record<string, unknown>[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  const nodes = new Map<string, ReturnType<typeof makeNode>>();
  function makeNode() {
    let pixels = new Uint8ClampedArray();
    return {
      value: '100', checked: false, disabled: false, textContent: '', width: 0, height: 0,
      dataset: { background: 'black', editorPanel: 'depth' },
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {}, querySelector: () => node('strong'),
      getContext: () => ({ putImageData: (image: { data: Uint8ClampedArray }) => { pixels = image.data; } }),
      toBlob: (done: (blob: Blob | null) => void) => done(new Blob([pixels])),
    };
  }
  function node(selector: string) {
    if (!nodes.has(selector)) nodes.set(selector, makeNode());
    return nodes.get(selector)!;
  }
  node('#modelSelect').value = 'manual';
  node('#depthDefinitionRange').value = '0';
  const parent = { postMessage: (message: Record<string, unknown>) => messages.push(message) };
  const context = createContext({
    URL, URLSearchParams, Blob, File, ArrayBuffer, Uint8Array, Uint8ClampedArray, crypto,
    ImageData: class { data: Uint8ClampedArray; constructor(data: Uint8ClampedArray) { this.data = data; } },
    Worker: class { postMessage() {} },
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {},
    document: { querySelector: node, querySelectorAll: () => [], createElement: makeNode, body: node('body'), addEventListener() {} },
    window: { location: { origin: 'https://mapshroom.test', search: embedded ? '?embed=1&panel=depth' : '' }, parent, addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener) },
  });
  runInContext(source, context);
  runInContext(`sourceFile = new File(['image'], 'source.png');
    imageWidth = 2; imageHeight = 1;
    sourcePixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    basePixels = new Uint8ClampedArray(sourcePixels);
    depthMaskAlpha = new Uint8ClampedArray([255, 0]);`, context);
  return {
    run: (code: string) => runInContext(code, context),
    results: () => messages.filter((message) => message.type === 'mapshroom:segmentation-result'),
    complete: () => runInContext(`depthWorker.onmessage({data:{type:'result', pixels:new Uint8Array([200,100]).buffer, width:2,height:1}})`, context),
    ack: (saved: boolean) => listeners.get('message')!({ origin: 'https://mapshroom.test', source: parent, data: { type: 'mapshroom:segmentation-saved', resultKind: 'depth', saved } }),
  };
}

test('depth completion autosaves full-size grayscale pixels with a black background, even after switching panels', async () => {
  const app = editor();
  app.run("document.body.dataset.editorPanel = 'refine'");
  await app.complete();
  const [result] = app.results();
  assert.equal(result.resultKind, 'depth');
  assert.equal(result.automatic, true);
  assert.equal(result.mimeType, 'image/png');
  assert.deepEqual([...new Uint8Array(result.buffer as ArrayBuffer)], [200, 200, 200, 255, 0, 0, 0, 255]);
  assert.equal(typeof result.resultId, 'string');
});

test('depth adjustments reuse the generated asset identity and prevent concurrent duplicate saves', async () => {
  const app = editor();
  await app.complete();
  await app.run('sendCompositeToMapshroom()');
  assert.equal(app.results().length, 1);
  app.ack(true);
  app.run('elements.depthInvert.checked = true');
  await app.run('sendCompositeToMapshroom()');
  const [automatic, manual] = app.results();
  assert.equal(manual.resultId, automatic.resultId);
  assert.equal(manual.automatic, false);
  assert.deepEqual([...new Uint8Array(manual.buffer as ArrayBuffer)], [55, 55, 55, 255, 0, 0, 0, 255]);
});

test('failed storage can retry the same generated depth map without rerunning inference', async () => {
  const app = editor();
  await app.complete();
  app.ack(false);
  await app.run('sendCompositeToMapshroom()');
  assert.equal(app.results().length, 2);
  assert.equal(app.results()[0].resultId, app.results()[1].resultId);
});

test('failed inference does not save an asset and releases the generating state', async () => {
  const app = editor();
  app.run('busy = true');
  await app.run("depthWorker.onmessage({data:{type:'error',message:'Model unavailable'}})");
  assert.equal(app.results().length, 0);
  assert.equal(app.run('busy'), false);
  assert.equal(app.run('elements.generateDepth.disabled'), false);
});

test('standalone depth generation does not send an automatic library save', async () => {
  const app = editor(false);
  await app.complete();
  assert.equal(app.results().length, 0);
});
