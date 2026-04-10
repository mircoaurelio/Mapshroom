import type { ShaderPresetDefinition } from '../types';

export const drawingPresetList: ShaderPresetDefinition[] = [
  {
    id: "drawing_ink_lift_base",
    name: "Ink Lift Base",
    template: "drawing",
    group: "Base",
    description: "Simple contour lift tuned for black ink on white paper.",
    code: `// NAME: Ink Lift Base
uniform float speed; // @min 0.1 @max 3.0 @default 0.7
uniform float intensity; // @min 0.2 @max 1.6 @default 0.75
uniform float scale; // @min 0.6 @max 2.0 @default 1
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.72
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.08
uniform float edge_strength; // @min 0.0 @max 1.8 @default 0.9
uniform vec3 paper_tint; // @default 0.98,0.98,0.96
uniform vec3 accent; // @default 0.1,0.7,0.92

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    float ring = smoothstep(0.78, 0.06, length(p));
    float wave = 0.5 + 0.5 * sin(t * 1.4 + p.y * 8.0);
    field = clamp(ring * (0.45 + 0.55 * wave) + edge * 0.7, 0.0, 1.2);
    pulse = wave;
    chroma = mix(accent, vec3(1.0, 0.92, 0.55), 0.18 + 0.22 * wave);
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.7,
      "intensity": 0.75,
      "scale": 1,
      "line_threshold": 0.72,
      "line_softness": 0.08,
      "edge_strength": 0.9,
      "paper_tint": [0.98, 0.98, 0.96],
      "accent": [0.1, 0.7, 0.92]
    },
  },
  {
    id: "drawing_mandala_ink_lift",
    name: "Mandala Ink Lift",
    template: "drawing",
    group: "Ink Halos",
    description: "Mandala glow that follows ink contours without polluting the paper.",
    code: `// NAME: Mandala Ink Lift
uniform float speed; // @min 0.1 @max 3.0 @default 1
uniform float intensity; // @min 0.2 @max 1.6 @default 0.9
uniform float scale; // @min 0.6 @max 2.0 @default 1.2
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.74
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.07
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.15
uniform vec3 paper_tint; // @default 0.985,0.98,0.965
uniform vec3 accent; // @default 0.04,0.8,0.9

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = kalei(p * 1.3, 10.0);
    float radius = length(q);
    float petals = sin(18.0 * atan(q.y, q.x) + t * 2.5);
    float rings = sin(28.0 * radius - t * 3.2);
    field = clamp(exp(-4.0 * radius) + 0.45 * petals + 0.35 * rings, 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 2.0 + radius * 14.0);
    chroma = palette(pulse + radius * 0.4, vec3(0.02, 0.28, 0.58));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1,
      "intensity": 0.9,
      "scale": 1.2,
      "line_threshold": 0.74,
      "line_softness": 0.07,
      "edge_strength": 1.15,
      "paper_tint": [0.985, 0.98, 0.965],
      "accent": [0.04, 0.8, 0.9]
    },
  },
  {
    id: "drawing_serpent_line_tunnel",
    name: "Serpent Line Tunnel",
    template: "drawing",
    group: "Ink Flow",
    description: "Tunnel deformation that keeps black linework crisp on white paper.",
    code: `// NAME: Serpent Line Tunnel
uniform float speed; // @min 0.1 @max 3.0 @default 1.15
uniform float intensity; // @min 0.2 @max 1.6 @default 0.82
uniform float scale; // @min 0.6 @max 2.0 @default 1.1
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.72
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.075
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1
uniform vec3 paper_tint; // @default 0.985,0.985,0.97
uniform vec3 accent; // @default 0.42,0.72,0.98

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    float angle = atan(p.y, p.x);
    float radius = max(length(p), 0.04);
    float bands = sin(10.0 * angle + 14.0 / radius - t * 4.2);
    float snake = fbm(vec2(angle * 2.5, 1.0 / radius + t * 0.15));
    field = smoothstep(-0.2, 0.95, bands * 0.5 + snake);
    pulse = 0.5 + 0.5 * cos(t * 1.6 + radius * 11.0);
    chroma = mix(vec3(0.82, 0.84, 0.92), palette(snake + pulse * 0.25, vec3(0.0, 0.16, 0.42)), 0.58);
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1.15,
      "intensity": 0.82,
      "scale": 1.1,
      "line_threshold": 0.72,
      "line_softness": 0.075,
      "edge_strength": 1,
      "paper_tint": [0.985, 0.985, 0.97],
      "accent": [0.42, 0.72, 0.98]
    },
  },
  {
    id: "drawing_prism_hatch_sweep",
    name: "Prism Hatch Sweep",
    template: "drawing",
    group: "Scanner Bands",
    description: "Prismatic scan bands tuned for ink hatching and white paper.",
    code: `// NAME: Prism Hatch Sweep
uniform float speed; // @min 0.1 @max 3.0 @default 1.05
uniform float intensity; // @min 0.2 @max 1.6 @default 0.88
uniform float scale; // @min 0.6 @max 2.0 @default 1
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.73
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.07
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.2
uniform vec3 paper_tint; // @default 0.98,0.98,0.97
uniform vec3 accent; // @default 0.66,0.24,0.95

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = abs(p);
    float gate = smoothstep(0.34, 0.0, abs(q.x - 0.24 - 0.08 * sin(t * 0.9)));
    float beam = smoothstep(0.14, 0.0, abs(q.y + sin(p.x * 9.0 + t * 2.2) * 0.08));
    float shards = fbm(q * 5.0 + vec2(t * 0.6, -t * 0.4));
    field = clamp(gate + beam + shards * 0.45, 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 3.1 + q.y * 12.0);
    chroma = palette(shards + pulse * 0.4, vec3(0.12, 0.38, 0.72));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1.05,
      "intensity": 0.88,
      "scale": 1,
      "line_threshold": 0.73,
      "line_softness": 0.07,
      "edge_strength": 1.2,
      "paper_tint": [0.98, 0.98, 0.97],
      "accent": [0.66, 0.24, 0.95]
    },
  },
  {
    id: "drawing_geodesic_line_pulse",
    name: "Geodesic Line Pulse",
    template: "drawing",
    group: "Op Art",
    description: "Op-art style gridded pulses for line drawings and diagrams.",
    code: `// NAME: Geodesic Line Pulse
uniform float speed; // @min 0.1 @max 3.0 @default 0.95
uniform float intensity; // @min 0.2 @max 1.6 @default 0.8
uniform float scale; // @min 0.6 @max 2.0 @default 1.1
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.75
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.065
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.1
uniform vec3 paper_tint; // @default 0.98,0.98,0.975
uniform vec3 accent; // @default 0.12,0.88,0.66

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = p * 3.4;
    vec2 cellId = floor(q);
    vec2 cellUv = fract(q) - 0.5;
    float lines = smoothstep(0.14, 0.02, min(abs(cellUv.x), abs(cellUv.y)));
    float dotRadius = 0.18 + 0.08 * node_noise(cellId + vec2(3.0, 7.0));
    float dots = smoothstep(dotRadius, 0.0, length(cellUv));
    float sway = fbm(q + vec2(t * 0.25, -t * 0.2));
    field = clamp(lines * 0.85 + dots * 0.75 + sway * 0.35, 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 2.4 + dot(cellId, vec2(0.23, 0.31)));
    chroma = palette(sway + pulse * 0.3, vec3(0.08, 0.24, 0.58));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.95,
      "intensity": 0.8,
      "scale": 1.1,
      "line_threshold": 0.75,
      "line_softness": 0.065,
      "edge_strength": 1.1,
      "paper_tint": [0.98, 0.98, 0.975],
      "accent": [0.12, 0.88, 0.66]
    },
  },
  {
    id: "drawing_paper_crown_echo",
    name: "Paper Crown Echo",
    template: "drawing",
    group: "Ink Halos",
    description: "A tighter radial crown that brightens ink edges while keeping paper clean.",
    code: `// NAME: Paper Crown Echo
uniform float speed; // @min 0.1 @max 3.0 @default 1.1
uniform float intensity; // @min 0.2 @max 1.6 @default 0.9
uniform float scale; // @min 0.6 @max 2.0 @default 1.08
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.73
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.07
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.25
uniform vec3 paper_tint; // @default 0.99,0.985,0.97
uniform vec3 accent; // @default 0.96,0.52,0.18

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    float radius = length(p);
    float crown = sin(20.0 * atan(p.y, p.x));
    float corona = sin(36.0 * radius - t * 4.0);
    float flare = exp(-3.5 * radius);
    field = clamp(flare + 0.35 * crown + 0.35 * corona, 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 4.6 - radius * 18.0);
    chroma = mix(vec3(1.0, 0.68, 0.18), vec3(0.95, 0.14, 0.52), 0.35 + 0.35 * pulse);
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1.1,
      "intensity": 0.9,
      "scale": 1.08,
      "line_threshold": 0.73,
      "line_softness": 0.07,
      "edge_strength": 1.25,
      "paper_tint": [0.99, 0.985, 0.97],
      "accent": [0.96, 0.52, 0.18]
    },
  },
  {
    id: "drawing_spiral_ink_tremor",
    name: "Spiral Ink Tremor",
    template: "drawing",
    group: "Ink Flow",
    description: "Spiral tremor around black lines with restrained paper contamination.",
    code: `// NAME: Spiral Ink Tremor
uniform float speed; // @min 0.1 @max 3.0 @default 1.12
uniform float intensity; // @min 0.2 @max 1.6 @default 0.84
uniform float scale; // @min 0.6 @max 2.0 @default 1.18
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.73
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.075
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.08
uniform vec3 paper_tint; // @default 0.985,0.985,0.975
uniform vec3 accent; // @default 0.16,0.6,0.96

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    float radius = length(p);
    float angle = atan(p.y, p.x);
    float swirl = fbm(vec2(angle * 3.0 + t * 0.6, radius * 6.0 - t * 0.4));
    float ring = smoothstep(0.42, 0.12, abs(radius - 0.32 - 0.07 * sin(t * 1.4)));
    field = clamp(swirl * 0.7 + ring + exp(-5.0 * radius) * 0.3, 0.0, 1.25);
    pulse = 0.5 + 0.5 * cos(t * 2.8 + angle * 4.0);
    chroma = palette(swirl + pulse * 0.35, vec3(0.18, 0.45, 0.78));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1.12,
      "intensity": 0.84,
      "scale": 1.18,
      "line_threshold": 0.73,
      "line_softness": 0.075,
      "edge_strength": 1.08,
      "paper_tint": [0.985, 0.985, 0.975],
      "accent": [0.16, 0.6, 0.96]
    },
  },
  {
    id: "drawing_lotus_contour_warp",
    name: "Lotus Contour Warp",
    template: "drawing",
    group: "Op Art",
    description: "Lotus-like contour folding for bold line drawings.",
    code: `// NAME: Lotus Contour Warp
uniform float speed; // @min 0.1 @max 3.0 @default 0.98
uniform float intensity; // @min 0.2 @max 1.6 @default 0.82
uniform float scale; // @min 0.6 @max 2.0 @default 1.16
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.74
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.07
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.18
uniform vec3 paper_tint; // @default 0.985,0.985,0.972
uniform vec3 accent; // @default 0.18,0.82,0.8

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = kalei(p * (1.0 + 0.18 * sin(t * 0.6)), 8.0);
    float petals = fbm(q * 5.5 + vec2(-t * 0.3, t * 0.45));
    float flower = smoothstep(0.82, 0.18, length(q)) * (0.4 + 0.6 * petals);
    field = clamp(flower + 0.35 * sin(12.0 * atan(q.y, q.x) - t * 1.7), 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 1.9 + petals * 4.0);
    chroma = palette(petals + pulse * 0.25, vec3(0.06, 0.31, 0.64));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.98,
      "intensity": 0.82,
      "scale": 1.16,
      "line_threshold": 0.74,
      "line_softness": 0.07,
      "edge_strength": 1.18,
      "paper_tint": [0.985, 0.985, 0.972],
      "accent": [0.18, 0.82, 0.8]
    },
  },
  {
    id: "drawing_scanner_line_mirror",
    name: "Scanner Line Mirror",
    template: "drawing",
    group: "Scanner Bands",
    description: "Mirrored scanning bands for line drawings and poster artwork.",
    code: `// NAME: Scanner Line Mirror
uniform float speed; // @min 0.1 @max 3.0 @default 1.08
uniform float intensity; // @min 0.2 @max 1.6 @default 0.86
uniform float scale; // @min 0.6 @max 2.0 @default 1
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.73
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.075
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.16
uniform vec3 paper_tint; // @default 0.99,0.985,0.975
uniform vec3 accent; // @default 0.56,0.8,0.98

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = vec2(abs(p.x), p.y);
    float runner = smoothstep(0.2, 0.0, abs(q.x - 0.18 - 0.12 * sin(t * 1.7 + q.y * 6.0)));
    float mirror = smoothstep(0.24, 0.03, abs(q.y - 0.18 * cos(t * 1.1 + q.x * 8.0)));
    float haze = fbm(q * 4.2 + vec2(t * 0.5, -t * 0.3));
    field = clamp(runner + mirror * 0.8 + haze * 0.3, 0.0, 1.3);
    pulse = 0.5 + 0.5 * sin(t * 3.3 + q.y * 10.0);
    chroma = mix(vec3(0.54, 0.88, 1.0), vec3(0.98, 0.24, 0.72), pulse);
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1.08,
      "intensity": 0.86,
      "scale": 1,
      "line_threshold": 0.73,
      "line_softness": 0.075,
      "edge_strength": 1.16,
      "paper_tint": [0.99, 0.985, 0.975],
      "accent": [0.56, 0.8, 0.98]
    },
  },
  {
    id: "drawing_rune_crosshatch_echo",
    name: "Rune Crosshatch Echo",
    template: "drawing",
    group: "Crosshatch Ritual",
    description: "Crosshatch echo with liquid rune motion for drawings and flyers.",
    code: `// NAME: Rune Crosshatch Echo
uniform float speed; // @min 0.1 @max 3.0 @default 1
uniform float intensity; // @min 0.2 @max 1.6 @default 0.84
uniform float scale; // @min 0.6 @max 2.0 @default 1.12
uniform float line_threshold; // @min 0.4 @max 0.9 @default 0.74
uniform float line_softness; // @min 0.01 @max 0.2 @default 0.07
uniform float edge_strength; // @min 0.0 @max 1.8 @default 1.18
uniform vec3 paper_tint; // @default 0.985,0.985,0.975
uniform vec3 accent; // @default 0.16,0.9,0.74

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 centeredUv(vec2 uv, vec2 resolution) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    return p;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * node_noise(p);
        p = rot(0.65) * p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }
    return value;
}

