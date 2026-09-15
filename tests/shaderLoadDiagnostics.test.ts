import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShaderOptimizationPrompt, currentShaderLoadSources, inspectShaderCost,
  shaderLoadReasons, shaderLoadSummary, shaderLoadTitle, uniqueShaderLoadSources,
  type ShaderLoadReport } from '../src/lib/shaderLoadDiagnostics.ts';

const source = { id: 'fractal', name: 'Fractal', code: 'for (int i=0; i<80; i++) { color += fbm(uv); }' };
const report: ShaderLoadReport = { key: '1', warning: 'gpu', frameMs: 50, gpuMs: 42,
  width: 1920, height: 1080, layerCount: 1, sources: [source] };

test('code clues exclude comments and avoid claiming that static code proves a bottleneck', () => {
  assert.deepEqual(inspectShaderCost('// for (int i=0; i<100; i++) noise(uv)\n/* texture(uv) */\nreturn texture(tex,uv);'), []);
  const clues = inspectShaderCost(source.code);
  assert.equal(clues.length, 2);
  assert.match(clues[0], /may/);
  assert.match(clues[1], /noise/);
  assert.equal(inspectShaderCost('texture(tex,a); texture(tex,b); texture(tex,c); texture(tex,d);').length, 1);
});

test('no GPU confirmation explains slow frames without shader accusations', () => {
  const fallback = { ...report, warning: 'frame' as const, gpuMs: null };
  assert.match(shaderLoadSummary(fallback), /20 fps/);
  assert.match(shaderLoadSummary(fallback), /has not been confirmed as the cause/);
  assert.deepEqual(shaderLoadReasons(fallback), []);
  assert.equal(shaderLoadTitle(fallback), 'Slow preview');
});

test('mix measurement retains original identities and never assigns the whole cost to one shader', () => {
  const other = { id: 'other', name: 'Other', code: 'return texture(tex,uv);' };
  const mix = { ...report, sources: uniqueShaderLoadSources([source, other, source]), layerCount: 2 };
  assert.equal(mix.sources.length, 2);
  assert.equal(shaderLoadTitle(mix), 'High mix load');
  const prompt = buildShaderOptimizationPrompt(mix, source);
  assert.match(prompt, /“Fractal”/);
  assert.match(prompt, /entire mix, not the individual shader/);
  assert.match(prompt, /1920 × 1080/);
  assert.match(prompt, /42\.0 ms/);
});

test('optimization prompt preserves appearance, controls and rendering contract', () => {
  const prompt = buildShaderOptimizationPrompt(report, source);
  for (const term of ['transparency', 'masks', 'motion', 'controls', 'resolution',
    'frame rate', 'separate option', 'loop-invariant calculations', 'precomputed loop']) assert.ok(prompt.includes(term), term);
  assert.match(prompt, /not proven causes/);
});

test('changed, removed and fallback shader revisions cannot receive a stale optimization', () => {
  assert.deepEqual(currentShaderLoadSources(report, source.id, source.code, []), [source]);
  assert.deepEqual(currentShaderLoadSources(report, source.id, 'new code', [source]), []);
  assert.deepEqual(currentShaderLoadSources(report, 'other', 'other code', []), []);
  assert.deepEqual(currentShaderLoadSources(report, 'other', 'other code', [source]), [source]);
  const revisions = uniqueShaderLoadSources([source, { ...source, code: 'old code' }]);
  assert.equal(revisions.length, 2);
  assert.deepEqual(currentShaderLoadSources({ ...report, sources: revisions }, source.id, source.code, []), [source]);
});
