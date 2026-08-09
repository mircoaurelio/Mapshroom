export type FieldId = 'flow' | 'cells' | 'rings' | 'ribbons' | 'kaleido';
export type PaletteId = 'mint' | 'ember' | 'ultraviolet' | 'ice' | 'acid';
export type MixId = 'soft-light' | 'difference' | 'screen' | 'threshold';

export interface ShaderGenome {
  id: string;
  generation: number;
  lineage: 'origin' | 'mutation' | 'crossover';
  field: FieldId;
  palette: PaletteId;
  mix: MixId;
  seed: number;
  scale: number;
  speed: number;
  warp: number;
  symmetry: number;
}

export const FIELD_LABELS: Record<FieldId, string> = {
  flow: 'Flow field',
  cells: 'Cellular',
  rings: 'Orbit rings',
  ribbons: 'Ribbons',
  kaleido: 'Kaleido',
};

export const PALETTE_LABELS: Record<PaletteId, string> = {
  mint: 'Electric mint',
  ember: 'Ember',
  ultraviolet: 'Ultraviolet',
  ice: 'Polar ice',
  acid: 'Acid bloom',
};

export const MIX_LABELS: Record<MixId, string> = {
  'soft-light': 'Soft light',
  difference: 'Difference',
  screen: 'Screen',
  threshold: 'Threshold',
};

const fields = Object.keys(FIELD_LABELS) as FieldId[];
const palettes = Object.keys(PALETTE_LABELS) as PaletteId[];
const mixes = Object.keys(MIX_LABELS) as MixId[];

const fract = (value: number) => value - Math.floor(value);
const randomAt = (seed: number, slot: number) =>
  fract(Math.sin(seed * 91.733 + slot * 47.117) * 43758.5453);
const pick = <T,>(items: readonly T[], seed: number, slot: number) =>
  items[Math.floor(randomAt(seed, slot) * items.length) % items.length];
const range = (seed: number, slot: number, min: number, max: number) =>
  min + randomAt(seed, slot) * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function idFor(seed: number, generation: number, index: number) {
  return `spore-${generation}-${index}-${Math.abs(Math.round(seed * 1000)).toString(36)}`;
}

function createGenome(seed: number, generation: number, index: number): ShaderGenome {
  return {
    id: idFor(seed, generation, index),
    generation,
    lineage: generation === 0 ? 'origin' : 'crossover',
    field: pick(fields, seed, 1),
    palette: pick(palettes, seed, 2),
    mix: pick(mixes, seed, 3),
    seed,
    scale: range(seed, 4, 2.1, 6.8),
    speed: range(seed, 5, 0.16, 0.78),
    warp: range(seed, 6, 0.28, 1.2),
    symmetry: Math.round(range(seed, 7, 3, 9)),
  };
}

export function createInitialColony(seed = Date.now() % 100000): ShaderGenome[] {
  return Array.from({ length: 9 }, (_, index) =>
    createGenome(seed + index * 19.31, 0, index),
  );
}

export function evolveGenome(parent: ShaderGenome): ShaderGenome[] {
  const generation = parent.generation + 1;

  return Array.from({ length: 9 }, (_, index) => {
    const seed = parent.seed + generation * 31.71 + index * 13.37;
    if (index < 5) {
      const mutation = (randomAt(seed, index) - 0.5) * (0.16 + index * 0.035);
      return {
        ...parent,
        id: idFor(seed, generation, index),
        generation,
        lineage: 'mutation',
        seed,
        scale: clamp(parent.scale * (1 + mutation), 1.6, 8),
        speed: clamp(parent.speed + mutation * 0.45, 0.08, 1.1),
        warp: clamp(parent.warp + mutation * 1.6, 0.12, 1.5),
        symmetry: index === 4
          ? clamp(parent.symmetry + (randomAt(seed, 12) > 0.5 ? 1 : -1), 2, 10)
          : parent.symmetry,
      };
    }

    const child = createGenome(seed, generation, index);
    return {
      ...child,
      lineage: 'crossover',
      field: index === 5 ? parent.field : child.field,
      palette: index === 6 ? parent.palette : child.palette,
      mix: index === 7 ? parent.mix : child.mix,
      scale: index === 8 ? parent.scale : child.scale,
      warp: (child.warp + parent.warp) / 2,
    };
  });
}

const fieldNames: Record<FieldId, string> = {
  flow: 'Drift',
  cells: 'Cells',
  rings: 'Orbit',
  ribbons: 'Ribbon',
  kaleido: 'Prism',
};

const paletteNames: Record<PaletteId, string> = {
  mint: 'Mint',
  ember: 'Ember',
  ultraviolet: 'Ultra',
  ice: 'Ice',
  acid: 'Acid',
};

export function getGenomeName(genome: ShaderGenome) {
  return `${paletteNames[genome.palette]} ${fieldNames[genome.field]}`;
}

