import type { ShaderPresetDefinition } from './types';
import type { ShaderUniformValueMap } from '../../types';

interface StageReworkSpec {
  id: string;
  name: string;
  sourceName: string;
  description: string;
  shadow: [number, number, number];
  highlight: [number, number, number];
  mix: number;
  relief: number;
  edge: number;
  canvasFill: number;
  speed: number;
  sourceUniforms: ShaderUniformValueMap;
}

const stageReworkSpecs: StageReworkSpec[] = [
  {
    id: 'stage_rework_velvet_mirror_scanner',
    name: 'Velvet Mirror Scanner',
    sourceName: 'Soft Symmetrical Scanner with Blurred Trace',
    description:
      'The proven symmetrical scanner with a slower mirrored sweep, depth-curved trace, and velvet cyan-magenta light.',
    shadow: [0.055, 0.018, 0.11],
    highlight: [1, 0.22, 0.74],
    mix: 0.9,
    relief: 7.2,
    edge: 0.68,
    canvasFill: 0.26,
    speed: 0.82,
    sourceUniforms: {
      rangeWidth: 0.42,
      speed: 0.46,
      edgeSoftness: 0.24,
      borderSoftness: 0.12,
      traceLength: 0.82,
      whiteBlurAmount: 7.2,
      blackThreshold: 0.045,
      psychScale: 12.5,
      psychIntensity: 0.48,
      whiteOpacity: 0.28,
    },
  },
  {
    id: 'stage_rework_twin_fresnel_relight',
    name: 'Twin Fresnel Relight',
    sourceName: 'HD 3D Dual Relight',
    description:
      'HD Dual Relight expanded into two large Fresnel light volumes that wrap stage depth without breaking silhouettes.',
    shadow: [0.025, 0.055, 0.12],
    highlight: [1, 0.68, 0.24],
    mix: 0.86,
    relief: 10.5,
    edge: 0.82,
    canvasFill: 0.22,
    speed: 0.54,
    sourceUniforms: {
      lightHeight: 0.28,
      lightIntensity: 1.72,
      ambient: 0.22,
      shininess: 54,
      detail: 6.4,
      lightColor1: [0.2, 0.7, 1],
      lightColor2: [1, 0.52, 0.16],
    },
  },
];

function vec3Literal(value: [number, number, number]): string {
  return value.map((channel) => Number(channel.toFixed(4))).join(',');
}

