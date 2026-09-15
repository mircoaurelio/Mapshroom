import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

// Execute the real controller with browser/worker boundaries replaced. The
// inspect closure is injected only into this test's VM, never into application code.
const source = readFileSync(new URL('../segmentation/editor.js', import.meta.url), 'utf8')
  .replaceAll('\r\n', '\n')
  .replaceAll('import.meta.url', JSON.stringify('https://mapshroom.test/segmentation/editor.js'))
  .replace('export function createImageEditor', 'function createImageEditor')
  .replace('return {\n  open: openFile,', 'options.inspect = code => eval(code);\nreturn {\n  open: openFile,');

function editor(integrated = true, deferSave = false) {
  const messages: Record<string, unknown>[] = [];
  const workerRequests: Record<string, unknown>[] = [];
  const nodes = new Map<string, ReturnType<typeof makeNode>>();
  let terminated = 0, disconnected = false;
  let saveResult = true;
  let resolveSave: ((value: boolean) => void) | null = null;
  function makeNode() {
    let pixels = new Uint8ClampedArray();
    return {
      value: '100', checked: false, disabled: false, textContent: '', width: 0, height: 0,
      options: [] as { value: string; remove: () => void }[],
      dataset: { background: 'black', editorPanel: 'depth' },
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {}, querySelector: (selector: string) => node(selector), querySelectorAll: () => [],
      getContext: () => ({ clearRect() {}, putImageData: (image: { data: Uint8ClampedArray }) => { pixels = image.data; } }),
      toBlob: (done: (blob: Blob | null) => void) => done(new Blob([pixels], { type: 'image/png' })),
    };
  }
  function node(selector: string) {
    if (!nodes.has(selector)) nodes.set(selector, makeNode());
    return nodes.get(selector)!;
  }
  node('#modelSelect').value = 'manual'; node('#depthDefinitionRange').value = '0';
  const document = { querySelector: node, querySelectorAll: () => [], createElement: makeNode, body: node('body'), addEventListener() {} };
  Object.assign(document.body, { ownerDocument: document });
  const options = {
    integrated, initialPanel: 'depth', inspect: (_code: string): unknown => undefined,
    onStatus() {},
    onSave: async (blob: Blob, result: Record<string, unknown>) => {
      messages.push({ ...result, mimeType: blob.type, buffer: await blob.arrayBuffer() });
      return deferSave ? new Promise<boolean>(resolve => { resolveSave = resolve; }) : saveResult;
    },
  };
  const context = createContext({
    URL, URLSearchParams, Blob, File, ArrayBuffer, Uint8Array, Uint8ClampedArray, crypto, AbortController,
    ImageData: class { data: Uint8ClampedArray; constructor(data: Uint8ClampedArray) { this.data = data; } },
    Worker: class { postMessage(message: Record<string, unknown>) { workerRequests.push(message); } terminate() { terminated++; } },
    ResizeObserver: class { observe() {} disconnect() { disconnected = true; } },
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document, options,
  });
  runInContext(source + '\nconst controller = createImageEditor(document.body, options);', context);
  options.inspect(`sourceFile = new File(['image'], 'source.png');
    imageWidth = 2; imageHeight = 1;
    sourcePixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    basePixels = new Uint8ClampedArray(sourcePixels);
    depthMaskAlpha = new Uint8ClampedArray([255, 0]);`);
  return {
    run: (code: string): any => options.inspect(code), // eslint-disable-line @typescript-eslint/no-explicit-any
    results: () => messages,
    requests: () => workerRequests,
    complete: () => options.inspect(`depthWorker.onmessage({data:{type:'result', pixels:new Uint8Array([200,100]).buffer, width:2,height:1}})`),
    ack: (saved: boolean) => { saveResult = saved; resolveSave?.(saved); },
    dispose: () => runInContext('controller.dispose()', context),
    cleanup: () => ({ terminated, disconnected }),
  };
}

test('depth input preserves original RGB even where the output mask is transparent', async () => {
  const app = editor();
  app.run('basePixels[7] = 0');
  await app.run('generateDepthMap()');
  const request = app.requests().find(message => message.type === 'estimate');
  assert.ok(request);
  assert.deepEqual([...new Uint8Array(request.buffer as ArrayBuffer)], [255, 0, 0, 255, 0, 255, 0, 255]);
});

