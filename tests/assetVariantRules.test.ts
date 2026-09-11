import test from 'node:test';
import assert from 'node:assert/strict';
import { connectedDarkAlpha, fitProcessingSize, processingProfile, suggestSurfaceSettings } from '../src/lib/assetVariantRules.js';

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
