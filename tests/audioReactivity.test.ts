import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeAudioReactiveUniforms,
  buildAudioReactiveBindings,
} from '../src/lib/audioReactivity.ts';
import type {
  ShaderUniformMap,
  ShaderUniformValueMap,
} from '../src/types.ts';

function createDefinitions(
  ranges: Record<string, [min: number, max: number, defaultValue: number]>,
): ShaderUniformMap {
  return Object.fromEntries(
    Object.entries(ranges).map(([name, [min, max, defaultValue]]) => [
      name,
      { type: 'float', min, max, default: defaultValue },
    ]),
  );
}

const DARK_MASKED_SPIRAL_EYE_CODE = `
uniform float speed; // @min -10.0 @max 10.0 @default 5.0
uniform float speed2; // @min -10.0 @max 10.0 @default 3.0
uniform float lineLength; // @min 1.0 @max 10.0 @default 1.0
uniform float distOffset; // @min 0.0 @max 20.0 @default 10.0
uniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0
uniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0
uniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0
uniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3
uniform float eyeRange; // @min 0.0 @max 0.4 @default 0.15
uniform float eyeSize; // @min 0.05 @max 0.4 @default 0.2

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  vec2 centeredUv = uv - 0.5;
  float dist = length(centeredUv);
  float angle = atan(centeredUv.y, centeredUv.x);
  float seg1 = sin(angle * lineLength + time * speed - dist * distOffset);
  float seg2 = sin(angle * lineLength - time * speed2 - dist * distOffset * 0.7);
  vec3 lineColor = vec3(sin(dist * waveFreq - time * speed));
  float blob = sin(dist * spiralScale - time * spiralSpeed);
  float sizeMask = smoothstep(spiralSize, 0.05, dist);
  vec2 eyePos = vec2(0.5) + vec2(sin(time * 0.7), cos(time * 0.9)) * eyeRange;
  float eyeMask = smoothstep(eyeSize, eyeSize - 0.02, length(uv - eyePos));
  return vec4(lineColor * (seg1 + seg2 + blob + sizeMask + eyeMask), 1.0);
}
`;

const DARK_MASKED_SPIRAL_EYE_DEFINITIONS = createDefinitions({
  speed: [-10, 10, 5],
  speed2: [-10, 10, 3],
  lineLength: [1, 10, 1],
  distOffset: [0, 20, 10],
  waveFreq: [1, 50, 20],
  spiralScale: [5, 100, 40],
  spiralSpeed: [-20, 20, 7],
  spiralSize: [0.05, 1, 0.3],
  eyeRange: [0, 0.4, 0.15],
  eyeSize: [0.05, 0.4, 0.2],
});

test('analyzes Dark Masked Spiral Eye using shader semantics and a five-control limit', () => {
  const analyses = analyzeAudioReactiveUniforms({
    shaderCode: DARK_MASKED_SPIRAL_EYE_CODE,
    uniformDefinitions: DARK_MASKED_SPIRAL_EYE_DEFINITIONS,
  });
  const byName = new Map(analyses.map((analysis) => [analysis.name, analysis]));
  const enabledNames = analyses
    .filter((analysis) => analysis.enabled)
    .map((analysis) => analysis.name);

  assert.deepEqual(enabledNames, [
    'speed',
    'lineLength',
    'distOffset',
    'waveFreq',
    'eyeRange',
  ]);
  assert.equal(byName.get('speed')?.signal, 'tempo');
  assert.equal(byName.get('speed2')?.enabled, false);
  assert.equal(byName.get('lineLength')?.signal, 'high');
  assert.equal(byName.get('distOffset')?.signal, 'bass');
  assert.equal(byName.get('waveFreq')?.signal, 'high');
  assert.equal(byName.get('spiralScale')?.signal, 'high');
  assert.equal(byName.get('eyeRange')?.signal, 'beat');
  assert.equal(byName.get('eyeSize')?.signal, 'bass');
});

test('keeps thresholds, seeds, and fixed ranges disabled by default', () => {
  const shaderCode = `
uniform float intensity; // @min 0.0 @max 2.0 @default 1.0
uniform float threshold; // @min 0.0 @max 1.0 @default 0.2
uniform float seed; // @min 0.0 @max 100.0 @default 2.0
uniform float fixedValue; // @min 1.0 @max 1.0 @default 1.0
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  vec4 source = texture2D(tex, uv);
  float mask = smoothstep(threshold, threshold + 0.1, source.r);
  float energy = source.r * intensity + seed * 0.0001 + fixedValue;
  return vec4(vec3(energy * mask), source.a);
}
`;
  const analyses = analyzeAudioReactiveUniforms({
    shaderCode,
    uniformDefinitions: createDefinitions({
      intensity: [0, 2, 1],
      threshold: [0, 1, 0.2],
      seed: [0, 100, 2],
      fixedValue: [1, 1, 1],
    }),
  });
  const byName = new Map(analyses.map((analysis) => [analysis.name, analysis]));

  assert.equal(byName.get('intensity')?.signal, 'bass');
  assert.equal(byName.get('intensity')?.enabled, true);
  assert.equal(byName.get('threshold')?.safe, false);
  assert.equal(byName.get('threshold')?.enabled, false);
  assert.equal(byName.get('seed')?.safe, false);
  assert.equal(byName.get('seed')?.enabled, false);
  assert.equal(byName.get('fixedValue')?.safe, false);
  assert.equal(byName.get('fixedValue')?.enabled, false);
});

test('honors explicit @audio signal and off annotations', () => {
  const shaderCode = `
uniform float flash; // @min 0.0 @max 1.0 @default 0.2 @audio beat
uniform float threshold; // @min 0.0 @max 1.0 @default 0.1 @audio off
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  vec4 source = texture2D(tex, uv);
  return vec4(source.rgb * flash * step(threshold, source.r), source.a);
}
`;
  const analyses = analyzeAudioReactiveUniforms({
    shaderCode,
    uniformDefinitions: createDefinitions({
      flash: [0, 1, 0.2],
      threshold: [0, 1, 0.1],
    }),
  });
  const byName = new Map(analyses.map((analysis) => [analysis.name, analysis]));

  assert.equal(byName.get('flash')?.source, 'annotation');
  assert.equal(byName.get('flash')?.signal, 'beat');
  assert.equal(byName.get('flash')?.enabled, true);
  assert.equal(byName.get('threshold')?.source, 'annotation');
  assert.equal(byName.get('threshold')?.enabled, false);
});

test('keeps random mapping mode intentionally unrestricted', () => {
  const uniformValues: ShaderUniformValueMap = Object.fromEntries(
    Object.entries(DARK_MASKED_SPIRAL_EYE_DEFINITIONS).map(([name, definition]) => [
      name,
      definition.default,
    ]),
  );
  const bindings = buildAudioReactiveBindings({
    shaderCode: DARK_MASKED_SPIRAL_EYE_CODE,
    uniformDefinitions: DARK_MASKED_SPIRAL_EYE_DEFINITIONS,
    uniformValues,
    mode: 'random',
  });

  assert.equal(Object.keys(bindings).length, 10);
  assert.equal(
    Object.values(bindings).every((binding) => binding.enabled),
    true,
  );
});
