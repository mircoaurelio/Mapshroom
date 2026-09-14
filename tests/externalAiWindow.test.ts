import assert from 'node:assert/strict';
import test from 'node:test';
import { getExternalAiPopupBounds } from '../src/lib/externalAiWindowGeometry.ts';
import { closeExternalAiWindow, openExternalAiWindow } from '../src/lib/openExternalAiWindow.ts';

const host = {
  screenX: 100, screenY: 40, innerWidth: 1440, innerHeight: 900,
  outerWidth: 1456, outerHeight: 988,
  availableLeft: 0, availableTop: 0, availableWidth: 1920, availableHeight: 1080,
};
const chat = { left: 1080, top: 41, height: 549 };

test('popup covers sliders and canvas, leaving the chat and lower controls visible', () => {
  assert.deepEqual(getExternalAiPopupBounds(chat, host), { left: 116, top: 169, width: 1064, height: 549 });
  const narrower = getExternalAiPopupBounds({ ...chat, left: 840 }, host)!;
  assert.equal(narrower.width, 824);
  assert.equal(narrower.left + narrower.width, 100 + 8 + 840 - 8);
});

test('popup remains on a secondary monitor with negative coordinates', () => {
  const bounds = getExternalAiPopupBounds(chat, { ...host, screenX: -1820, availableLeft: -1920 })!;
  assert.equal(bounds.left, -1804);
  assert.equal(bounds.width, 1064);
  assert.ok(bounds.left >= -1920 && bounds.left + bounds.width <= 0);
});

test('popup is clipped to the available screen area', () => {
  const bounds = getExternalAiPopupBounds(chat, { ...host, screenX: -200, screenY: 600 })!;
  assert.equal(bounds.left, 8);
  assert.equal(bounds.top + bounds.height, 1072);
  assert.ok(bounds.left + bounds.width < 1080);
});

test('stacked mobile layout does not leave room for a popup beside chat', () => {
  assert.equal(getExternalAiPopupBounds({ ...chat, left: 0 }, host), null);
});

function withWindow(blocked: boolean, run: (calls: Array<{ url: string; name: string; features?: string }>, positions: number[][]) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const calls: Array<{ url: string; name: string; features?: string }> = [];
  const positions: number[][] = [];
  const popup = { opener: {}, closed: false, resizeTo: (width: number, height: number) => positions.push([width, height]), moveTo: (left: number, top: number) => positions.push([left, top]), focus() {}, close() {} };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    ...host,
    screen: { availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1080 },
    open: (url: string, name: string, features?: string) => { calls.push({ url, name, features }); return blocked ? null : popup; },
    addEventListener() {}, removeEventListener() {},
  } });
  try { run(calls, positions); } finally {
    closeExternalAiWindow();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

const anchor = { getBoundingClientRect: () => chat, isConnected: true, parentElement: null } as unknown as HTMLElement;

test('desktop handoff opens a named popup with the measured workspace geometry', () => {
  withWindow(false, (calls, positions) => {
    assert.equal(openExternalAiWindow('https://chatgpt.com/', { beside: anchor }), 'popup');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'mapshroom-ai-chat');
    assert.match(calls[0].features!, /popup=yes,width=1064,height=549,left=116,top=169/);
    assert.deepEqual(positions, [[1064, 549], [116, 169]]);
  });
});

test('blocked workspace popup returns the retry state without opening a regular tab', () => {
  withWindow(true, calls => {
    assert.equal(openExternalAiWindow('https://chatgpt.com/', { beside: anchor }), 'blocked');
    assert.equal(calls.length, 1);
    assert.notEqual(calls[0].name, '_blank');
  });
});
