import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requestContractSource = readFileSync(
  new URL('../src/shaders/requestContract.ts', import.meta.url),
  'utf8',
);
const systemPromptSource = readFileSync(
  new URL('../src/shaders/systemPrompt.ts', import.meta.url),
  'utf8',
);
const blankShaderSource = readFileSync(
  new URL('../src/shaders/templates/blankShader.ts', import.meta.url),
  'utf8',
);

test('AI contracts request the official WebGL 2 / GLSL ES 3.00 shader body', () => {
  for (const source of [requestContractSource, systemPromptSource]) {
    assert.match(source, /GLSL ES 3\.00/);
    assert.match(source, /WebGL 2/);
    assert.match(source, /texture\(\)/);
    assert.doesNotMatch(source, /Use WebGL 1\.0|GLSL WebGL 1\.0/);
  }
});

test('the official blank shader uses texture while retaining a named legacy migration fixture', () => {
  assert.match(blankShaderSource, /export const blankShaderTemplate[\s\S]*texture\(tex, uv\)/);
  assert.match(blankShaderSource, /uniform float intensity; \/\/ @min 0\.0 @max 2\.0 @default 1\.0/);
  assert.match(blankShaderSource, /export const legacyBlankShaderTemplate[\s\S]*texture2D\(tex, uv\)/);
});
