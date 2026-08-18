export type FieldId =
  | 'flow' | 'cells' | 'rings' | 'ribbons' | 'kaleido'
  | 'contours' | 'spiral' | 'shards' | 'plasma';
export type PaletteId =
  | 'mint' | 'ember' | 'ultraviolet' | 'ice' | 'acid'
  | 'rose' | 'cobalt' | 'mono' | 'sunset';
export type MixId = 'soft-light' | 'difference' | 'screen' | 'threshold' | 'multiply' | 'bands';

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
  cells: 'Organic cells',
  rings: 'Orbit rings',
  ribbons: 'Ribbons',
  kaleido: 'Kaleido',
  contours: 'Depth contours',
  spiral: 'Depth spiral',
  shards: 'Crystal shards',
  plasma: 'Plasma weave',
};

export const PALETTE_LABELS: Record<PaletteId, string> = {
  mint: 'Electric mint',
  ember: 'Ember',
  ultraviolet: 'Ultraviolet',
  ice: 'Polar ice',
  acid: 'Acid bloom',
  rose: 'Hot rose',
  cobalt: 'Cobalt flare',
  mono: 'Silver monochrome',
  sunset: 'Solar sunset',
};

export const MIX_LABELS: Record<MixId, string> = {
  'soft-light': 'Soft light',
  difference: 'Difference',
  screen: 'Screen',
  threshold: 'Threshold',
  multiply: 'Multiply',
  bands: 'Depth bands',
};

const fields = Object.keys(FIELD_LABELS) as FieldId[];
const palettes = Object.keys(PALETTE_LABELS) as PaletteId[];
const mixes = Object.keys(MIX_LABELS) as MixId[];

const fract = (value: number) => value - Math.floor(value);
const randomAt = (seed: number, slot: number) =>
  fract(Math.sin(seed * 91.733 + slot * 47.117) * 43758.5453);
const pick = <T,>(items: readonly T[], seed: number, slot: number) =>
  items[Math.floor(randomAt(seed, slot) * items.length) % items.length];
const pickDifferent = <T,>(items: readonly T[], current: T, seed: number, slot: number) =>
  pick(items.filter((item) => item !== current), seed, slot);
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
  const fieldOffset = Math.floor(randomAt(seed, 70) * fields.length);
  const paletteOffset = Math.floor(randomAt(seed, 71) * palettes.length);
  return Array.from({ length: 9 }, (_, index) => ({
    ...createGenome(seed + index * 19.31, 0, index),
    field: fields[(fieldOffset + index) % fields.length],
    palette: palettes[(paletteOffset + index * 4) % palettes.length],
    mix: mixes[(index + Math.floor(randomAt(seed, 72) * mixes.length)) % mixes.length],
  }));
}

export function evolveGenome(parent: ShaderGenome): ShaderGenome[] {
  const generation = parent.generation + 1;

  return Array.from({ length: 9 }, (_, index) => {
    const seed = parent.seed + generation * 31.71 + index * 13.37;
    const fresh = createGenome(seed, generation, index);
    const parentFieldIndex = fields.indexOf(parent.field);
    const parentPaletteIndex = palettes.indexOf(parent.palette);

    if (index === 0) {
      const mutation = (randomAt(seed, 9) - 0.5) * 0.13;
      return {
        ...parent,
        id: fresh.id,
        generation,
        lineage: 'mutation',
        seed,
        scale: clamp(parent.scale * (1 + mutation), 1.6, 8),
        speed: clamp(parent.speed + mutation * 0.32, 0.08, 1.1),
        warp: clamp(parent.warp + mutation * 1.1, 0.12, 1.5),
      };
    }

    if (index < 5) {
      const field = fields[(parentFieldIndex + index) % fields.length];
      const palette = palettes[(parentPaletteIndex + index * 2 + 1) % palettes.length];
      const mix = index === 3
        ? parent.mix
        : pickDifferent(mixes, parent.mix, seed, 30 + index);
      return {
        ...fresh,
        lineage: 'mutation',
        field,
        palette,
        mix,
        scale: index === 1 ? clamp(parent.scale * 1.42, 1.8, 8) : fresh.scale,
        warp: index === 2 ? clamp(parent.warp * 0.58 + 0.18, 0.12, 1.5) : fresh.warp,
        symmetry: index === 4
          ? clamp(parent.symmetry + (randomAt(seed, 44) > 0.5 ? 2 : -2), 2, 10)
          : fresh.symmetry,
      };
    }

    return {
      ...fresh,
      lineage: 'crossover',
      field: fields[(parentFieldIndex + index) % fields.length],
      palette: palettes[(parentPaletteIndex + index * 2 + 1) % palettes.length],
      mix: index === 7 ? parent.mix : fresh.mix,
      scale: index === 8 ? parent.scale : fresh.scale,
      warp: index === 5 ? (fresh.warp + parent.warp) / 2 : fresh.warp,
    };
  });
}

