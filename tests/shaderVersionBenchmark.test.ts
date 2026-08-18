import assert from 'node:assert/strict';
import test from 'node:test';

import { glsl100Shaders } from '../shader-version-benchmark/shaders/glsl100.js';
import { glsl300Shaders } from '../shader-version-benchmark/shaders/glsl300.js';
import { wgslShaders } from '../shader-version-benchmark/shaders/wgsl.js';

test('the controlled benchmark keeps five independent shaders per backend', () => {
  assert.equal(glsl100Shaders.length, 5);
  assert.equal(glsl300Shaders.length, 5);
  assert.equal(wgslShaders.length, 5);

  const allIds = [...glsl100Shaders, ...glsl300Shaders, ...wgslShaders].map(
    (shader) => shader.id,
  );
  assert.equal(new Set(allIds).size, 15);
  assert.ok(
    [...glsl100Shaders, ...glsl300Shaders, ...wgslShaders].every(
      (shader) => shader.title.trim() && shader.code.trim(),
    ),
  );
});

test('GLSL 100 samples use the shared legacy uniform contract', () => {
  for (const shader of glsl100Shaders) {
    assert.doesNotMatch(shader.code, /#version 300 es/);
    assert.match(shader.code, /uniform sampler2D u_source;/);
    assert.match(shader.code, /uniform float u_time;/);
    assert.match(shader.code, /uniform vec2 u_resolution;/);
    assert.match(shader.code, /uniform float u_speed;/);
    assert.match(shader.code, /uniform float u_intensity;/);
    assert.match(shader.code, /uniform float u_scale;/);
    assert.match(shader.code, /gl_FragColor\s*=/);
  }
});

test('GLSL 300 samples use explicit WebGL2 syntax and the same controls', () => {
  for (const shader of glsl300Shaders) {
    assert.ok(shader.code.startsWith('#version 300 es'));
    assert.match(shader.code, /out vec4 outColor;/);
    assert.match(shader.code, /uniform sampler2D u_source;/);
    assert.match(shader.code, /uniform float u_time;/);
    assert.match(shader.code, /uniform vec2 u_resolution;/);
    assert.match(shader.code, /uniform float u_speed;/);
    assert.match(shader.code, /uniform float u_intensity;/);
    assert.match(shader.code, /uniform float u_scale;/);
    assert.doesNotMatch(shader.code, /texture2D\s*\(/);
  }
});

test('WGSL samples expose the shared texture, sampler and uniform bindings', () => {
  for (const shader of wgslShaders) {
    assert.match(shader.code, /struct Uniforms/);
    assert.match(shader.code, /@group\(0\) @binding\(0\) var source_sampler: sampler;/);
    assert.match(shader.code, /@group\(0\) @binding\(1\) var source_texture: texture_2d<f32>;/);
    assert.match(shader.code, /@group\(0\) @binding\(2\) var<uniform> uniforms: Uniforms;/);
    assert.match(shader.code, /@fragment/);
    assert.match(shader.code, /fn fragment_main/);
  }
});
