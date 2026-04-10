import type { ShaderPresetDefinition } from '../types';

export const stagePresetList: ShaderPresetDefinition[] = [
  {
    id: "stage_contour_beacon_base",
    name: "Contour Beacon Base",
    template: "stage",
    group: "Base",
    description: "Simple contour lift for stage assets with a restrained psy pulse.",
    code: `// NAME: Contour Beacon Base
uniform float speed; // @min 0.1 @max 3.5 @default 0.9
uniform float intensity; // @min 0.2 @max 2.0 @default 0.9
uniform float scale; // @min 0.6 @max 2.4 @default 1
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.6
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.03
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.72
uniform vec3 accent; // @default 0.18,0.82,0.98

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 0.9,
      "intensity": 0.9,
      "scale": 1,
      "halo_strength": 0.6,
      "black_threshold": 0.03,
      "white_threshold": 0.72,
      "accent": [0.18, 0.82, 0.98]
    },
  },
  {
    id: "stage_laser_mandala_bloom",
    name: "Laser Mandala Bloom",
    template: "stage",
    group: "Sacred Geometry",
    description: "Sacred-geometry petals and laser bloom for psytrance LED walls.",
    code: `// NAME: Laser Mandala Bloom
uniform float speed; // @min 0.1 @max 3.5 @default 1.25
uniform float intensity; // @min 0.2 @max 2.0 @default 1.25
uniform float scale; // @min 0.6 @max 2.4 @default 1.3
uniform float halo_strength; // @min 0.0 @max 1.8 @default 1.15
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.02
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.75
uniform vec3 accent; // @default 0.08,0.86,0.96

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.25,
      "intensity": 1.25,
      "scale": 1.3,
      "halo_strength": 1.15,
      "black_threshold": 0.02,
      "white_threshold": 0.75,
      "accent": [0.08, 0.86, 0.96]
    },
  },
  {
    id: "stage_chrome_serpent_tunnel",
    name: "Chrome Serpent Tunnel",
    template: "stage",
    group: "Tunnels",
    description: "Chrome tunnel bands and serpent flow for darker stage media.",
    code: `// NAME: Chrome Serpent Tunnel
uniform float speed; // @min 0.1 @max 3.5 @default 1.45
uniform float intensity; // @min 0.2 @max 2.0 @default 1.1
uniform float scale; // @min 0.6 @max 2.4 @default 1.15
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.9
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.02
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.8
uniform vec3 accent; // @default 0.72,0.8,1

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.45,
      "intensity": 1.1,
      "scale": 1.15,
      "halo_strength": 0.9,
      "black_threshold": 0.02,
      "white_threshold": 0.8,
      "accent": [0.72, 0.8, 1]
    },
  },
  {
    id: "stage_prism_gate_scanner",
    name: "Prism Gate Scanner",
    template: "stage",
    group: "Laser Gates",
    description: "Prismatic gates and scanning beams for festival transitions.",
    code: `// NAME: Prism Gate Scanner
uniform float speed; // @min 0.1 @max 3.5 @default 1.35
uniform float intensity; // @min 0.2 @max 2.0 @default 1.2
uniform float scale; // @min 0.6 @max 2.4 @default 1.05
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.85
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.025
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.78
uniform vec3 accent; // @default 0.58,0.22,0.98

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
    float edge = edgeField(tex, uv, resolution);
    vec2 p = centeredUv(uv, resolution) * scale;
    float t = time * speed;
    float field = 0.0;
    float pulse = 0.0;
    vec3 chroma = accent;

    vec2 q = abs(p);
    float gate = smoothstep(0.34, 0.0, abs(q.x - 0.24 - 0.08 * sin(t * 0.9)));
    float scanBeam = smoothstep(0.14, 0.0, abs(q.y + sin(p.x * 9.0 + t * 2.2) * 0.08));
    float shards = fbm(q * 5.0 + vec2(t * 0.6, -t * 0.4));
    field = clamp(gate + scanBeam + shards * 0.45, 0.0, 1.25);
    pulse = 0.5 + 0.5 * sin(t * 3.1 + q.y * 12.0);
    chroma = palette(shards + pulse * 0.4, vec3(0.12, 0.38, 0.72));
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.35,
      "intensity": 1.2,
      "scale": 1.05,
      "halo_strength": 0.85,
      "black_threshold": 0.025,
      "white_threshold": 0.78,
      "accent": [0.58, 0.22, 0.98]
    },
  },
  {
    id: "stage_shakti_grid_pulse",
    name: "Shakti Grid Pulse",
    template: "stage",
    group: "Reactive Grids",
    description: "Reactive gridded shimmer with shrine-dot motion for psytrance pacing.",
    code: `// NAME: Shakti Grid Pulse
uniform float speed; // @min 0.1 @max 3.5 @default 1.2
uniform float intensity; // @min 0.2 @max 2.0 @default 1.08
uniform float scale; // @min 0.6 @max 2.4 @default 1.18
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.7
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.03
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.82
uniform vec3 accent; // @default 0.18,0.96,0.74

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.2,
      "intensity": 1.08,
      "scale": 1.18,
      "halo_strength": 0.7,
      "black_threshold": 0.03,
      "white_threshold": 0.82,
      "accent": [0.18, 0.96, 0.74]
    },
  },
  {
    id: "stage_solar_crown_strobe",
    name: "Solar Crown Strobe",
    template: "stage",
    group: "Sacred Geometry",
    description: "Radial sun-crown strobe inspired by mandala and laser festival looks.",
    code: `// NAME: Solar Crown Strobe
uniform float speed; // @min 0.1 @max 3.5 @default 1.55
uniform float intensity; // @min 0.2 @max 2.0 @default 1.28
uniform float scale; // @min 0.6 @max 2.4 @default 1.22
uniform float halo_strength; // @min 0.0 @max 1.8 @default 1.18
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.02
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.74
uniform vec3 accent; // @default 0.98,0.55,0.18

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.55,
      "intensity": 1.28,
      "scale": 1.22,
      "halo_strength": 1.18,
      "black_threshold": 0.02,
      "white_threshold": 0.74,
      "accent": [0.98, 0.55, 0.18]
    },
  },
  {
    id: "stage_vortex_halo_runner",
    name: "Vortex Halo Runner",
    template: "stage",
    group: "Plasma Flow",
    description: "Circular halo vortex with fast psytrance pacing.",
    code: `// NAME: Vortex Halo Runner
uniform float speed; // @min 0.1 @max 3.5 @default 1.42
uniform float intensity; // @min 0.2 @max 2.0 @default 1.15
uniform float scale; // @min 0.6 @max 2.4 @default 1.28
uniform float halo_strength; // @min 0.0 @max 1.8 @default 1
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.025
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.8
uniform vec3 accent; // @default 0.18,0.62,1

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.42,
      "intensity": 1.15,
      "scale": 1.28,
      "halo_strength": 1,
      "black_threshold": 0.025,
      "white_threshold": 0.8,
      "accent": [0.18, 0.62, 1]
    },
  },
  {
    id: "stage_fractal_lotus_warp",
    name: "Fractal Lotus Warp",
    template: "stage",
    group: "Sacred Geometry",
    description: "Lotus-fold kaleidoscopic warp for psytrance backdrops.",
    code: `// NAME: Fractal Lotus Warp
uniform float speed; // @min 0.1 @max 3.5 @default 1.18
uniform float intensity; // @min 0.2 @max 2.0 @default 1.12
uniform float scale; // @min 0.6 @max 2.4 @default 1.3
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.88
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.02
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.77
uniform vec3 accent; // @default 0.2,0.88,0.84

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.18,
      "intensity": 1.12,
      "scale": 1.3,
      "halo_strength": 0.88,
      "black_threshold": 0.02,
      "white_threshold": 0.77,
      "accent": [0.2, 0.88, 0.84]
    },
  },
  {
    id: "stage_void_mirror_runner",
    name: "Void Mirror Runner",
    template: "stage",
    group: "Laser Gates",
    description: "Mirrored laser runners that work well on dark stage plates.",
    code: `// NAME: Void Mirror Runner
uniform float speed; // @min 0.1 @max 3.5 @default 1.38
uniform float intensity; // @min 0.2 @max 2.0 @default 1.16
uniform float scale; // @min 0.6 @max 2.4 @default 1.1
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.92
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.02
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.79
uniform vec3 accent; // @default 0.58,0.86,1

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.38,
      "intensity": 1.16,
      "scale": 1.1,
      "halo_strength": 0.92,
      "black_threshold": 0.02,
      "white_threshold": 0.79,
      "accent": [0.58, 0.86, 1]
    },
  },
  {
    id: "stage_ritual_plasma_weave",
    name: "Ritual Plasma Weave",
    template: "stage",
    group: "Plasma Flow",
    description: "Flowing plasma weave for psychedelic peaks and liquid transitions.",
    code: `// NAME: Ritual Plasma Weave
uniform float speed; // @min 0.1 @max 3.5 @default 1.32
uniform float intensity; // @min 0.2 @max 2.0 @default 1.2
uniform float scale; // @min 0.6 @max 2.4 @default 1.24
uniform float halo_strength; // @min 0.0 @max 1.8 @default 0.82
uniform float black_threshold; // @min 0.0 @max 0.3 @default 0.03
uniform float white_threshold; // @min 0.2 @max 0.95 @default 0.82
uniform vec3 accent; // @default 0.18,0.94,0.78

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
    float subject = smoothstep(black_threshold, white_threshold, lum) * source.a;
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
    
    float energy = clamp(field * (0.65 + 0.35 * pulse), 0.0, 1.5);
    float lineMask = clamp(subject + smoothstep(0.03, 0.28, edge), 0.0, 1.0);
    vec3 stageColor = mix(accent, chroma, 0.7);
    vec3 beam = stageColor * energy * lineMask;
    vec3 halo = chroma * energy * halo_strength * smoothstep(0.0, 0.22, edge);
    vec3 lift = source.rgb * (0.08 + 0.12 * energy);
    vec3 result = (beam + halo + lift) * intensity;
    float alpha = clamp(max(lineMask, energy * 0.45), 0.0, 1.0);
    return vec4(clamp(result, 0.0, 1.0), alpha);
}`,
    uniformValues: {
      "speed": 1.32,
      "intensity": 1.2,
      "scale": 1.24,
      "halo_strength": 0.82,
      "black_threshold": 0.03,
      "white_threshold": 0.82,
      "accent": [0.18, 0.94, 0.78]
    },
  }
];
