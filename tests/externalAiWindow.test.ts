import assert from 'node:assert/strict';
import test from 'node:test';
import { getExternalAiPopupBounds } from '../src/lib/externalAiWindowGeometry.ts';
import { closeExternalAiWindow, openExternalAiWindow } from '../src/lib/openExternalAiWindow.ts';

const host = {
  screenX: 100, screenY: 40, innerWidth: 1440, innerHeight: 900,
  outerWidth: 1456, outerHeight: 988,
  availableLeft: 0, availableTop: 0, availableWidth: 1920, availableHeight: 1080,
};
const canvas = { left: 370, top: 41, width: 700, height: 549 };

test('popup fills the canvas column, leaving sliders, chat and lower controls visible', () => {
  assert.deepEqual(getExternalAiPopupBounds(canvas, host), { left: 478, top: 169, width: 700, height: 549 });
  const narrower = getExternalAiPopupBounds({ ...canvas, left: 450, width: 620 }, host)!;
  assert.equal(narrower.left, 558);
  assert.equal(narrower.width, 620);
  assert.equal(narrower.left + narrower.width, 1178);
});

test('zoomed page coordinates cover the same physical canvas area', () => {
  const windowBounds = { ...host, screenX: 0, screenY: 0, outerWidth: 1920, outerHeight: 1080, innerWidth: 1920, innerHeight: 1000 };
  const fullSizeCanvas = { left: 490, top: 60, width: 930, height: 730 };
  const expected = getExternalAiPopupBounds(fullSizeCanvas, windowBounds);
  for (const zoom of [0.8, 1.1, 1.25, 1.5]) {
    const zoomed = getExternalAiPopupBounds({
      left: fullSizeCanvas.left / zoom, top: fullSizeCanvas.top / zoom,
      width: fullSizeCanvas.width / zoom, height: fullSizeCanvas.height / zoom,
    }, { ...windowBounds, innerWidth: 1920 / zoom, innerHeight: 1000 / zoom })!;
    assert.ok(Math.abs(zoomed.left - expected!.left) <= 1);
    assert.ok(Math.abs(zoomed.top - expected!.top) <= 1);
    assert.ok(Math.abs(zoomed.width - expected!.width) <= 1);
    assert.ok(Math.abs(zoomed.height - expected!.height) <= 1);
  }
});

test('popup remains on a secondary monitor with negative coordinates', () => {
  const bounds = getExternalAiPopupBounds(canvas, { ...host, screenX: -1820, availableLeft: -1920 })!;
  assert.equal(bounds.left, -1442);
  assert.equal(bounds.width, 700);
  assert.ok(bounds.left >= -1920 && bounds.left + bounds.width <= 0);
});

test('popup is clipped to the available screen area', () => {
  const bounds = getExternalAiPopupBounds(canvas, { ...host, screenX: -600, screenY: 600 })!;
  assert.equal(bounds.left, 8);
  assert.equal(bounds.top + bounds.height, 1072);
  assert.ok(bounds.left + bounds.width < 1080);
});

test('a canvas too small for a usable popup returns no popup bounds', () => {
  assert.equal(getExternalAiPopupBounds({ ...canvas, width: 200 }, host), null);
});

function withWindow(blocked: boolean, run: (calls: Array<{ url: string; name: string; features?: string }>, positions: number[][], navigations: string[]) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const calls: Array<{ url: string; name: string; features?: string }> = [];
  const positions: number[][] = [];
  const navigations: string[] = [];
  const popup = {
    opener: {}, closed: false,
    resizeTo: (width: number, height: number) => positions.push([width, height]),
    moveTo: (left: number, top: number) => positions.push([left, top]),
    location: { replace: (url: string) => { assert.equal(positions.length, 2, 'position before loading ChatGPT'); navigations.push(url); } },
    focus() {}, close() {},
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    ...host,
    screen: { availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1080 },
    open: (url: string, name: string, features?: string) => { calls.push({ url, name, features }); return blocked ? null : popup; },
    addEventListener() {}, removeEventListener() {},
  } });
  try { run(calls, positions, navigations); } finally {
    closeExternalAiWindow();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

const anchor = { getBoundingClientRect: () => canvas, isConnected: true, parentElement: null } as unknown as HTMLElement;

test('desktop handoff positions a fresh popup before loading ChatGPT', () => {
  withWindow(false, (calls, positions, navigations) => {
    assert.equal(openExternalAiWindow('https://chatgpt.com/', { cover: anchor }), 'popup');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, '_blank');
    assert.equal(calls[0].url, 'about:blank');
    assert.match(calls[0].features!, /popup=yes,width=700,height=549,left=478,top=169/);
    assert.deepEqual(positions, [[700, 549], [478, 169]]);
    assert.deepEqual(navigations, ['https://chatgpt.com/']);
  });
});

test('blocked workspace popup returns the retry state without opening a regular tab', () => {
  withWindow(true, calls => {
    assert.equal(openExternalAiWindow('https://chatgpt.com/', { cover: anchor }), 'blocked');
    assert.equal(calls.length, 1);
    assert.match(calls[0].features!, /popup=yes/);
  });
});