const fieldNames: Record<FieldId, string> = {
  flow: 'Drift', cells: 'Cells', rings: 'Orbit', ribbons: 'Ribbon', kaleido: 'Prism',
  contours: 'Contours', spiral: 'Spiral', shards: 'Shards', plasma: 'Plasma',
};
const paletteNames: Record<PaletteId, string> = {
  mint: 'Mint', ember: 'Ember', ultraviolet: 'Ultra', ice: 'Ice', acid: 'Acid',
  rose: 'Rose', cobalt: 'Cobalt', mono: 'Silver', sunset: 'Solar',
};

export function getGenomeName(genome: ShaderGenome) {
  return `${paletteNames[genome.palette]} ${fieldNames[genome.field]}`;
}

const fieldIndexes: Record<FieldId, number> = {
  flow: 0, cells: 1, rings: 2, ribbons: 3, kaleido: 4,
  contours: 5, spiral: 6, shards: 7, plasma: 8,
};
const paletteIndexes: Record<PaletteId, number> = {
  mint: 0, ember: 1, ultraviolet: 2, ice: 3, acid: 4,
  rose: 5, cobalt: 6, mono: 7, sunset: 8,
};
const mixIndexes: Record<MixId, number> = {
  'soft-light': 0, difference: 1, screen: 2, threshold: 3, multiply: 4, bands: 5,
};