function buildReworkCode(sourceCode: string, spec: StageReworkSpec): string {
  const renamedSource = sourceCode
    .replace(/^\/\/ NAME:.*$/m, `// NAME: ${spec.name}`)
    .replace(/\bvec4\s+processColor\s*\(/, 'vec4 stage_rework_source(');

  if (renamedSource === sourceCode) {
    throw new Error(`Unable to derive stage rework from ${spec.sourceName}.`);
  }

  return `${renamedSource}

uniform float rework_mix; // @min 0.0 @max 1.0 @default ${spec.mix}
uniform float rework_relief; // @min 0.0 @max 18.0 @default ${spec.relief}
uniform float rework_edge; // @min 0.0 @max 2.0 @default ${spec.edge}
uniform float rework_canvas_fill; // @min 0.0 @max 1.0 @default ${spec.canvasFill}
uniform float rework_speed; // @min 0.0 @max 2.0 @default ${spec.speed}
uniform float rework_black_cut; // @min 0.0 @max 0.15 @default 0.012
uniform vec3 rework_shadow; // @default ${vec3Literal(spec.shadow)}
uniform vec3 rework_highlight; // @default ${vec3Literal(spec.highlight)}

float rework_luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 rework_palette(float phase) {
    float wave = 0.5 + 0.5 * sin(phase);
    vec3 color = mix(rework_shadow, rework_highlight, wave);
    color += rework_highlight * pow(0.5 + 0.5 * cos(phase * 0.57 + 1.2), 6.0) * 0.28;
    return color;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float supportSeed = max(max(source.r, source.g), source.b);
    if (supportSeed <= rework_black_cut) {
        return vec4(0.0, 0.0, 0.0, source.a);
    }

    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    vec2 sampleRadius = pixel * 5.0;
    float left = rework_luma(texture2D(tex, uv - vec2(sampleRadius.x, 0.0)).rgb);
    float right = rework_luma(texture2D(tex, uv + vec2(sampleRadius.x, 0.0)).rgb);
    float down = rework_luma(texture2D(tex, uv - vec2(0.0, sampleRadius.y)).rgb);
    float up = rework_luma(texture2D(tex, uv + vec2(0.0, sampleRadius.y)).rgb);
    vec2 gradient = vec2(right - left, up - down);
    vec3 normal = normalize(vec3(-gradient * rework_relief, 0.22));
    float reliefEdge = clamp(length(gradient) * rework_relief * 1.8, 0.0, 1.0);

    vec2 warpedUv = clamp(uv + normal.xy * pixel * rework_relief * 1.7, 0.0, 1.0);
    vec4 inherited = stage_rework_source(tex, warpedUv, time, resolution);

    vec2 point = uv * 2.0 - 1.0;
    point.x *= resolution.x / max(resolution.y, 1.0);
    float localTime = time * rework_speed;
    float sweep = sin(
        point.y * 3.15 + normal.x * 3.8 - localTime * 1.7 +
        sin(point.x * 1.35 + localTime * 0.46) * 1.25
    );
    float crossSweep = cos(
        point.x * 2.2 - normal.y * 4.1 + localTime * 1.1 +
        sin(point.y * 1.7 - localTime * 0.38)
    );
    float field = sweep * 0.62 + crossSweep * 0.38;
    vec3 architecturalLight = rework_palette(
        field * 2.4 + rework_luma(source.rgb) * 2.2 + localTime * 0.72
    );
    float broadBand = pow(0.5 + 0.5 * sin(field * 2.1 - localTime * 0.66), 3.0);
    float grazing = pow(1.0 - max(normal.z, 0.0), 2.2);

    vec3 refined = max(inherited.rgb, vec3(0.0));
    refined *= 0.48 + architecturalLight * 1.12;
    refined += architecturalLight * reliefEdge * rework_edge;
    refined += rework_highlight * grazing * (0.16 + broadBand * 0.34);

    float whiteCanvas = smoothstep(
        0.92,
        0.995,
        min(source.r, min(source.g, source.b))
    );
    vec3 fullFrameField = architecturalLight *
        (0.22 + broadBand * 0.72 + reliefEdge * 0.35);
    refined = mix(
        refined,
        fullFrameField,
        whiteCanvas * (0.42 + rework_canvas_fill * 0.48)
    );

    vec3 result = mix(source.rgb * 0.16, refined, rework_mix);
    result += architecturalLight * broadBand * rework_canvas_fill * 0.2;
    result = vec3(1.0) - exp(-max(result, vec3(0.0)) * 1.18);
    result = pow(result, vec3(0.92));

    float support = smoothstep(
        rework_black_cut,
        rework_black_cut + 0.065,
        supportSeed
    );
    result *= support;
    if (support < 0.002) {
        result = vec3(0.0);
    }
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`;
}

export function createStageReworkPresetList(
  sourcePresets: ShaderPresetDefinition[],
): ShaderPresetDefinition[] {
  const derivedPresets: ShaderPresetDefinition[] = stageReworkSpecs.map((spec) => {
    const source = sourcePresets.find((preset) => preset.name === spec.sourceName);
    if (!source) {
      throw new Error(`Missing stage source shader: ${spec.sourceName}.`);
    }

    return {
      id: spec.id,
      name: spec.name,
      template: 'stage',
      templates: ['stage'],
      group: 'Stage Reworks',
      description: spec.description,
      code: buildReworkCode(source.code, spec),
      uniformValues: {
        ...(source.uniformValues ?? {}),
        ...spec.sourceUniforms,
        rework_mix: spec.mix,
        rework_relief: spec.relief,
        rework_edge: spec.edge,
        rework_canvas_fill: spec.canvasFill,
        rework_speed: spec.speed,
        rework_black_cut: 0.012,
        rework_shadow: spec.shadow,
        rework_highlight: spec.highlight,
      },
    };
  });

  return derivedPresets;
}
