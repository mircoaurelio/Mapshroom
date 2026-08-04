import type { ShaderTemplate, ShaderUniformValueMap } from '../../../types';
import type { ShaderPresetDefinition } from '../types';

export interface MaskedAtelierSpec {
  id: string;
  name: string;
  group: string;
  description: string;
  template: ShaderTemplate;
  templates?: ShaderTemplate[];
  speed: number;
  intensity: number;
  scale: number;
  reliefDepth: number;
  blackCut: number;
  detail: number;
  normalSampleRadius?: number;
  edgeGlow?: number;
  accentA: [number, number, number];
  accentB: [number, number, number];
  accentC: [number, number, number];
  effect: string;
}

export interface DrawingAtelierSpec {
  id: string;
  name: string;
  group: string;
  description: string;
  speed: number;
  intensity: number;
  scale: number;
  lineThreshold: number;
  lineGain: number;
  darkPaper: boolean;
  accentA: [number, number, number];
  accentB: [number, number, number];
  accentC: [number, number, number];
  effect: string;
}

const sharedAtelierLibrary = `
const float ATELIER_PI = 3.14159265359;
const float ATELIER_TAU = 6.28318530718;

float atelier_sat(float value) {
    return clamp(value, 0.0, 1.0);
}

mat2 atelier_rot(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
}

float atelier_hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
}

vec2 atelier_hash22(vec2 point) {
    float seed = atelier_hash21(point);
    return fract(vec2(seed, seed * 1.2154 + 0.173) * vec2(437.17, 289.31));
}

float atelier_noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 curve = local * local * (3.0 - 2.0 * local);
    float a = atelier_hash21(cell);
    float b = atelier_hash21(cell + vec2(1.0, 0.0));
    float c = atelier_hash21(cell + vec2(0.0, 1.0));
    float d = atelier_hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float atelier_fbm(vec2 point) {
    float sum = 0.0;
    float amplitude = 0.52;
    mat2 transform = atelier_rot(0.61);
    for (int octave = 0; octave < 6; octave++) {
        sum += amplitude * atelier_noise(point);
        point = transform * point * 2.03 + vec2(1.73, -2.41);
        amplitude *= 0.49;
    }
    return sum;
}

float atelier_ridged(vec2 point) {
    float sum = 0.0;
    float amplitude = 0.56;
    mat2 transform = atelier_rot(-0.47);
    for (int octave = 0; octave < 5; octave++) {
        float ridge = 1.0 - abs(2.0 * atelier_noise(point) - 1.0);
        sum += ridge * ridge * amplitude;
        point = transform * point * 2.14 + vec2(-3.1, 1.2);
        amplitude *= 0.51;
    }
    return sum;
}

vec2 atelier_voronoi(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    float nearest = 8.0;
    float second = 8.0;
    for (int yIndex = 0; yIndex < 3; yIndex++) {
        for (int xIndex = 0; xIndex < 3; xIndex++) {
            vec2 offset = vec2(float(xIndex - 1), float(yIndex - 1));
            vec2 feature = offset + atelier_hash22(cell + offset) - local;
            float distanceSquared = dot(feature, feature);
            if (distanceSquared < nearest) {
                second = nearest;
                nearest = distanceSquared;
            } else if (distanceSquared < second) {
                second = distanceSquared;
            }
        }
    }
    return sqrt(vec2(nearest, second));
}

float atelier_hexDistance(vec2 point) {
    point = abs(point);
    return max(dot(point, normalize(vec2(1.0, 1.7320508))), point.x);
}

vec3 atelier_palette(float phase, vec3 a, vec3 b, vec3 c) {
    vec3 oscillation = 0.5 + 0.5 * cos(ATELIER_TAU * (phase + vec3(0.0, 0.31, 0.67)));
    return mix(a, b, oscillation) + c * pow(atelier_sat(1.0 - abs(phase * 2.0 - 1.0)), 4.0) * 0.35;
}

float atelier_band(float value, float center, float width) {
    float distanceToCenter = abs(value - center);
    return 1.0 - smoothstep(width * 0.45, width, distanceToCenter);
}

float atelier_line(float value, float width) {
    return 1.0 - smoothstep(width * 0.35, width, abs(value));
}

vec2 atelier_kaleido(vec2 point, float segments) {
    float angle = atan(point.y, point.x);
    float radius = length(point);
    float slice = ATELIER_TAU / max(segments, 1.0);
    angle = abs(mod(angle + slice * 0.5, slice) - slice * 0.5);
    return vec2(cos(angle), sin(angle)) * radius;
}
`;