export function buildMapshroomShader(genome: ShaderGenome) {
  return `// NAME: ${getGenomeName(genome)}
#define SPORE_FIELD ${fieldIndexes[genome.field]}
#define SPORE_PALETTE ${paletteIndexes[genome.palette]}
#define SPORE_MIX_MODE ${mixIndexes[genome.mix]}

uniform float sporeSpeed; // @min -2.0 @max 2.0 @default ${genome.speed.toFixed(4)}
uniform float sporeScale; // @min 1.0 @max 10.0 @default ${genome.scale.toFixed(4)}
uniform float sporeWarp; // @min 0.0 @max 2.0 @default ${genome.warp.toFixed(4)}
uniform float depthRelief; // @min 0.0 @max 4.0 @default 1.0
uniform float maskThreshold; // @min 0.0 @max 0.1 @default 0.01

const float SPORE_PI = 3.14159265359;
const float SPORE_SEED = ${genome.seed.toFixed(4)};
#define SPORE_SCALE sporeScale
#define SPORE_SPEED sporeSpeed
#define SPORE_WARP sporeWarp
const float SPORE_SYMMETRY = ${genome.symmetry.toFixed(1)};

mat2 spore_rotate(float angle) {
  float sine = sin(angle), cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float spore_hash(vec2 point) {
  point = fract(point * vec2(123.34, 345.45));
  point += dot(point, point + 34.345 + SPORE_SEED * 0.001);
  return fract(point.x * point.y);
}

vec2 spore_hash2(vec2 point) {
  return vec2(spore_hash(point), spore_hash(point + vec2(27.17, 83.41)));
}

float spore_noise(vec2 point) {
  vec2 cell = floor(point), local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(spore_hash(cell), spore_hash(cell + vec2(1.0, 0.0)), local.x),
    mix(spore_hash(cell + vec2(0.0, 1.0)), spore_hash(cell + vec2(1.0)), local.x),
    local.y
  );
}

float spore_fbm(vec2 point) {
  float value = 0.0, amplitude = 0.52;
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * spore_noise(point);
    point = spore_rotate(0.47) * point * 2.03 + vec2(4.2, -2.8);
    amplitude *= 0.5;
  }
  return value;
}

float spore_cells(vec2 point) {
  vec2 baseCell = floor(point);
  vec2 local = fract(point);
  float nearest = 8.0;
  float secondNearest = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 feature = neighbor + 0.16 + 0.68 * spore_hash2(baseCell + neighbor) - local;
      float distanceSquared = dot(feature, feature);
      if (distanceSquared < nearest) {
        secondNearest = nearest;
        nearest = distanceSquared;
      } else if (distanceSquared < secondNearest) {
        secondNearest = distanceSquared;
      }
    }
  }
  return sqrt(secondNearest) - sqrt(nearest);
}

vec2 spore_kaleido(vec2 point) {
  float radius = length(point);
  float angle = atan(point.y, point.x);
  float sector = 2.0 * SPORE_PI / SPORE_SYMMETRY;
  angle = abs(mod(angle + sector * 0.5, sector) - sector * 0.5);
  return vec2(cos(angle), sin(angle)) * radius;
}

vec3 spore_palette(float phase) {
#if SPORE_PALETTE == 0
  return vec3(0.48, 0.54, 0.51) + vec3(0.48, 0.46, 0.44) * cos(6.28318 * (phase + vec3(0.04, 0.28, 0.56)));
#elif SPORE_PALETTE == 1
  return vec3(0.52, 0.34, 0.22) + vec3(0.48, 0.36, 0.30) * cos(6.28318 * (phase + vec3(0.02, 0.08, 0.15)));
#elif SPORE_PALETTE == 2
  return vec3(0.43, 0.35, 0.58) + vec3(0.48, 0.38, 0.44) * cos(6.28318 * (phase + vec3(0.76, 0.02, 0.36)));
#elif SPORE_PALETTE == 3
  return vec3(0.42, 0.58, 0.66) + vec3(0.42, 0.40, 0.34) * cos(6.28318 * (phase + vec3(0.58, 0.38, 0.22)));
#else
  return vec3(0.52, 0.54, 0.20) + vec3(0.46, 0.44, 0.26) * cos(6.28318 * (phase + vec3(0.20, 0.52, 0.06)));
#endif
}

float spore_field(vec2 point, float localTime, float sourceDepth) {
  vec2 warpedPoint = point;
  float primaryNoise = spore_fbm(warpedPoint * 1.35 + vec2(localTime * 0.3, -localTime * 0.19));
  warpedPoint += SPORE_WARP * vec2(
    primaryNoise - 0.5,
    spore_fbm(warpedPoint * 1.7 - localTime * 0.2) - 0.5
  );
#if SPORE_FIELD == 0
  return sin(warpedPoint.x * SPORE_SCALE + primaryNoise * 6.0 + localTime) *
    cos(warpedPoint.y * (SPORE_SCALE * 0.72) - localTime * 0.7);
#elif SPORE_FIELD == 1
  float organicCell = spore_cells(warpedPoint * SPORE_SCALE * 0.72 + localTime * 0.08);
  return sin(organicCell * 12.0 - localTime) * 0.76 + (primaryNoise - 0.5) * 0.52;
#elif SPORE_FIELD == 2
  float radialWarp = primaryNoise * 0.34 + sin(atan(warpedPoint.y, warpedPoint.x) * 3.0) * 0.08;
  return sin((length(warpedPoint) + radialWarp) * SPORE_SCALE * 3.2 - localTime * 1.8);
#elif SPORE_FIELD == 3
  return sin((warpedPoint.y + sin(warpedPoint.x * 2.2 + localTime) * SPORE_WARP) * SPORE_SCALE * 2.4);
#elif SPORE_FIELD == 4
  warpedPoint = spore_kaleido(spore_rotate(localTime * 0.08) * warpedPoint);
  return sin(warpedPoint.x * SPORE_SCALE * 2.0 + primaryNoise * 7.0 - localTime);
#elif SPORE_FIELD == 5
  return sin((sourceDepth * 7.0 + primaryNoise * 1.8 + warpedPoint.y * 0.4) * SPORE_SCALE - localTime);
#elif SPORE_FIELD == 6
  float spiralAngle = atan(warpedPoint.y, warpedPoint.x);
  return sin(length(warpedPoint) * SPORE_SCALE * 4.2 - spiralAngle * SPORE_SYMMETRY + localTime * 1.4);
#elif SPORE_FIELD == 7
  float shardAngle = atan(warpedPoint.y, warpedPoint.x);
  float shardRadius = length(warpedPoint);
  float shardSector = floor((shardAngle + SPORE_PI) * SPORE_SYMMETRY / (2.0 * SPORE_PI));
  return sin(shardRadius * SPORE_SCALE * 5.0 + shardSector * 2.17 - localTime) * (0.45 + sourceDepth);
#else
  float plasmaA = sin(warpedPoint.x * SPORE_SCALE * 1.8 + localTime);
  float plasmaB = sin(warpedPoint.y * SPORE_SCALE * 2.3 - localTime * 1.27);
  float plasmaC = sin((warpedPoint.x + warpedPoint.y) * SPORE_SCALE + sourceDepth * 8.0);
  return (plasmaA + plasmaB + plasmaC) / 3.0;
#endif
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  ivec2 sourceSize = textureSize(tex, 0);
  ivec2 sourcePixel = clamp(
    ivec2(floor(uv * vec2(sourceSize))),
    ivec2(0),
    sourceSize - ivec2(1)
  );
  vec3 source = texelFetch(tex, sourcePixel, 0).rgb;
  float sourceMaximum = max(source.r, max(source.g, source.b));

  // The source is a depth map: true black is background and must never be shaded.
  if (sourceMaximum <= maskThreshold) {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }

  vec2 texel = 1.0 / vec2(sourceSize);
  float depth = dot(texture(tex, uv).rgb, vec3(0.299, 0.587, 0.114));
  float depthLeft = dot(texture(tex, clamp(uv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
  float depthRight = dot(texture(tex, clamp(uv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
  float depthDown = dot(texture(tex, clamp(uv - vec2(0.0, texel.y), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
  float depthUp = dot(texture(tex, clamp(uv + vec2(0.0, texel.y), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
  vec2 depthSlope = vec2(depthRight - depthLeft, depthUp - depthDown);

  vec2 centeredUv = uv - 0.5;
  vec2 depthUv = uv;
  depthUv += depthSlope * depthRelief * (0.9 + SPORE_WARP * 1.4);
  depthUv += centeredUv * (depth - 0.5) * (0.10 + SPORE_WARP * 0.035);

  vec2 point = depthUv * 2.0 - 1.0;
  point.x *= resolution.x / max(resolution.y, 1.0);
  point *= mix(1.34, 0.76, depth);
  point += depthSlope * depthRelief * SPORE_WARP * 2.2;
  float localTime = time * SPORE_SPEED * mix(0.68, 1.32, depth);
  float firstField = spore_field(point, localTime, depth);
  float secondField = spore_field(
    spore_rotate(1.047 + SPORE_WARP * 0.18 + depth * 0.32) * point * (1.03 + depth * 0.20),
    -localTime * 0.73 + depth * 1.6,
    depth
  );
  float energy;
#if SPORE_MIX_MODE == 0
  energy = firstField * 0.65 + secondField * 0.35;
#elif SPORE_MIX_MODE == 1
  energy = abs(firstField - secondField) * 1.6 - 0.5;
#elif SPORE_MIX_MODE == 2
  energy = 1.0 - (1.0 - abs(firstField)) * (1.0 - abs(secondField));
#elif SPORE_MIX_MODE == 3
  energy = smoothstep(0.18, 0.24, abs(firstField + secondField)) * 2.0 - 1.0;
#elif SPORE_MIX_MODE == 4
  energy = firstField * secondField * 1.7;
#else
  energy = floor((firstField * 0.5 + secondField * 0.5 + 1.0) * 4.0) / 4.0 - 0.5;
#endif
  energy += (depth - 0.5) * 0.74 + dot(depthSlope, vec2(1.7, -1.25));
  float edge = smoothstep(0.34, 0.92, abs(energy));
  vec3 color = spore_palette(energy * 0.17 + length(point) * 0.11 + localTime * 0.04 + depth * 0.24);
  color *= 0.28 + edge * 1.25;
  color += spore_palette(energy * 0.31 + 0.38) * pow(1.0 - min(abs(energy), 1.0), 5.0) * 0.5;
  color *= mix(0.30, 1.34, smoothstep(0.02, 0.98, depth));
  color += spore_palette(depth * 0.82 + energy * 0.08) * depth * 0.16;
  color *= smoothstep(1.72, 0.12, length(point));
  color = pow(max(color, 0.0), vec3(0.86));
  return vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
}

export function buildFragmentShader(genome: ShaderGenome) {
  return `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 mapshroom_fragColor;

${buildMapshroomShader(genome)}

void main() {
  mapshroom_fragColor = processColor(u_image, v_uv, u_time, u_resolution);
}`;
}