test('depth can start without requiring background removal first', async () => {
  const app = editor();
  await app.run('generateDepthMap()');
  assert.ok(app.requests().some(message => message.type === 'estimate'));
});

test('opening a saved depth map preserves its pixels and transparency without inference or autosave', () => {
  const app = editor();
  app.run(`restoreSavedDepth(new Uint8ClampedArray([200,200,200,255,100,100,100,80]), 2, 1, 'existing-depth'); setDepthPreviewActive(true);`);
  assert.deepEqual([...app.run('buildDepthPixels()')], [200, 200, 200, 255, 100, 100, 100, 80]);
  assert.equal(app.run('depthPreviewActive'), true);
  assert.equal(app.run('elements.depthDefinition.value'), '0');
  assert.equal(app.run('elements.depthContrast.value'), '100');
  assert.equal(app.results().length, 0);
  assert.equal(app.requests().length, 0);
});

test('adjusting a reopened depth map saves its existing identity and keeps soft alpha', async () => {
  const app = editor();
  app.run(`restoreSavedDepth(new Uint8ClampedArray([200,200,200,255,100,100,100,80]), 2, 1, 'existing-depth'); setDepthPreviewActive(true); elements.depthInvert.checked = true;`);
  await app.run('saveResult()');
  const [result] = app.results();
  assert.equal(result.resultKind, 'depth');
  assert.equal(result.resultId, 'existing-depth');
  assert.equal(result.automatic, false);
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
  assert.deepEqual([...new Uint8Array(result.buffer as ArrayBuffer)], [55, 55, 55, 255, 155, 155, 155, 80]);
  assert.equal(app.requests().length, 0);
});

test('a saved RGB depth version also opens unchanged', () => {
  const app = editor();
  app.run(`restoreSavedDepth(new Uint8ClampedArray([70,4,88,255,155,251,90,255]), 2, 1, 'color-depth');`);
  assert.equal(app.run('depthMode'), 'rgb');
  assert.deepEqual([...app.run('buildDepthPixels()')], [70, 4, 88, 255, 155, 251, 90, 255]);
});

test('a depth version without its original cannot accidentally run inference on the depth image', async () => {
  const app = editor();
  app.run('depthCanRegenerate = false; setDepthGenerating(false)');
  await app.run('generateDepthMap()');
  assert.equal(app.run('elements.generateDepth.disabled'), true);
  assert.equal(app.requests().length, 0);
});

test('depth completion autosaves full-size grayscale pixels with a black background, even after switching panels', async () => {
  const app = editor();
  app.run("root.dataset.editorPanel = 'refine'");
  await app.complete();
  const [result] = app.results();
  assert.equal(result.resultKind, 'depth');
  assert.equal(result.automatic, true);
  assert.equal(result.mimeType, 'image/png');
  assert.deepEqual([...new Uint8Array(result.buffer as ArrayBuffer)], [200, 200, 200, 255, 0, 0, 0, 255]);
  assert.equal(typeof result.resultId, 'string');
});

test('depth adjustments reuse the generated identity and prevent concurrent duplicate saves', async () => {
  const app = editor(true, true);
  const automaticSave = app.complete();
  // The real callback waits for storage; a second Save is ignored while it waits.
  await new Promise(resolve => setImmediate(resolve));
  await app.run('saveResult()');
  assert.equal(app.results().length, 1);
  app.ack(true); await automaticSave;
  app.run('elements.depthInvert.checked = true');
  const manualSave = app.run('saveResult()');
  await new Promise(resolve => setImmediate(resolve));
  const [automatic, manual] = app.results();
  assert.equal(manual.resultId, automatic.resultId);
  assert.equal(manual.automatic, false);
  assert.deepEqual([...new Uint8Array(manual.buffer as ArrayBuffer)], [55, 55, 55, 255, 0, 0, 0, 255]);
  app.ack(true); await manualSave;
});

