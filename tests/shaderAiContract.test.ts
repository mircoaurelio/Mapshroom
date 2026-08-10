import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  AI_MINIMUM_UI_UNIFORM_COUNT,
  parseUniforms,
  validateGeneratedShader,
} from '../src/lib/shader.ts';
import {
  embedShaderPromptComment,
  formatShaderPromptComment,
  readShaderPromptComment,
} from '../src/lib/shaderPromptMetadata.ts';

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
const projectShareSource = readFileSync(
  new URL('../src/lib/projectShare.ts', import.meta.url),
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

test('AI contracts make automatic slider metadata and prompt retention mandatory', () => {
  for (const source of [requestContractSource, systemPromptSource]) {
    assert.match(source, /3 to 6 meaningful(?: effect)? controls/);
    assert.match(source, /infer the (?:3 to 6 )?most useful/);
    assert.match(source, /MAPSHROOM PROMPT/);
    assert.match(source, /hardcod/);
  }

  assert.match(requestContractSource, /Required prompt record line/);
  assert.match(requestContractSource, /uniform float speed; \/\/ @min -2\.0 @max 2\.0 @default 0\.25/);
  assert.match(requestContractSource, /uniform float amount; \/\/ @min 0\.0 @max 2\.0 @default 1\.0/);
  assert.match(requestContractSource, /uniform float scale; \/\/ @min 0\.25 @max 8\.0 @default 2\.0/);
  assert.match(projectShareSource, /isShaderPromptCommentLine/);
});

test('generated shader validation stamps the exact prompt and produces UI controls', () => {
  const userPrompt = 'Create moving contour lines.\nExpose "speed", glow and a warm color.';
  const generatedCode = `// NAME: Prompt metadata test
uniform float speed; // @min -2.0 @max 2.0 @default 0.25
uniform float glow; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 warmColor; // @default 1.0,0.4,0.1
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * vec4(warmColor * (glow + speed * 0.0), 1.0);
}`;
  const validated = validateGeneratedShader(generatedCode, {
    minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    prompt: userPrompt,
  });

  assert.equal(validated.split('\n')[1], formatShaderPromptComment(userPrompt));
  assert.equal(readShaderPromptComment(validated), userPrompt);
  assert.equal(Object.keys(parseUniforms(validated)).length, 3);
});

test('prompt metadata is replaced canonically instead of accumulating', () => {
  const first = embedShaderPromptComment('// NAME: Replace prompt\nvoid helper() {}', 'first');
  const second = embedShaderPromptComment(first, 'second\nline');

  assert.equal(readShaderPromptComment(second), 'second\nline');
  assert.equal(second.match(/MAPSHROOM PROMPT:/g)?.length, 1);
});

test('AI validation rejects missing slider controls', () => {
  const noControls = `// NAME: No controls
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv);
}`;
  assert.throws(
    () => validateGeneratedShader(noControls, {
      minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    }),
    /at least 3 annotated UI uniforms/,
  );
});

test('AI validation rejects slider metadata that cannot drive a usable control', () => {
  const invalidRange = `// NAME: Invalid range
uniform float amount; // @min 1.0 @max 0.0 @default 2.0
uniform int steps; // @min 1 @max 8 @default 2.5
uniform vec3 tint; // @default red,green,blue
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv);
}`;

  assert.throws(
    () => validateGeneratedShader(invalidRange, {
      minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    }),
    /@max value greater|outside its slider range|integer|valid same-line @default/,
  );
});

test('the official blank shader uses texture while retaining a named legacy migration fixture', () => {
  assert.match(blankShaderSource, /export const blankShaderTemplate[\s\S]*texture\(tex, uv\)/);
  assert.match(blankShaderSource, /uniform float intensity; \/\/ @min 0\.0 @max 2\.0 @default 1\.0/);
  assert.match(blankShaderSource, /export const legacyBlankShaderTemplate[\s\S]*texture2D\(tex, uv\)/);
});
