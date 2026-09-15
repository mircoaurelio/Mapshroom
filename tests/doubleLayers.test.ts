import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTimelineDoubleLayerShaderCode, buildTimelineTransitionShaderCode } from '../src/lib/timelineShader.ts';
import { buildFragmentShaderSourceForTarget } from '../src/lib/shaderCompiler.ts';

test('Double wraps each stream separately and preserves uniforms and sampler bindings', () => {
  const shader = (channel: string) => `uniform float u_amount;\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return texture2D(tex, uv) * vec4(${channel}, u_amount); }`;
  const pair = buildTimelineTransitionShaderCode({ fromCode: shader('1., 0., 0.'), toCode: shader('0., 0., 1.'), effect: 'mix' });
  const wrapped = buildTimelineDoubleLayerShaderCode(pair);
  for (const name of pair.matchAll(/uniform\s+\w+\s+(\w+)/g)) assert.ok(wrapped.includes(name[0]), name[1]);
  assert.equal((wrapped.match(/vec4 processColor\(/g) ?? []).length, 1);
  assert.ok(wrapped.indexOf('if (coverage <= 0.0)') < wrapped.lastIndexOf('mapshroomDoubleContent(tex'));
  assert.ok(wrapped.length < pair.length + 1200, 'Wrapping adds a small mask, not another shader pair');
  assert.equal(buildTimelineDoubleLayerShaderCode(pair), wrapped);
  for (const target of ['webgl1', 'webgl2'] as const) {
    const fragment = buildFragmentShaderSourceForTarget(wrapped, target);
    assert.ok(fragment.includes('u_double_secondary'));
  }
});
