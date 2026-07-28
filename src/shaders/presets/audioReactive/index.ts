import type {
  ShaderAudioReactiveBindingMap,
  ShaderUniformValueMap,
} from '../../../types';
import type { ShaderPresetDefinition } from '../types';

interface AudioReactivePresetSpec {
  id: string;
  name: string;
  description: string;
  variant: number;
  values: {
    amount: number;
    speed: number;
    scale: number;
    detail: number;
    threshold: number;
    color_shift: number;
    blend: number;
    accent: [number, number, number];
  };
}

const AUDIO_REACTIVE_PRESET_SPECS: AudioReactivePresetSpec[] = [
  {
    id: 'audio_bassline_emerald',
    name: 'Bassline Emerald',
    description: 'Bass-driven emerald illumination contained inside non-black pixels.',
    variant: 0,
    values: { amount: 1.25, speed: 0.8, scale: 4.5, detail: 0.4, threshold: 0.025, color_shift: 0.18, blend: 0.92, accent: [0.08, 1, 0.48] },
  },
  {
    id: 'audio_mid_scanner',
    name: 'Mid Scanner',
    description: 'Horizontal mid-frequency scanner bands clipped to the source silhouette.',
    variant: 1,
    values: { amount: 1.35, speed: 1.2, scale: 7.2, detail: 0.56, threshold: 0.03, color_shift: 0.28, blend: 0.94, accent: [0.08, 0.92, 0.78] },
  },
  {
    id: 'audio_high_prism_split',
    name: 'High Prism Split',
    description: 'High-frequency RGB separation that never leaks into black space.',
    variant: 2,
    values: { amount: 1.15, speed: 1.65, scale: 5.4, detail: 0.72, threshold: 0.025, color_shift: 0.7, blend: 0.9, accent: [0.22, 0.92, 1] },
  },
  {
    id: 'audio_beat_pixel_relay',
    name: 'Beat Pixel Relay',
    description: 'Beat-reactive pixel blocks relaying color through visible source pixels.',
    variant: 3,
    values: { amount: 1.5, speed: 1.05, scale: 8.5, detail: 0.64, threshold: 0.035, color_shift: 0.45, blend: 1, accent: [0.44, 1, 0.24] },
  },
  {
    id: 'audio_edge_current',
    name: 'Edge Current',
    description: 'Electric edge current energized by bass and upper-frequency detail.',
    variant: 4,
    values: { amount: 1.6, speed: 0.9, scale: 5.8, detail: 0.82, threshold: 0.025, color_shift: 0.34, blend: 0.96, accent: [0.12, 1, 0.64] },
  },
  {
    id: 'audio_radial_kick',
    name: 'Radial Kick',
    description: 'Concentric kick rings mapped across the existing illuminated subject.',
    variant: 5,
    values: { amount: 1.4, speed: 1.3, scale: 9, detail: 0.5, threshold: 0.03, color_shift: 0.58, blend: 0.95, accent: [0.64, 1, 0.12] },
  },
  {
    id: 'audio_glitch_gate',
    name: 'Glitch Gate',
    description: 'Rhythmic data gates and horizontal glitches restricted to non-black pixels.',
    variant: 6,
    values: { amount: 1.32, speed: 1.8, scale: 7.8, detail: 0.88, threshold: 0.04, color_shift: 0.76, blend: 0.94, accent: [0.08, 0.94, 0.56] },
  },
  {
    id: 'audio_mirror_pulse',
    name: 'Mirror Pulse',
    description: 'A symmetrical audio fold pulsing within the original image mask.',
    variant: 7,
    values: { amount: 1.18, speed: 0.72, scale: 4.2, detail: 0.48, threshold: 0.025, color_shift: 0.35, blend: 0.88, accent: [0.16, 0.86, 1] },
  },
  {
    id: 'audio_poster_beat',
    name: 'Poster Beat',
    description: 'Beat-controlled color quantization for bold, masked poster rhythms.',
    variant: 8,
    values: { amount: 1.25, speed: 1.15, scale: 6.4, detail: 0.55, threshold: 0.035, color_shift: 0.62, blend: 0.96, accent: [0.72, 1, 0.16] },
  },
  {
    id: 'audio_strobe_invert',
    name: 'Strobe Invert',
    description: 'Controlled beat inversion with a stable black background.',
    variant: 9,
    values: { amount: 1.05, speed: 2.1, scale: 3.6, detail: 0.34, threshold: 0.03, color_shift: 0.82, blend: 0.84, accent: [0.22, 1, 0.72] },
  },
  {
    id: 'audio_thermal_bass',
    name: 'Thermal Bass',
    description: 'A low-frequency thermal palette flowing only through visible pixels.',
    variant: 10,
    values: { amount: 1.5, speed: 0.62, scale: 5.2, detail: 0.58, threshold: 0.03, color_shift: 0.5, blend: 0.95, accent: [1, 0.72, 0.08] },
  },
  {
    id: 'audio_dot_matrix_echo',
    name: 'Dot Matrix Echo',
    description: 'Matrix-style dot cells whose density follows the audio spectrum.',
    variant: 11,
    values: { amount: 1.3, speed: 1.4, scale: 9.4, detail: 0.76, threshold: 0.04, color_shift: 0.28, blend: 0.98, accent: [0.1, 1, 0.42] },
  },
  {
    id: 'audio_data_slice',
    name: 'Data Slice',
    description: 'Tempo-locked horizontal slices moving inside the source silhouette.',
    variant: 12,
    values: { amount: 1.42, speed: 1.65, scale: 8.2, detail: 0.84, threshold: 0.035, color_shift: 0.66, blend: 0.94, accent: [0.08, 0.88, 1] },
  },
  {
    id: 'audio_spectrum_ladder',
    name: 'Spectrum Ladder',
    description: 'Stepped spectral bands mapped from lows through highs.',
    variant: 13,
    values: { amount: 1.35, speed: 1.08, scale: 10.2, detail: 0.62, threshold: 0.025, color_shift: 0.9, blend: 0.96, accent: [0.48, 1, 0.12] },
  },
  {
    id: 'audio_contour_echo',
    name: 'Contour Echo',
    description: 'Audio contour lines tracing brightness without touching black pixels.',
    variant: 14,
    values: { amount: 1.45, speed: 0.78, scale: 11, detail: 0.7, threshold: 0.03, color_shift: 0.42, blend: 0.92, accent: [0.18, 1, 0.64] },
  },
  {
    id: 'audio_matrix_rain_skin',
    name: 'Matrix Rain Skin',
    description: 'Falling digital columns used as a skin over non-black image regions.',
    variant: 15,
    values: { amount: 1.55, speed: 1.35, scale: 8.8, detail: 0.92, threshold: 0.04, color_shift: 0.2, blend: 1, accent: [0.05, 1, 0.32] },
  },
  {
    id: 'audio_laser_mesh',
    name: 'Laser Mesh',
    description: 'A high-frequency laser lattice contained by the original subject.',
    variant: 16,
    values: { amount: 1.38, speed: 1.5, scale: 12, detail: 0.8, threshold: 0.035, color_shift: 0.58, blend: 0.94, accent: [0.24, 1, 0.8] },
  },
  {
    id: 'audio_liquid_low_end',
    name: 'Liquid Low End',
    description: 'Bass displacement with fluid refraction and a protected black field.',
    variant: 17,
    values: { amount: 1.2, speed: 0.7, scale: 5.6, detail: 0.68, threshold: 0.025, color_shift: 0.48, blend: 0.9, accent: [0.06, 0.84, 1] },
  },
  {
    id: 'audio_beat_shards',
    name: 'Beat Shards',
    description: 'Angular beat shards refracting color only where the source exists.',
    variant: 18,
    values: { amount: 1.48, speed: 1.75, scale: 9.6, detail: 0.78, threshold: 0.035, color_shift: 0.74, blend: 0.96, accent: [0.66, 1, 0.1] },
  },
  {
    id: 'audio_tempo_orbit',
    name: 'Tempo Orbit',
    description: 'Orbiting tempo arcs and spectral modulation within non-black pixels.',
    variant: 19,
    values: { amount: 1.35, speed: 1, scale: 7.4, detail: 0.6, threshold: 0.025, color_shift: 0.54, blend: 0.94, accent: [0.12, 1, 0.7] },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createAudioBindings(
  values: AudioReactivePresetSpec['values'],
): ShaderAudioReactiveBindingMap {
  return {
    amount: {
      enabled: true,
      signal: 'bass',
      min: clamp(values.amount * 0.32, 0, 2.2),
      max: clamp(values.amount * 1.35, 0, 2.2),
    },
    speed: {
      enabled: true,
      signal: 'tempo',
      min: clamp(values.speed * 0.45, 0.1, 5),
      max: clamp(values.speed * 1.75, 0.1, 5),
    },
    scale: {
      enabled: true,
      signal: 'mid',
      min: clamp(values.scale * 0.52, 1, 14),
      max: clamp(values.scale * 1.28, 1, 14),
    },
    detail: {
      enabled: true,
      signal: 'high',
      min: clamp(values.detail * 0.28, 0, 1),
      max: clamp(values.detail * 1.2, 0, 1),
    },
    color_shift: {
      enabled: true,
      signal: 'beat',
      min: clamp(values.color_shift * 0.22, 0, 1),
      max: clamp(values.color_shift + 0.42, 0, 1),
    },
    blend: {
      enabled: true,
      signal: 'level',
      min: clamp(values.blend * 0.48, 0, 1),
      max: 1,
    },
    threshold: {
      enabled: false,
      signal: 'level',
      min: values.threshold,
      max: values.threshold,
    },
  };
}

function buildAudioReactiveShader(spec: AudioReactivePresetSpec): string {
  return `// NAME: ${spec.name}
uniform float amount; // @min 0.0 @max 2.2 @default ${spec.values.amount}
uniform float speed; // @min 0.1 @max 5.0 @default ${spec.values.speed}
uniform float scale; // @min 1.0 @max 14.0 @default ${spec.values.scale}
uniform float detail; // @min 0.0 @max 1.0 @default ${spec.values.detail}
uniform float threshold; // @min 0.0 @max 0.25 @default ${spec.values.threshold}
uniform float color_shift; // @min 0.0 @max 1.0 @default ${spec.values.color_shift}
uniform float blend; // @min 0.0 @max 1.0 @default ${spec.values.blend}
uniform vec3 accent; // @default ${spec.values.accent.join(',')}

float ar_luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

mat2 ar_rot(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

vec3 ar_palette(float value, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (value + phase));
}

vec3 ar_rgb2hsv(vec3 color) {
    vec4 k = vec4(0.0, -0.3333333333, 0.6666666667, -1.0);
    vec4 p = mix(vec4(color.bg, k.wz), vec4(color.gb, k.xy), step(color.b, color.g));
    vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float ar_hue_band(float hue, float center, float width) {
    float distanceToHue = abs(fract(hue - center + 0.5) - 0.5);
    return 1.0 - smoothstep(width * 0.42, width, distanceToHue);
}

float ar_edge(sampler2D tex, vec2 uv, vec2 px) {
    float left = ar_luma(texture2D(tex, clamp(uv - vec2(px.x, 0.0), 0.0, 1.0)).rgb);
    float right = ar_luma(texture2D(tex, clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb);
    float down = ar_luma(texture2D(tex, clamp(uv - vec2(0.0, px.y), 0.0, 1.0)).rgb);
    float up = ar_luma(texture2D(tex, clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float sourceLum = ar_luma(source.rgb);
    float sourcePeak = max(source.r, max(source.g, source.b));
    float sourceFloor = min(source.r, min(source.g, source.b));
    float sourceChroma = sourcePeak - sourceFloor;
    // Peak RGB and chroma keep saturated reds, blues and violets alive even
    // when their perceived luminance is low. Pure black remains protected.
    float sourceEnergy = max(sourcePeak, sourceLum * 0.72 + sourceChroma * 0.48);
    float blackGuard = max(0.001, threshold);
    float subjectMask = smoothstep(blackGuard, blackGuard + 0.028, sourceEnergy);

    // Every preset in this collection preserves the original black field and
    // silhouettes. JPEG compression noise below the guard is discarded too.
    if (sourceEnergy <= blackGuard) {
        return vec4(0.0, 0.0, 0.0, source.a);
    }

    vec2 safeResolution = max(resolution, vec2(1.0));
    vec2 px = 1.0 / safeResolution;
    vec2 p = uv * 2.0 - 1.0;
    float aspect = safeResolution.x / safeResolution.y;
    p.x *= aspect;
    float t = time * speed;
    float variant = ${spec.variant.toFixed(1)};
    vec3 sourceHsv = ar_rgb2hsv(source.rgb);
    float sourceHue = sourceHsv.x;
    float sourceSaturation = sourceHsv.y;
    float hueZone = floor(sourceHue * 8.0) / 8.0;
    float warmZone = max(
        ar_hue_band(sourceHue, 0.02, 0.18),
        ar_hue_band(sourceHue, 0.11, 0.16)
    );
    float greenZone = ar_hue_band(sourceHue, 0.34, 0.18);
    float cyanZone = ar_hue_band(sourceHue, 0.52, 0.17);
    float violetZone = max(
        ar_hue_band(sourceHue, 0.68, 0.2),
        ar_hue_band(sourceHue, 0.86, 0.18)
    );
    float bassDrive = clamp(amount / 2.2, 0.0, 1.0);
    float midDrive = clamp((scale - 1.0) / 13.0, 0.0, 1.0);
    float highDrive = clamp(detail, 0.0, 1.0);
    float colorZoneDrive = clamp(
        warmZone * bassDrive
        + greenZone * midDrive
        + cyanZone * mix(midDrive, highDrive, 0.45)
        + violetZone * highDrive,
        0.0,
        1.0
    );
    float colorPulse = 0.5 + 0.5 * sin(
        t * (1.25 + color_shift * 2.2) + hueZone * 31.4159265359
    );
    float pulse = 0.5 + 0.5 * sin(t * 2.0 + sourceLum * 5.0 + sourceChroma * 3.0);
    float grain = node_noise(uv * (48.0 + scale * 9.0) + vec2(t * 0.23, -t * 0.17));
    float sourceEdge = clamp(ar_edge(tex, uv, px * (1.0 + detail * 1.6)) * 5.2, 0.0, 1.0);
    float chromaDetail = smoothstep(0.025, 0.42, sourceChroma);
    float ornament = clamp(0.24 + sourceEdge * 0.68 + chromaDetail * 0.28, 0.0, 1.0);
    float centerSymmetry = 1.0 - smoothstep(0.0, 0.52, abs(uv.x - 0.5));
    vec3 spectral = ar_palette(
        sourceLum * scale * 0.18 + sourceChroma * 0.52 + t * 0.055 + color_shift,
        accent
    );
    vec3 sourceHueColor = source.rgb / max(sourcePeak, 0.001);
    spectral = mix(
        spectral,
        sourceHueColor,
        clamp(0.24 + sourceSaturation * 0.38, 0.0, 0.62)
    );
    float colorAngle = 6.28318530718 * (
        hueZone + color_shift * 0.08
    ) + t * (0.18 + colorZoneDrive * 0.32);
    vec2 colorDirection = vec2(cos(colorAngle), sin(colorAngle));
    vec2 colorFlow = colorDirection * px
        * (2.0 + 12.0 * colorZoneDrive)
        * sourceSaturation
        * (0.35 + colorPulse * 0.65);
    vec3 colorMoved = texture2D(tex, clamp(uv + colorFlow, 0.0, 1.0)).rgb;
    float movedPeak = max(colorMoved.r, max(colorMoved.g, colorMoved.b));
    colorMoved = mix(
        source.rgb,
        colorMoved,
        smoothstep(blackGuard, blackGuard + 0.03, movedPeak)
    );
    vec3 effect = source.rgb;

    if (variant < 0.5) {
        float bodyPulse = 0.82 + mix(pulse, colorPulse, sourceSaturation) * amount * 0.34;
        effect = source.rgb * bodyPulse
            + spectral * sourceEnergy * amount * (0.08 + ornament * 0.2);
    } else if (variant < 1.5) {
        float scanner = pow(
            0.5 + 0.5 * sin((p.y * scale - t + hueZone * 1.4) * 8.0),
            5.0
        );
        effect = source.rgb
            + mix(accent, spectral, detail) * scanner * amount
            * (0.08 + ornament * 0.3);
    } else if (variant < 2.5) {
        vec2 split = vec2(px.x * (2.0 + scale) * sin(t), 0.0) * amount;
        vec3 prism = vec3(
            texture2D(tex, clamp(uv + split, 0.0, 1.0)).r,
            source.g,
            texture2D(tex, clamp(uv - split, 0.0, 1.0)).b
        );
        effect = mix(source.rgb, prism, 0.18 + detail * 0.28);
        effect += spectral * sourceEdge * amount * 0.16;
    } else if (variant < 3.5) {
        float cells = 10.0 + scale * 6.0;
        vec2 pixelGrid = vec2(cells * aspect, cells);
        vec2 pixelUv = (floor(uv * pixelGrid) + 0.5) / pixelGrid;
        vec3 pixelColor = texture2D(tex, pixelUv).rgb;
        vec3 relay = pixelColor * (0.82 + spectral * amount * 0.34);
        effect = mix(source.rgb, relay, 0.12 + detail * 0.28);
    } else if (variant < 4.5) {
        effect = source.rgb * (0.88 + pulse * 0.2)
            + mix(accent, spectral, detail) * sourceEdge * amount * 0.58;
    } else if (variant < 5.5) {
        float radius = length(p);
        float rings = pow(
            0.5 + 0.5 * sin(
                radius * scale * 8.0 - t * 3.0 + hueZone * 12.5663706144
            ),
            4.0
        );
        effect = source.rgb
            + spectral * rings * amount * (0.08 + sourceEnergy * 0.2)
            * (0.45 + ornament * 0.55);
    } else if (variant < 6.5) {
        float row = floor(uv.y * (18.0 + scale * 4.0));
        float gate = step(0.64, node_noise(vec2(row, floor(t * 7.0))));
        float shift = (node_rand(vec2(row, floor(t * 5.0))) - 0.5)
            * px.x * scale * 7.0 * amount
            * mix(-1.0, 1.0, step(0.5, sourceHue));
        vec3 sliced = texture2D(tex, clamp(uv + vec2(shift * gate, 0.0), 0.0, 1.0)).rgb;
        effect = mix(
            source.rgb,
            sliced * (0.88 + spectral * 0.3),
            gate * (0.12 + detail * 0.32)
        );
    } else if (variant < 7.5) {
        vec2 mirrorUv = vec2(1.0 - uv.x, uv.y);
        vec3 folded = texture2D(tex, mirrorUv).rgb;
        float mirrorPulse = (0.1 + pulse * 0.22) * (0.35 + centerSymmetry * 0.65);
        effect = mix(source.rgb, folded, mirrorPulse * detail);
        effect *= 0.9 + spectral * amount * 0.16;
    } else if (variant < 8.5) {
        float levels = max(2.0, floor(2.0 + scale * 0.72));
        vec3 poster = floor(source.rgb * levels) / max(1.0, levels - 1.0);
        effect = mix(
            source.rgb,
            poster * (0.9 + spectral * amount * 0.18),
            0.16 + detail * 0.34
        );
    } else if (variant < 9.5) {
        float hit = step(0.68, 0.5 + 0.5 * sin(t * 5.0));
        effect = source.rgb * (1.0 + hit * amount * 0.24)
            + spectral * hit * sourceEdge * detail * 0.26;
    } else if (variant < 10.5) {
        vec3 thermal = ar_palette(sourceLum * (2.0 + scale * 0.18) + pulse * 0.35, vec3(0.0, 0.18, 0.42) + accent * 0.12);
        effect = mix(
            source.rgb,
            thermal * (0.78 + sourceEnergy * amount * 0.4),
            0.16 + detail * 0.34
        );
    } else if (variant < 11.5) {
        float cells = 15.0 + scale * 4.0;
        vec2 colorScroll = colorDirection * t * 0.035 * colorZoneDrive;
        vec2 cell = fract((uv + colorScroll) * vec2(cells * aspect, cells)) - 0.5;
        float dots = 1.0 - smoothstep(0.08 + detail * 0.12, 0.42, length(cell));
        effect = source.rgb * (0.9 + dots * 0.15)
            + spectral * dots * amount * ornament * 0.3;
    } else if (variant < 12.5) {
        float slice = floor(uv.y * (12.0 + scale * 3.0));
        float clock = floor(t * 6.0);
        float offset = (node_rand(vec2(slice, clock)) - 0.5) * amount * 0.045;
        vec3 shifted = texture2D(tex, clamp(uv + vec2(offset, 0.0), 0.0, 1.0)).rgb;
        effect = mix(
            source.rgb,
            shifted + spectral * abs(offset) * ornament * 3.0,
            0.16 + detail * 0.34
        );
    } else if (variant < 13.5) {
        float ladder = floor(
            fract(sourceLum * scale + sourceHue * 2.0 + t * 0.25) * 6.0
        ) / 5.0;
        effect = source.rgb * (0.82 + ladder * amount * 0.28)
            + spectral * ladder * detail * ornament * 0.28;
    } else if (variant < 14.5) {
        float contour = 1.0 - smoothstep(0.04, 0.22, abs(fract(sourceLum * scale * 1.8 + t * 0.15) - 0.5));
        effect = source.rgb * 0.84
            + mix(accent, spectral, detail) * contour * sourceEdge * amount * 0.48;
    } else if (variant < 15.5) {
        float columns = 16.0 + scale * 4.0;
        float column = floor(uv.x * columns * aspect);
        float colorFallSpeed = 2.5 + warmZone * 2.8 + cyanZone * 1.4 + violetZone * 3.5;
        float cell = floor(uv.y * columns * 0.65 - t * colorFallSpeed);
        float symbol = step(0.48, node_rand(vec2(column, cell)));
        float trail = pow(fract(uv.y * 2.0 - t * 0.2 + node_rand(vec2(column, 3.0))), 3.0);
        effect = source.rgb * 0.82
            + mix(accent, spectral, detail) * symbol * trail * amount
            * (0.12 + ornament * 0.34);
    } else if (variant < 16.5) {
        vec2 meshUv = ar_rot(t * 0.08 + hueZone * 0.52) * p * scale;
        vec2 meshCell = abs(fract(meshUv) - 0.5);
        float mesh = pow(max(1.0 - meshCell.x * 2.0, 1.0 - meshCell.y * 2.0), 10.0 - detail * 7.0);
        effect = source.rgb * 0.86
            + spectral * mesh * amount * ornament * 0.42;
    } else if (variant < 17.5) {
        vec2 flow = vec2(
            sin(p.y * scale + t * 1.7),
            cos(p.x * scale * 0.8 - t * 1.3)
        ) * px * (3.0 + amount * 9.0);
        vec3 liquid = texture2D(tex, clamp(uv + flow, 0.0, 1.0)).rgb;
        effect = mix(
            source.rgb,
            liquid * (0.88 + spectral * 0.28),
            0.14 + detail * 0.34
        );
    } else if (variant < 18.5) {
        float angle = atan(p.y, p.x);
        float shard = floor((angle + 3.14159265) * scale * 0.85);
        float shardPulse = 0.5 + 0.5 * sin(shard + t * 4.0);
        vec2 shardUv = clamp(uv + normalize(p + vec2(0.0001)) * px * shardPulse * amount * 11.0, 0.0, 1.0);
        vec3 refracted = texture2D(tex, shardUv).rgb;
        effect = mix(
            source.rgb,
            refracted + spectral * shardPulse * sourceEdge * 0.24,
            0.15 + detail * 0.34
        );
    } else {
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float orbit = pow(
            0.5 + 0.5 * sin(
                radius * scale * 7.0 - angle * 3.0 - t * 2.0
                + hueZone * 12.5663706144
            ),
            5.0
        );
        effect = source.rgb * (0.86 + pulse * 0.2)
            + mix(accent, spectral, detail) * orbit * amount
            * (0.1 + ornament * 0.32);
    }

    // Stable hue segmentation turns the painted surface into a movement map:
    // warm colors lean on bass, greens/cyans on mids and violets on highs.
    float colorMotion = clamp(
        sourceSaturation
        * colorZoneDrive
        * (0.12 + colorPulse * 0.24)
        * (0.32 + ornament * 0.68),
        0.0,
        0.38
    );
    effect = mix(
        effect,
        colorMoved * (0.9 + spectral * 0.24),
        colorMotion
    );

    vec3 zoneAccent =
        warmZone * vec3(1.0, 0.22, 0.035)
        + greenZone * vec3(0.08, 1.0, 0.34)
        + cyanZone * vec3(0.02, 0.82, 1.0)
        + violetZone * vec3(0.72, 0.08, 1.0);
    float zoneWeight = warmZone + greenZone + cyanZone + violetZone;
    zoneAccent /= max(zoneWeight, 1.0);
    effect += zoneAccent
        * sourceEdge
        * sourceSaturation
        * colorZoneDrive
        * colorPulse
        * (0.04 + color_shift * 0.16);

    float energy = clamp(amount, 0.0, 2.2);
    // Fine audio motion is concentrated on ornament and colored relief. The
    // original artwork remains the visual anchor instead of being replaced.
    effect += spectral * (grain - 0.5) * detail * ornament * 0.1 * energy;
    effect = mix(
        effect,
        effect * (0.86 + spectral * 0.34),
        color_shift * (0.08 + pulse * 0.16)
    );
    effect *= 0.9 + 0.1 * pulse * energy;
    float protectiveBlend = clamp(blend * (0.62 + ornament * 0.2), 0.0, 0.82);
    effect = mix(source.rgb, effect, protectiveBlend);
    effect *= subjectMask;

    return vec4(clamp(effect, 0.0, 1.0), source.a);
}`;
}

export const audioReactivePresetList: ShaderPresetDefinition[] =
  AUDIO_REACTIVE_PRESET_SPECS.map((spec) => {
    const uniformValues: ShaderUniformValueMap = {
      ...spec.values,
      accent: [...spec.values.accent],
    };

    return {
      id: spec.id,
      name: spec.name,
      template: 'sculpture',
      templates: ['sculpture', 'stage', 'drawing'],
      group: 'Audio Reactive',
      description: spec.description,
      code: buildAudioReactiveShader(spec),
      uniformValues,
      audioReactiveBindings: createAudioBindings(spec.values),
    };
  });
