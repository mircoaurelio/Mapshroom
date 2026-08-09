import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptShaderBodyForTarget,
  buildShaderProgramSources,
  SHADER_ABI_VERSION,
} from '../src/lib/shaderCompiler.ts';

const shaderBody = `// NAME: Compiler test
uniform float amount; // @min 0 @max 1 @default 0.5
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture2D(tex, uv);
}`;

test('keeps the current WebGL1 shader contract unchanged', () => {
  const sources = buildShaderProgramSources(shaderBody, 'webgl1');

  assert.equal(sources.abiVersion, SHADER_ABI_VERSION);
  assert.equal(sources.contextId, 'webgl');
  assert.match(sources.vertexSource, /attribute vec2 a_position/);
  assert.match(sources.fragmentSource, /varying vec2 v_uv/);
  assert.match(sources.fragmentSource, /texture2D\(tex, uv\)/);
  assert.match(sources.fragmentSource, /gl_FragColor = processColor/);
  assert.match(sources.fragmentSource, /uniform float amount; \/\/ @min 0 @max 1 @default 0\.5/);
});

test('emits a GLSL ES 3.00 program from the same stored shader body', () => {
  const sources = buildShaderProgramSources(shaderBody, 'webgl2');

  assert.equal(sources.contextId, 'webgl2');
  assert.ok(sources.vertexSource.startsWith('#version 300 es\n'));
  assert.ok(sources.fragmentSource.startsWith('#version 300 es\n'));
  assert.match(sources.vertexSource, /in vec2 a_position/);
  assert.match(sources.vertexSource, /out vec2 v_uv/);
  assert.match(sources.fragmentSource, /in vec2 v_uv/);
  assert.match(sources.fragmentSource, /out vec4 mapshroom_fragColor/);
  assert.match(sources.fragmentSource, /texture\(tex, uv\)/);
  assert.match(sources.fragmentSource, /mapshroom_fragColor = processColor/);
});

test('rewrites complete GLSL identifiers but preserves comments and longer names', () => {
  const source = `// texture2D remains documented
/* textureCube remains documented too */
vec4 texture2DHelper = texture2D(image, uv);
vec4 projected = texture2DProj(image, uvw);
float active = 1.0;`;

  assert.equal(
    adaptShaderBodyForTarget(source, 'webgl2'),
    `// texture2D remains documented
/* textureCube remains documented too */
vec4 texture2DHelper = texture(image, uv);
vec4 projected = textureProj(image, uvw);
float mapshroom_legacy_active = 1.0;`,
  );
});