test('failed storage can retry the same generated depth map without rerunning inference', async () => {
  const app = editor();
  app.ack(false);
  await app.complete();
  await app.run('saveResult()');
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

test('closing the native editor terminates workers and ignores late completion', async () => {
  const app = editor();
  app.dispose(); app.dispose();
  assert.deepEqual(app.cleanup(), { terminated: 2, disconnected: true });
  await app.complete();
  assert.equal(app.results().length, 0);
});

test('an unmounted editor does not submit a result after asynchronous PNG encoding', async () => {
  const app = editor();
  app.run(`restoreSavedDepth(new Uint8ClampedArray([200,200,200,255,100,100,100,80]), 2, 1, 'existing-depth'); setDepthPreviewActive(true);`);
  const save = app.run('saveResult()');
  app.dispose();
  await save;
  assert.equal(app.results().length, 0);
});

test('cropping a painted image keeps reset pixels aligned and undo restores the original size', async () => {
  const app = editor();
  app.run(`maskBaseline = new Uint8ClampedArray(basePixels); drawBaselinePixels = new Uint8ClampedArray(basePixels);
    sourceWidth = 2; sourceHeight = 1; cropRect = {x:.5, y:0, width:.5, height:1};
    root.dataset.editorPanel = 'draw';`);
  await app.run('applyCrop()');
  assert.equal(app.run('imageWidth'), 1);
  assert.deepEqual([...app.run('drawBaselinePixels')], [0, 255, 0, 255]);
  await app.run('saveResult()');
  assert.equal(app.results()[0].resultKind, 'draw');
  assert.equal(app.results()[0].width, 1);
  await app.run('undo()');
  assert.equal(app.run('imageWidth'), 2);
  assert.equal(app.run('drawBaselinePixels.length'), 8);
  await app.run('redo()');
  assert.equal(app.run('imageWidth'), 1);
});

test('saving is blocked while history restores an image', async () => {
  const app = editor();
  app.run('restoringHistory = true');
  await app.run('saveResult()');
  assert.equal(app.results().length, 0);
});

test('failed regeneration retains the saved depth raster, alpha and matching preview', async () => {
  const app = editor();
  const pixels = [200, 200, 200, 255, 100, 100, 100, 80];
  app.run(`restoreSavedDepth(new Uint8ClampedArray(${JSON.stringify(pixels)}), 2, 1, 'existing-depth'); setDepthPreviewActive(true);`);
  await app.run('generateDepthMap()');
  await app.run("depthWorker.onmessage({data:{type:'error',message:'Model unavailable'}})");
  assert.deepEqual([...app.run('renderedPixels')], pixels);
  await app.run('saveResult()');
  assert.equal(app.results()[0].resultId, 'existing-depth');
  assert.deepEqual([...new Uint8Array(app.results()[0].buffer as ArrayBuffer)], pixels);
});

test('mask edits are reflected when reopening depth without running inference again', () => {
  const app = editor();
  app.run(`restoreSavedDepth(new Uint8ClampedArray([200,200,200,255,100,100,100,80]), 2, 1, 'existing-depth');
    elements.threshold.value = '8'; elements.feather.value = '4'; elements.spill.value = '0';
    basePixels[7] = 0; renderMask(true); setDepthPreviewActive(true);`);
  assert.deepEqual([...app.run('buildDepthPixels()')], [200,200,200,255,100,100,100,0]);
  assert.equal(app.requests().length, 0);
});

test('changing the preview background does not paint the exported mask white', async () => {
  const app = editor();
  app.run(`elements.checkerboard.dataset.background = 'white';
    elements.threshold.value = '8'; elements.feather.value = '4'; elements.spill.value = '0';
    basePixels[7] = 0; renderMask(true);`);
  await app.run('saveResult()');
  assert.deepEqual([...new Uint8Array(app.results()[0].buffer as ArrayBuffer)], [255,0,0,255,0,0,0,255]);
});

test('PNG preparation failure restores the previous depth and releases the busy state', async () => {
  const app = editor();
  const pixels = [200,200,200,255,100,100,100,80];
  app.run(`restoreSavedDepth(new Uint8ClampedArray(${JSON.stringify(pixels)}), 2, 1, 'existing-depth'); setDepthPreviewActive(true);
    const createCanvas = document.createElement;
    document.createElement = () => { const canvas = createCanvas(); canvas.toBlob = done => done(null); return canvas; };`);
  await app.run('generateDepthMap()');
  assert.equal(app.run('busy'), false);
  assert.deepEqual([...app.run('renderedPixels')], pixels);
  assert.equal(app.requests().length, 0);
});
