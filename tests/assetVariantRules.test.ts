import test from 'node:test';
import assert from 'node:assert/strict';
import { connectedDarkAlpha, fitProcessingSize, normalizeGradientSettings, processingProfile, suggestSurfaceSettings, surfaceSettingsForVariant } from '../src/lib/assetVariantRules.js';
import { prepareImage, analyze } from '../src/lib/surfaceMapping/algorithms.js';
import { prepareSurface, finishSurface } from '../src/lib/surfaceMapping/surfaces.js';

test('gradient settings default to two zones and preserve zero smoothing', () => {
  assert.deepEqual(normalizeGradientSettings(), { zones: 2, smoothing: 0 });
  assert.deepEqual(normalizeGradientSettings({ zones: 12, smoothing: 0 }), { zones: 12, smoothing: 0 });
  assert.deepEqual(normalizeGradientSettings({ zones: 99, smoothing: -1 }), { zones: 48, smoothing: 0 });
  assert.deepEqual(normalizeGradientSettings({ zones: NaN, smoothing: Infinity }), { zones: 2, smoothing: 0 });
});

test('gradient settings do not change segmentation or other generated outputs', () => {
  const suggested = suggestSurfaceSettings(new Uint8ClampedArray(40 * 40 * 4).fill(255), 40, 40);
  const before = { ...suggested };
  const gradient = surfaceSettingsForVariant(suggested, 'gradient', { zones: 2, smoothing: 0 });
  assert.equal(gradient.zones, 2); assert.equal(gradient.smoothing, 0);
  assert.equal(gradient.black, suggested.black); assert.equal(gradient.method, suggested.method);
  for (const kind of ['segmentation', 'field', 'edges']) assert.deepEqual(surfaceSettingsForVariant(suggested, kind, { zones: 2, smoothing: 0 }), before);
  assert.deepEqual(suggested, before);
});

test('gradient zone and smoothing controls affect the actual surface analysis', () => {
  const width = 80, height = 60, rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set([80 + x % 5 * 10, 90 + y % 5 * 10, 100, 255], (y * width + x) * 4);
  const suggested = suggestSurfaceSettings(rgba, width, height);
  const run = (zones: number, smoothing: number) => {
    const settings = surfaceSettingsForVariant(suggested, 'gradient', { zones, smoothing });
    const image = prepareSurface(prepareImage(rgba, width, height, settings.black), settings.smoothing);
    return { image, result: finishSurface(analyze(image, 'slic', 50), image, settings.zones, settings.smoothing) };
  };
  const two = run(2, 0), twelve = run(12, 0), smooth = run(2, 100);
  assert.equal(two.result.count, 2); assert.equal(twelve.result.count, 12);
  assert.notDeepEqual(two.result.labels, twelve.result.labels);
  assert.deepEqual(two.image.rgba, rgba, 'zero smoothing retains the input colors');
  assert.notDeepEqual(smooth.image.rgba, two.image.rgba, 'smoothing must affect the working image');
});

test('a target of two zones keeps three isolated pieces separate', () => {
  const width = 90, height = 40, rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const inside = y > 8 && y < 32 && [15, 45, 75].some(center => Math.abs(x - center) < 8);
    rgba.set(inside ? [160, 140, 120, 255] : [0, 0, 0, 0], (y * width + x) * 4);
  }
  const settings = surfaceSettingsForVariant(suggestSurfaceSettings(rgba, width, height), 'gradient');
  const image = prepareSurface(prepareImage(rgba, width, height, settings.black), settings.smoothing);
  const result = finishSurface(analyze(image, 'slic', 50), image, settings.zones, settings.smoothing);
  const centers = [15, 45, 75].map(x => result.labels[20 * width + x]);
  assert.equal(new Set(centers).size, 3);
  assert.ok(centers.every(id => id > 0));
  assert.equal(result.count, 3);
});

test('connected background extraction preserves enclosed dark detail', () => {
  const rgba = new Uint8ClampedArray(7 * 7 * 4);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const i = (y * 7 + x) * 4, ring = x >= 1 && x <= 5 && y >= 1 && y <= 5 && (x === 1 || x === 5 || y === 1 || y === 5);
    rgba[i] = ring ? 180 : 0; rgba[i + 3] = 255;
  }
  const alpha = connectedDarkAlpha(rgba, 7, 7);
  assert.equal(alpha[0], 0); assert.equal(alpha[3 * 7 + 3], 255); assert.equal(alpha[1 * 7 + 1], 255);
  assert.equal(rgba[3], 255, 'the source must not be modified');
});
test('mobile and limited devices avoid automatic AI and constrain decoded working buffers', () => {
  const phone = processingProfile({ mobile: true, supported: true });
  assert.equal(phone.ai, false); assert.equal(phone.canEnableAI, true);
  const size = fitProcessingSize(6000, 4000, phone);
  assert.ok(size.width * size.height <= 3.01e6); assert.ok(Math.abs(size.width / size.height - 1.5) < .002);
  const limited = processingProfile({ memory: 2, supported: true });
  assert.equal(limited.ai, false); assert.equal(limited.canEnableAI, false);
  assert.equal(processingProfile({ supported: false }).ai, false);
});
test('small images are never stretched to the processing budget', () => {
  assert.deepEqual(fitProcessingSize(320, 640, processingProfile()), { width: 320, height: 640 });
});
test('a bright border does not trigger automatic dark-background removal', () => {
  const rgba = new Uint8ClampedArray(12 * 12 * 4).fill(255);
  const settings = suggestSurfaceSettings(rgba, 12, 12);
  assert.equal(settings.darkBackground, false); assert.equal(settings.black, 0); assert.equal(settings.hasAlpha, false);
});
