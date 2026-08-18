import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFragmentShader,
  buildMapshroomShader,
  createInitialColony,
  evolveGenome,
} from '../src/shaderLab/shaderEvolution.ts';

test('the initial Spore colony is deterministic and covers every field and palette', () => {
  const first = createInitialColony(12345);
  const second = createInitialColony(12345);

  assert.deepEqual(first, second);
  assert.equal(first.length, 9);
  assert.equal(new Set(first.map((genome) => genome.id)).size, 9);
  assert.equal(new Set(first.map((genome) => genome.field)).size, 9);
  assert.equal(new Set(first.map((genome) => genome.palette)).size, 9);
  assert.ok(first.every((genome) => genome.generation === 0 && genome.lineage === 'origin'));
});

test('evolution keeps one close mutation and creates eight distinct directions', () => {
  const parent = createInitialColony(12345)[0];
  const children = evolveGenome(parent);

  assert.equal(children.length, 9);
  assert.equal(new Set(children.map((genome) => genome.id)).size, 9);
  assert.ok(children.every((genome) => genome.generation === parent.generation + 1));
  assert.deepEqual(
    {
      field: children[0].field,
      palette: children[0].palette,
      mix: children[0].mix,
      symmetry: children[0].symmetry,
    },
    {
      field: parent.field,
      palette: parent.palette,
      mix: parent.mix,
      symmetry: parent.symmetry,
    },
  );
  assert.equal(children[0].lineage, 'mutation');
  assert.equal(children.filter((genome) => genome.lineage === 'crossover').length, 4);
});

test('Spore emits an official depth-aware shader body with usable controls', () => {
  const shader = buildMapshroomShader(createInitialColony(12345)[0]);

  assert.match(shader, /^\/\/ NAME:/);
  assert.match(shader, /vec4 processColor\(sampler2D tex, vec2 uv, float time, vec2 resolution\)/);
  assert.match(shader, /textureSize\(tex, 0\)/);
  assert.match(shader, /texelFetch\(tex, sourcePixel, 0\)/);
  assert.match(shader, /uniform float depthRelief; \/\/ @min 0\.0 @max 4\.0 @default 1\.0/);
  assert.match(shader, /uniform float maskThreshold; \/\/ @min 0\.0 @max 0\.1 @default 0\.01/);
  assert.equal((shader.match(/\/\/ @min /g) ?? []).length, 5);
});

test('the standalone Spore preview wraps the same body as GLSL ES 3.00', () => {
  const genome = createInitialColony(12345)[0];
  const body = buildMapshroomShader(genome);
  const fragment = buildFragmentShader(genome);

  assert.ok(fragment.startsWith('#version 300 es'));
  assert.ok(fragment.includes(body));
  assert.match(fragment, /mapshroom_fragColor = processColor\(u_image, v_uv, u_time, u_resolution\);/);
});