const fieldIndexes: Record<FieldId, number> = { flow: 0, cells: 1, rings: 2, ribbons: 3, kaleido: 4 };
const paletteIndexes: Record<PaletteId, number> = { mint: 0, ember: 1, ultraviolet: 2, ice: 3, acid: 4 };
const mixIndexes: Record<MixId, number> = { 'soft-light': 0, difference: 1, screen: 2, threshold: 3 };

export function buildFragmentShader(genome: ShaderGenome) {
  return `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 mapshroom_fragColor;

#define FIELD ${fieldIndexes[genome.field]}
#define PALETTE ${paletteIndexes[genome.palette]}
#define MIX_MODE ${mixIndexes[genome.mix]}

const float PI = 3.14159265359;
const float SEED = ${genome.seed.toFixed(4)};
const float SCALE = ${genome.scale.toFixed(4)};
const float SPEED = ${genome.speed.toFixed(4)};
const float WARP = ${genome.warp.toFixed(4)};
const float SYMMETRY = ${genome.symmetry.toFixed(1)};

mat2 rotate2d(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345 + SEED * 0.001);
  return fract(p.x * p.y);
}

float noise2d(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.52;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise2d(p);
    p = rotate2d(0.47) * p * 2.03 + 4.2;
    amplitude *= 0.5;
  }
  return value;
}

vec2 kaleido(vec2 p) {
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float sector = 2.0 * PI / SYMMETRY;
  angle = abs(mod(angle + sector * 0.5, sector) - sector * 0.5);
  return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t) {
#if PALETTE == 0
  return vec3(0.48, 0.54, 0.51) + vec3(0.48, 0.46, 0.44) * cos(6.28318 * (t + vec3(0.04, 0.28, 0.56)));
#elif PALETTE == 1
  return vec3(0.52, 0.34, 0.22) + vec3(0.48, 0.36, 0.30) * cos(6.28318 * (t + vec3(0.02, 0.08, 0.15)));
#elif PALETTE == 2
  return vec3(0.43, 0.35, 0.58) + vec3(0.48, 0.38, 0.44) * cos(6.28318 * (t + vec3(0.76, 0.02, 0.36)));
#elif PALETTE == 3
  return vec3(0.42, 0.58, 0.66) + vec3(0.42, 0.40, 0.34) * cos(6.28318 * (t + vec3(0.58, 0.38, 0.22)));
#else
  return vec3(0.52, 0.54, 0.20) + vec3(0.46, 0.44, 0.26) * cos(6.28318 * (t + vec3(0.20, 0.52, 0.06)));
#endif
}

float field(vec2 p, float time) {
  vec2 q = p;
  float n = fbm(q * 1.35 + vec2(time * 0.3, -time * 0.19));
  q += WARP * vec2(n - 0.5, fbm(q * 1.7 - time * 0.2) - 0.5);
#if FIELD == 0
  return sin(q.x * SCALE + n * 6.0 + time) * cos(q.y * (SCALE * 0.72) - time * 0.7);
#elif FIELD == 1
  vec2 cell = fract(q * SCALE) - 0.5;
  return 1.0 - length(cell) * 2.1 + 0.22 * sin(n * 12.0 + time);
#elif FIELD == 2
  return sin(length(q) * SCALE * 3.2 - time * 1.8 + n * 5.0);
#elif FIELD == 3
  return sin((q.y + sin(q.x * 2.2 + time) * WARP) * SCALE * 2.4);
#else
  q = kaleido(rotate2d(time * 0.08) * q);
  return sin(q.x * SCALE * 2.0 + n * 7.0 - time);
#endif
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float time = u_time * SPEED;
  float a = field(p, time);
  float b = field(rotate2d(1.047 + WARP * 0.18) * p * 1.13, -time * 0.73);
  float energy;
#if MIX_MODE == 0
  energy = a * 0.65 + b * 0.35;
#elif MIX_MODE == 1
  energy = abs(a - b) * 1.6 - 0.5;
#elif MIX_MODE == 2
  energy = 1.0 - (1.0 - abs(a)) * (1.0 - abs(b));
#else
  energy = smoothstep(0.18, 0.24, abs(a + b)) * 2.0 - 1.0;
#endif
  float edge = smoothstep(0.34, 0.92, abs(energy));
  vec3 color = palette(energy * 0.17 + length(p) * 0.11 + time * 0.04);
  color *= 0.28 + edge * 1.25;
  color += palette(energy * 0.31 + 0.38) * pow(1.0 - abs(energy), 5.0) * 0.5;
  color *= smoothstep(1.7, 0.18, length(p));
  color = pow(max(color, 0.0), vec3(0.86));
  mapshroom_fragColor = vec4(color, 1.0);
}`;
}
