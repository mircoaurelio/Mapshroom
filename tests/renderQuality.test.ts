import assert from 'node:assert/strict';
import test from 'node:test';
import { AdaptiveRenderQuality, PREVIEW_PIXEL_LIMIT, OUTPUT_PIXEL_LIMIT, MIN_RENDER_PIXELS, stagePixelRatio } from '../src/lib/renderQuality.ts';

function run(controller: AdaptiveRenderQuality, start: number, duration: number, frameMs: number, gpuMs: number | null, actualPixels = controller.pixels) {
  for (let now = start; now < start + duration; now += frameMs) controller.sample({
    now, frameMs, gpuMs, gpuAvailable: gpuMs !== null, actualPixels, maxPixels: OUTPUT_PIXEL_LIMIT,
  });
}
test('preview budget prevents DPR2 from silently turning a 1080p stage into 4K', () => {
  assert.equal(stagePixelRatio(1920, 1080, 2, PREVIEW_PIXEL_LIMIT, false), 1);
  assert.equal(stagePixelRatio(3840, 2160, 1, PREVIEW_PIXEL_LIMIT, true), .5);
});
test('sustained frame misses reduce resolution even when shader GPU timing excludes the bottleneck', () => {
  const fallback = new AdaptiveRenderQuality(); fallback.select('a',0,OUTPUT_PIXEL_LIMIT);
  run(fallback,0,2000,33.33,null);
  assert.ok(fallback.pixels < PREVIEW_PIXEL_LIMIT);
  const gpu = new AdaptiveRenderQuality(); gpu.select('a',0,OUTPUT_PIXEL_LIMIT);
  run(gpu,0,1000,33.33,4);
  assert.equal(gpu.pixels,PREVIEW_PIXEL_LIMIT);
  run(gpu,1000,2000,33.33,4);
  assert.ok(gpu.pixels<PREVIEW_PIXEL_LIMIT);
});
test('GPU overload downscales from actual size, respects floor, and carries budget across transitions', () => {
  const q = new AdaptiveRenderQuality();q.select('a',0,OUTPUT_PIXEL_LIMIT);
  run(q,0,20000,33.33,24);
  assert.equal(q.pixels,MIN_RENDER_PIXELS);
  q.select('a+b',21000,OUTPUT_PIXEL_LIMIT);
  assert.equal(q.pixels,MIN_RENDER_PIXELS);
  q.select('a',22000,OUTPUT_PIXEL_LIMIT);
  assert.equal(q.pixels,MIN_RENDER_PIXELS);
});
test('brief stalls and tab resume do not reduce quality', () => {
  const q = new AdaptiveRenderQuality();q.select('a',0,OUTPUT_PIXEL_LIMIT);
  run(q,0,1000,16.67,5);
  q.sample({now:1200,frameMs:5000,gpuMs:30,gpuAvailable:true,actualPixels:q.pixels,maxPixels:OUTPUT_PIXEL_LIMIT});
  run(q,1210,1000,16.67,5);
  assert.equal(q.pixels,PREVIEW_PIXEL_LIMIT);
});
test('growth requires sustained GPU headroom and never exceeds the configured cap', () => {
  const q = new AdaptiveRenderQuality();q.select('a',0,OUTPUT_PIXEL_LIMIT);
  run(q,0,2000,16.67,4);assert.equal(q.pixels,PREVIEW_PIXEL_LIMIT);
  run(q,2000,4000,16.67,4);assert.ok(q.pixels>PREVIEW_PIXEL_LIMIT);
  q.select('a',6100,PREVIEW_PIXEL_LIMIT);assert.equal(q.pixels,PREVIEW_PIXEL_LIMIT);
});