function vec3Literal(value: [number, number, number]): string {
  return value.map((channel) => Number(channel.toFixed(4))).join(',');
}

export function buildMaskedAtelierPreset(spec: MaskedAtelierSpec): ShaderPresetDefinition {
  const code = `// NAME: ${spec.name}
uniform float speed; // @min 0.05 @max 3.0 @default ${spec.speed}
uniform float intensity; // @min 0.25 @max 2.2 @default ${spec.intensity}
uniform float scale; // @min 0.55 @max 2.4 @default ${spec.scale}
uniform float relief_depth; // @min 1.0 @max 18.0 @default ${spec.reliefDepth}
uniform float black_cut; // @min 0.0 @max 0.18 @default ${spec.blackCut}
uniform float detail; // @min 0.35 @max 2.5 @default ${spec.detail}
uniform vec3 accent_a; // @default ${vec3Literal(spec.accentA)}
uniform vec3 accent_b; // @default ${vec3Literal(spec.accentB)}
uniform vec3 accent_c; // @default ${vec3Literal(spec.accentC)}

${sharedAtelierLibrary}

${spec.effect}

float atelier_luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

float atelier_sourceSupport(vec3 color) {
    return max(max(color.r, color.g), color.b);
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float supportSeed = atelier_sourceSupport(source.rgb);
    if (supportSeed <= black_cut) {
        return vec4(0.0, 0.0, 0.0, source.a);
    }

    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    float normalSampleRadius = ${(spec.normalSampleRadius ?? 1).toFixed(1)};
    float centerLuma = atelier_luma(source.rgb);
    float leftLuma = atelier_luma(texture2D(
        tex,
        uv - vec2(pixel.x * normalSampleRadius, 0.0)
    ).rgb);
    float rightLuma = atelier_luma(texture2D(
        tex,
        uv + vec2(pixel.x * normalSampleRadius, 0.0)
    ).rgb);
    float downLuma = atelier_luma(texture2D(
        tex,
        uv - vec2(0.0, pixel.y * normalSampleRadius)
    ).rgb);
    float upLuma = atelier_luma(texture2D(
        tex,
        uv + vec2(0.0, pixel.y * normalSampleRadius)
    ).rgb);
    float farLeft = atelier_luma(texture2D(
        tex,
        uv - vec2(pixel.x * normalSampleRadius * 2.0, 0.0)
    ).rgb);
    float farRight = atelier_luma(texture2D(
        tex,
        uv + vec2(pixel.x * normalSampleRadius * 2.0, 0.0)
    ).rgb);
    float farDown = atelier_luma(texture2D(
        tex,
        uv - vec2(0.0, pixel.y * normalSampleRadius * 2.0)
    ).rgb);
    float farUp = atelier_luma(texture2D(
        tex,
        uv + vec2(0.0, pixel.y * normalSampleRadius * 2.0)
    ).rgb);

    vec2 gradient = vec2(rightLuma - leftLuma, upLuma - downLuma);
    vec3 normal = normalize(vec3(-gradient * relief_depth, 0.16 + 1.0 / relief_depth));
    float edge = atelier_sat(length(gradient) * (8.0 + relief_depth * 0.8));
    float curvature = clamp(
        (leftLuma + rightLuma + downLuma + upLuma - centerLuma * 4.0) * relief_depth,
        -1.0,
        1.0
    );
    float broadRelief = clamp(
        (farLeft + farRight + farDown + farUp - centerLuma * 4.0) * relief_depth * 0.45,
        -1.0,
        1.0
    );

    vec2 point = (uv * 2.0 - 1.0) * scale;
    point.x *= resolution.x / max(resolution.y, 1.0);
    float localTime = time * speed;
    vec3 material = atelier_material(
        point,
        localTime,
        centerLuma,
        edge,
        curvature,
        broadRelief,
        normal,
        source.rgb
    );

    float support = smoothstep(black_cut, black_cut + 0.075, supportSeed);
    float fineRelief = abs(centerLuma - (leftLuma + rightLuma + downLuma + upLuma) * 0.25);
    float silhouette = smoothstep(0.04, 0.7, edge + fineRelief * 9.0);
    vec3 grazingColor = mix(accent_b, accent_c, 0.5 + 0.5 * normal.x);
    material += grazingColor * silhouette * (0.06 + 0.13 * detail) *
        ${(spec.edgeGlow ?? 1).toFixed(2)};
    material *= 0.86 + 0.22 * pow(atelier_sat(centerLuma), 0.65);
    material = max(material, vec3(0.0));
    material = vec3(1.0) - exp(-material * intensity);
    material = pow(max(material, vec3(0.0)), vec3(0.88));
    material *= support;

    if (support < 0.002) {
        material = vec3(0.0);
    }
    return vec4(clamp(material, 0.0, 1.0), source.a);
}`;

  const uniformValues: ShaderUniformValueMap = {
    speed: spec.speed,
    intensity: spec.intensity,
    scale: spec.scale,
    relief_depth: spec.reliefDepth,
    black_cut: spec.blackCut,
    detail: spec.detail,
    accent_a: spec.accentA,
    accent_b: spec.accentB,
    accent_c: spec.accentC,
  };

  return {
    id: spec.id,
    name: spec.name,
    template: spec.template,
    templates: spec.templates,
    group: spec.group,
    description: spec.description,
    code,
    uniformValues,
  };
}