vec2 kalei(vec2 p, float segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / max(segments, 1.0);
    angle = abs(mod(angle + 0.5 * slice, slice) - 0.5 * slice);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t, vec3 phase) {
    return 0.5 + 0.5 * cos(6.28318530718 * (t + phase));
}

float edgeField(sampler2D tex, vec2 uv, vec2 resolution) {
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    return length(vec2(right - left, up - down));
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = luma(source.rgb);
    float ink = 1.0 - smoothstep(line_threshold - line_softness, line_threshold + line_softness, lum);
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = p * 2.4;
    float flow = fbm(q + vec2(t * 0.4, -t * 0.25));
    float weave = sin(q.x * 6.0 + flow * 4.0 + t * 1.8) * cos(q.y * 7.0 - flow * 5.0 - t * 1.3);
    float plasma = 0.5 + 0.5 * sin(weave * 5.0 + t * 1.5);
    field = clamp(plasma + flow * 0.55, 0.0, 1.25);
    pulse = 0.5 + 0.5 * cos(t * 2.5 + flow * 6.0);
    chroma = palette(plasma + flow * 0.2, vec3(0.14, 0.44, 0.76));
    
    float lineMask = clamp(ink + edge * edge_strength, 0.0, 1.0);
    vec3 paper = mix(vec3(1.0), paper_tint, 0.08);
    vec3 effect = mix(accent, chroma, 0.75) * clamp(field * intensity, 0.0, 1.25);
    vec3 inkColor = mix(vec3(0.02), effect + vec3(0.02), clamp(field * 0.9 + edge * 0.35, 0.0, 1.0));
    vec3 halo = chroma * field * smoothstep(0.0, 0.18, edge) * 0.18;
    vec3 result = mix(paper, clamp(inkColor + halo, 0.0, 1.0), lineMask);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1,
      "intensity": 0.84,
      "scale": 1.12,
      "line_threshold": 0.74,
      "line_softness": 0.07,
      "edge_strength": 1.18,
      "paper_tint": [0.985, 0.985, 0.975],
      "accent": [0.16, 0.9, 0.74]
    },
  }
];
