import assert from 'node:assert/strict';
import test from 'node:test';
import { fittedProjectionSize, projectionImageSize, resizeProjectionImage, projectionDistortionDelta } from '../src/lib/projectionFraming.ts';
import type { StageTransform } from '../src/types.ts';

const viewport = { width: 1920, height: 1080 };
const frame: StageTransform = { offsetX: 0, offsetY: 0, widthAdjust: 0, heightAdjust: 0, rotationDegrees: 0, precision: 12, moveMode: true, rotationLocked: false };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} should equal ${expected}`);

test('fits portrait, square, landscape and panorama into the output without cropping', () => {
  for (const ratio of [0.5, 1, 1.5, 16 / 9, 4]) {
    const size = fittedProjectionSize(viewport, ratio);
    close(size.width / size.height, ratio);
    assert.ok(size.width <= viewport.width && size.height <= viewport.height);
    assert.ok(size.width === viewport.width || size.height === viewport.height);
  }
});
test('numeric dimensions convert into viewport deltas for a letterboxed portrait', () => {
  const patch = resizeProjectionImage(frame, viewport, 0.5, 'width', 270, false);
  close(patch.widthAdjust!, -960);
  close(patch.heightAdjust!, 0);
  assert.deepEqual(projectionImageSize({ ...frame, ...patch }, viewport, 0.5), { width: 270, height: 1080 });
});
test('linked resizing preserves current proportions, including an existing custom stretch', () => {
  const stretched = { ...frame, widthAdjust: 200, heightAdjust: -100 };
  const before = projectionImageSize(stretched, viewport, 1.5);
  const patch = resizeProjectionImage(stretched, viewport, 1.5, 'height', 700, true);
  const after = projectionImageSize({ ...stretched, ...patch }, viewport, 1.5);
  close(after.height, 700);
  close(after.width / after.height, before.width / before.height);
  assert.equal(patch.offsetX, undefined);
});
test('unlinked resize leaves the other dimension unchanged', () => {
  const patch = resizeProjectionImage(frame, viewport, 4, 'height', 300, false);
  const result = projectionImageSize({ ...frame, ...patch }, viewport, 4);
  close(result.width, 1920);
  close(result.height, 300);
});
test('resizing survives a collapsed imported frame and rejects non-finite input', () => {
  const collapsed = { ...frame, widthAdjust: -1920, heightAdjust: -1080 };
  assert.deepEqual(projectionImageSize(collapsed, viewport, 1), { width: 0, height: 0 });
  const patch = resizeProjectionImage(collapsed, viewport, 1, 'width', 500, true);
  const restored = projectionImageSize({ ...collapsed, ...patch }, viewport, 1);
  close(restored.width, 500);
  close(restored.height, 500);
  assert.deepEqual(resizeProjectionImage(frame, viewport, 1, 'width', NaN, true), {});
});
test('same stored mapping uses the actual output dimensions after display resize', () => {
  const moved = { ...frame, widthAdjust: -960, heightAdjust: -540 };
  assert.deepEqual(projectionImageSize(moved, viewport, 16 / 9), { width: 960, height: 540 });
  assert.deepEqual(projectionImageSize(moved, { width: 1280, height: 720 }, 16 / 9), { width: 320, height: 180 });
});

test('fixed corner controls keep their output-pixel direction and step after moving, resizing and rotating the image', () => {
  for (const ratio of [.5, 1, 4]) {
    for (const output of [viewport, { width: 1280, height: 720 }]) {
      const transformed = { ...frame, offsetX: 830, offsetY: -620, widthAdjust: 960, heightAdjust: -360, rotationDegrees: 20 };
      const delta = projectionDistortionDelta(transformed, output, ratio, { x: 12, y: -24 });
      const size = projectionImageSize(transformed, output, ratio);
      // Project the adjusted corner back to the screen. The visible movement
      // must still be twelve output pixels right and twenty-four pixels up.
      const angle = 20 * Math.PI / 180;
      close(delta.x * size.width * Math.cos(angle) - delta.y * size.height * Math.sin(angle), 12);
      close(delta.x * size.width * Math.sin(angle) + delta.y * size.height * Math.cos(angle), -24);
      assert.deepEqual(projectionDistortionDelta({ ...transformed, offsetX: 0, offsetY: 0 }, output, ratio, { x: 12, y: -24 }), delta);
    }
  }
});

test('corner controls safely handle collapsed frames and invalid drag deltas', () => {
  const collapsed = { ...frame, widthAdjust: -1920, heightAdjust: -1080 };
  assert.deepEqual(projectionDistortionDelta(collapsed, viewport, .5, { x: 12, y: 12 }), { x: 0, y: 0 });
  assert.deepEqual(projectionDistortionDelta(frame, viewport, .5, { x: NaN, y: 12 }), { x: 0, y: 0 });
});
