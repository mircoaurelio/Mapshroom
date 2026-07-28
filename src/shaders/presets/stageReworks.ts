import type { ShaderPresetDefinition } from './types';
import type { ShaderUniformValueMap } from '../../types';
import {
  fullCanvasShaderTemplate,
  fullCanvasShaderUniformValues,
} from '../templates/fullCanvasShader';

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
    id: 'stage_rework_chromatic_aura_monument',
    name: 'Chromatic Aura Monument',
    sourceName: 'High Contrast Aura',
    description:
      'High Contrast Aura rebuilt with continuous relief normals, broad architectural color travel, and a clean projector-black cutoff.',
    shadow: [0.035, 0.055, 0.12],
    highlight: [0.2, 0.92, 1],
    mix: 0.88,
    relief: 8.4,
    edge: 0.78,
    canvasFill: 0.34,
    speed: 0.62,
    sourceUniforms: {
      speed: 0.72,
      softness: 5.2,
      sensitivity: 3.4,
      depth_mult: 0.82,
      shadow_threshold: 0.22,
      shadow_contrast: 1.4,
      glimmer: 0.38,
    },
  },
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
  {
    id: 'stage_rework_architectural_light_quarry',
    name: 'Architectural Light Quarry',
    sourceName: 'Random 3D Wide Light',
    description:
      'Random Wide Light refined into slow monumental beams, depth-cut shadow shelves, and continuous facade-scale gradients.',
    shadow: [0.015, 0.035, 0.08],
    highlight: [0.46, 0.86, 1],
    mix: 0.9,
    relief: 11.8,
    edge: 0.88,
    canvasFill: 0.19,
    speed: 0.43,
    sourceUniforms: {
      speed: 0.38,
      range: 0.56,
      brightness: 2.15,
      depth_scale: 1.28,
    },
  },
  {
    id: 'stage_rework_diffused_spiral_atmosphere',
    name: 'Diffused Spiral Atmosphere',
    sourceName: 'HD Diffused Reactive Swirl',
    description:
      'The diffused reactive swirl enlarged into a seamless atmospheric vortex with depth-aware haze and rolling highlights.',
    shadow: [0.03, 0.02, 0.13],
    highlight: [0.36, 1, 0.78],
    mix: 0.87,
    relief: 6.8,
    edge: 0.56,
    canvasFill: 0.32,
    speed: 0.48,
    sourceUniforms: {
      colorShift: 0.18,
      intensity: 0.82,
      blur: 0.2,
      spread: 0.68,
    },
  },
  {
    id: 'stage_rework_serpentine_chromatic_current',
    name: 'Serpentine Chromatic Current',
    sourceName: 'Distorted LSD Snake',
    description:
      'Distorted LSD Snake rebuilt as long continuous chromatic currents with softened interference and relief-locked motion.',
    shadow: [0.06, 0.015, 0.1],
    highlight: [0.94, 0.3, 1],
    mix: 0.86,
    relief: 7.6,
    edge: 0.62,
    canvasFill: 0.3,
    speed: 0.57,
    sourceUniforms: {
      scale: 14,
      speed: 0.34,
      dash_freq: 3.8,
      thickness: 0.24,
      blur: 0.08,
      distortion: 0.62,
    },
  },
  {
    id: 'stage_rework_liquid_chrome_halo',
    name: 'Liquid Chrome Halo',
    sourceName: 'Speed-Looping Chrome Halo',
    description:
      'The chrome halo slowed and widened into a continuous liquid-metal aura with polished relief reflections.',
    shadow: [0.025, 0.045, 0.075],
    highlight: [0.72, 0.91, 1],
    mix: 0.92,
    relief: 12,
    edge: 0.92,
    canvasFill: 0.2,
    speed: 0.38,
    sourceUniforms: {
      speed: 0.36,
      speed_loop: 0.55,
      range_width: 0.16,
      halo_strength: 1.85,
      halo_spread: 8.2,
      halo_color: [0.38, 0.82, 1],
      zoom: 3.6,
      psy_blend: 0.68,
      contrast: 1.08,
      saturation: 0.92,
    },
  },
  {
    id: 'stage_rework_fractured_psyche_border',
    name: 'Fractured Psyche Border',
    sourceName: 'Psych Sections Inverted Border Black Distorted',
    description:
      'The inverted border composition refined into broad fracture fields, controlled chroma, and stable black negative space.',
    shadow: [0.04, 0.012, 0.07],
    highlight: [1, 0.45, 0.16],
    mix: 0.84,
    relief: 8.8,
    edge: 0.76,
    canvasFill: 0.28,
    speed: 0.51,
    sourceUniforms: {
      dark_distance: 0.12,
      colorrangeeffect: 0.54,
      speed: 0.36,
      border_width: 0.18,
      distortion_amount: 0.012,
    },
  },
  {
    id: 'stage_rework_radial_edge_memory',
    name: 'Radial Edge Memory',
    sourceName: 'Radial Delayed Soft Edge Blur',
    description:
      'The radial edge delay turned into persistent expanding memories that bend around stage relief and dissolve without seams.',
    shadow: [0.02, 0.045, 0.09],
    highlight: [0.28, 0.84, 1],
    mix: 0.9,
    relief: 9.6,
    edge: 0.86,
    canvasFill: 0.24,
    speed: 0.45,
    sourceUniforms: {
      speed: 1.2,
      lineLength: 3.4,
      delay: 1.6,
      distOffset: 11,
    },
  },
  {
    id: 'stage_rework_dual_solar_spiral',
    name: 'Dual Solar Spiral',
    sourceName: 'Dual Light Spiral Eye',
    description:
      'Dual Light Spiral Eye opened into a pair of solar currents with warm/cool light exchange and continuous stage-scale flow.',
    shadow: [0.055, 0.025, 0.085],
    highlight: [1, 0.78, 0.28],
    mix: 0.88,
    relief: 7.9,
    edge: 0.66,
    canvasFill: 0.31,
    speed: 0.52,
    sourceUniforms: {
      speed: 0.52,
      speed2: -0.36,
      lineLength: 2.8,
      distOffset: 5.2,
      waveColor1: [1, 0.34, 0.08],
      waveColor2: [0.1, 0.68, 1],
      waveColor3: [0.92, 0.12, 0.72],
      waveFreq: 18,
      spiralScale: 14,
      spiralSpeed: 1.2,
      spiralSize: 0.48,
      eyeRange: 0.52,
      eyeSize: 0.12,
      secondLightColor: [0.1, 0.42, 1],
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

  return [
    ...derivedPresets,
    {
      id: 'stage_rework_full_canvas_flow',
      name: 'Full Canvas Flow',
      template: 'stage',
      templates: ['stage'],
      group: 'Stage Reworks',
      description:
        'A full-frame domain-warped current that ignores source imagery and renders continuously across every output pixel.',
      code: fullCanvasShaderTemplate,
      uniformValues: fullCanvasShaderUniformValues,
    },
  ];
}