export function buildDrawingAtelierPreset(spec: DrawingAtelierSpec): ShaderPresetDefinition {
  const code = `// NAME: ${spec.name}
uniform float speed; // @min 0.05 @max 3.0 @default ${spec.speed}
uniform float intensity; // @min 0.25 @max 2.0 @default ${spec.intensity}
uniform float scale; // @min 0.55 @max 2.4 @default ${spec.scale}
uniform float line_threshold; // @min 0.35 @max 0.95 @default ${spec.lineThreshold}
uniform float line_gain; // @min 0.4 @max 2.5 @default ${spec.lineGain}
uniform bool dark_paper; // @default ${spec.darkPaper}
uniform vec3 accent_a; // @default ${vec3Literal(spec.accentA)}
uniform vec3 accent_b; // @default ${vec3Literal(spec.accentB)}
uniform vec3 accent_c; // @default ${vec3Literal(spec.accentC)}

${sharedAtelierLibrary}

${spec.effect}

float atelier_luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    float centerLuma = atelier_luma(source.rgb);
    float leftLuma = atelier_luma(texture2D(tex, uv - vec2(pixel.x, 0.0)).rgb);
    float rightLuma = atelier_luma(texture2D(tex, uv + vec2(pixel.x, 0.0)).rgb);
    float downLuma = atelier_luma(texture2D(tex, uv - vec2(0.0, pixel.y)).rgb);
    float upLuma = atelier_luma(texture2D(tex, uv + vec2(0.0, pixel.y)).rgb);
    vec2 gradient = vec2(rightLuma - leftLuma, upLuma - downLuma);
    float edge = atelier_sat(length(gradient) * 12.0);
    float ink = 1.0 - smoothstep(line_threshold - 0.07, line_threshold + 0.07, centerLuma);
    float chroma = max(max(source.r, source.g), source.b) - min(min(source.r, source.g), source.b);
    float pigment = atelier_sat(max(ink, chroma * 1.7) + edge * 0.75);

    vec2 point = (uv * 2.0 - 1.0) * scale;
    point.x *= resolution.x / max(resolution.y, 1.0);
    float localTime = time * speed;
    vec3 effect = atelier_inkMaterial(
        point,
        localTime,
        ink,
        edge,
        pigment,
        gradient,
        source.rgb
    );

    vec3 result;
    if (dark_paper) {
        float support = atelier_sat((ink + edge * 0.65) * line_gain);
        result = max(effect, vec3(0.0)) * support;
        result = vec3(1.0) - exp(-result * intensity);
        if (support < 0.003) {
            result = vec3(0.0);
        }
    } else {
        vec3 paper = vec3(0.985, 0.978, 0.952);
        vec3 pigmentColor = vec3(1.0) - exp(-max(effect, vec3(0.0)) * intensity);
        float paperFiber = atelier_noise(point * 92.0) * 0.018;
        result = mix(paper - paperFiber, pigmentColor, atelier_sat(pigment * line_gain));
    }

    return vec4(clamp(result, 0.0, 1.0), source.a);
}`;

  const uniformValues: ShaderUniformValueMap = {
    speed: spec.speed,
    intensity: spec.intensity,
    scale: spec.scale,
    line_threshold: spec.lineThreshold,
    line_gain: spec.lineGain,
    dark_paper: spec.darkPaper,
    accent_a: spec.accentA,
    accent_b: spec.accentB,
    accent_c: spec.accentC,
  };

  return {
    id: spec.id,
    name: spec.name,
    template: 'drawing',
    group: spec.group,
    description: spec.description,
    code,
    uniformValues,
  };
}
