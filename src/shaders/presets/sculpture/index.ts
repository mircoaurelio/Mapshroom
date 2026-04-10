import type { ShaderPresetDefinition } from '../types';

export const sculpturePresetList: ShaderPresetDefinition[] = [
  {
    id: "sculpture_statue_rim_base",
    name: "Statue Rim Base",
    template: "sculpture",
    group: "Base",
    description: "Simple rim-light relief for statues isolated on black.",
    code: `// NAME: Statue Rim Base
uniform float speed; // @min 0.1 @max 2.5 @default 0.6
uniform float intensity; // @min 0.2 @max 1.8 @default 0.95
uniform float scale; // @min 0.6 @max 2.0 @default 1
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.06
uniform float relief_depth; // @min 1.0 @max 12.0 @default 7.5
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.1
uniform vec3 accent; // @default 0.78,0.88,1

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.6,
      "intensity": 0.95,
      "scale": 1,
      "bg_threshold": 0.06,
      "relief_depth": 7.5,
      "rim_strength": 1.1,
      "accent": [0.78, 0.88, 1]
    },
  },
  {
    id: "sculpture_statue_mandala_rim",
    name: "Statue Mandala Rim",
    template: "sculpture",
    group: "Relief Halos",
    description: "Mandala-like rim pulses that hug a statue silhouette on black.",
    code: `// NAME: Statue Mandala Rim
uniform float speed; // @min 0.1 @max 2.5 @default 0.95
uniform float intensity; // @min 0.2 @max 1.8 @default 1.1
uniform float scale; // @min 0.6 @max 2.0 @default 1.2
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.05
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.5
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.35
uniform vec3 accent; // @default 0.22,0.78,1

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.95,
      "intensity": 1.1,
      "scale": 1.2,
      "bg_threshold": 0.05,
      "relief_depth": 8.5,
      "rim_strength": 1.35,
      "accent": [0.22, 0.78, 1]
    },
  },
  {
    id: "sculpture_chrome_relief_tunnel",
    name: "Chrome Relief Tunnel",
    template: "sculpture",
    group: "Chrome Relief",
    description: "Chrome tunnel reflections drifting across sculptural relief.",
    code: `// NAME: Chrome Relief Tunnel
uniform float speed; // @min 0.1 @max 2.5 @default 1
uniform float intensity; // @min 0.2 @max 1.8 @default 1.08
uniform float scale; // @min 0.6 @max 2.0 @default 1.1
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.055
uniform float relief_depth; // @min 1.0 @max 12.0 @default 9.2
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.1
uniform vec3 accent; // @default 0.85,0.9,1

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 1,
      "intensity": 1.08,
      "scale": 1.1,
      "bg_threshold": 0.055,
      "relief_depth": 9.2,
      "rim_strength": 1.1,
      "accent": [0.85, 0.9, 1]
    },
  },
  {
    id: "sculpture_prism_totem_beam",
    name: "Prism Totem Beam",
    template: "sculpture",
    group: "Laser Relief",
    description: "Prismatic beam sweeps for statues and totem-like silhouettes on black.",
    code: `// NAME: Prism Totem Beam
uniform float speed; // @min 0.1 @max 2.5 @default 0.95
uniform float intensity; // @min 0.2 @max 1.8 @default 1.12
uniform float scale; // @min 0.6 @max 2.0 @default 1.02
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.05
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.8
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.22
uniform vec3 accent; // @default 0.68,0.34,0.98

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.95,
      "intensity": 1.12,
      "scale": 1.02,
      "bg_threshold": 0.05,
      "relief_depth": 8.8,
      "rim_strength": 1.22,
      "accent": [0.68, 0.34, 0.98]
    },
  },
  {
    id: "sculpture_relic_grid_carve",
    name: "Relic Grid Carve",
    template: "sculpture",
    group: "Structural Relief",
    description: "Geodesic grid carving and glow for statues against black.",
    code: `// NAME: Relic Grid Carve
uniform float speed; // @min 0.1 @max 2.5 @default 0.9
uniform float intensity; // @min 0.2 @max 1.8 @default 1.04
uniform float scale; // @min 0.6 @max 2.0 @default 1.12
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.055
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.2
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1
uniform vec3 accent; // @default 0.2,0.86,0.72

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.9,
      "intensity": 1.04,
      "scale": 1.12,
      "bg_threshold": 0.055,
      "relief_depth": 8.2,
      "rim_strength": 1,
      "accent": [0.2, 0.86, 0.72]
    },
  },
  {
    id: "sculpture_marble_crown_pulse",
    name: "Marble Crown Pulse",
    template: "sculpture",
    group: "Relief Halos",
    description: "Sun-crown relief lighting for statues filmed on black.",
    code: `// NAME: Marble Crown Pulse
uniform float speed; // @min 0.1 @max 2.5 @default 0.9
uniform float intensity; // @min 0.2 @max 1.8 @default 1.1
uniform float scale; // @min 0.6 @max 2.0 @default 1.12
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.05
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.9
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.32
uniform vec3 accent; // @default 1,0.64,0.22

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.9,
      "intensity": 1.1,
      "scale": 1.12,
      "bg_threshold": 0.05,
      "relief_depth": 8.9,
      "rim_strength": 1.32,
      "accent": [1, 0.64, 0.22]
    },
  },
  {
    id: "sculpture_void_rim_scanner",
    name: "Void Rim Scanner",
    template: "sculpture",
    group: "Chrome Relief",
    description: "A vortex-driven rim scanner for statues isolated on black.",
    code: `// NAME: Void Rim Scanner
uniform float speed; // @min 0.1 @max 2.5 @default 0.96
uniform float intensity; // @min 0.2 @max 1.8 @default 1.05
uniform float scale; // @min 0.6 @max 2.0 @default 1.16
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.055
uniform float relief_depth; // @min 1.0 @max 12.0 @default 9.4
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.28
uniform vec3 accent; // @default 0.22,0.68,1

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.96,
      "intensity": 1.05,
      "scale": 1.16,
      "bg_threshold": 0.055,
      "relief_depth": 9.4,
      "rim_strength": 1.28,
      "accent": [0.22, 0.68, 1]
    },
  },
  {
    id: "sculpture_facet_lotus_relief",
    name: "Facet Lotus Relief",
    template: "sculpture",
    group: "Structural Relief",
    description: "Kaleidoscopic lotus relief for statues and busts on black.",
    code: `// NAME: Facet Lotus Relief
uniform float speed; // @min 0.1 @max 2.5 @default 0.88
uniform float intensity; // @min 0.2 @max 1.8 @default 1.06
uniform float scale; // @min 0.6 @max 2.0 @default 1.2
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.05
uniform float relief_depth; // @min 1.0 @max 12.0 @default 9
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.18
uniform vec3 accent; // @default 0.24,0.84,0.82

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.88,
      "intensity": 1.06,
      "scale": 1.2,
      "bg_threshold": 0.05,
      "relief_depth": 9,
      "rim_strength": 1.18,
      "accent": [0.24, 0.84, 0.82]
    },
  },
  {
    id: "sculpture_monument_mirror_sweep",
    name: "Monument Mirror Sweep",
    template: "sculpture",
    group: "Laser Relief",
    description: "Mirrored relief sweeps for statues, masks, and monuments on black.",
    code: `// NAME: Monument Mirror Sweep
uniform float speed; // @min 0.1 @max 2.5 @default 0.94
uniform float intensity; // @min 0.2 @max 1.8 @default 1.08
uniform float scale; // @min 0.6 @max 2.0 @default 1.05
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.05
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.6
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.22
uniform vec3 accent; // @default 0.62,0.88,1

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.94,
      "intensity": 1.08,
      "scale": 1.05,
      "bg_threshold": 0.05,
      "relief_depth": 8.6,
      "rim_strength": 1.22,
      "accent": [0.62, 0.88, 1]
    },
  },
  {
    id: "sculpture_relic_plasma_wash",
    name: "Relic Plasma Wash",
    template: "sculpture",
    group: "Patina Flow",
    description: "Patina-like plasma wash for sculptures isolated against black.",
    code: `// NAME: Relic Plasma Wash
uniform float speed; // @min 0.1 @max 2.5 @default 0.9
uniform float intensity; // @min 0.2 @max 1.8 @default 1.06
uniform float scale; // @min 0.6 @max 2.0 @default 1.14
uniform float bg_threshold; // @min 0.0 @max 0.25 @default 0.055
uniform float relief_depth; // @min 1.0 @max 12.0 @default 8.4
uniform float rim_strength; // @min 0.0 @max 1.8 @default 1.08
uniform vec3 accent; // @default 0.2,0.9,0.76

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
    float subject = smoothstep(bg_threshold, bg_threshold + 0.18, lum) * source.a;
    vec2 px = 1.0 / max(resolution, vec2(1.0));
    float left = luma(texture2D(tex, uv - vec2(px.x, 0.0)).rgb);
    float right = luma(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float down = luma(texture2D(tex, uv - vec2(0.0, px.y)).rgb);
    float up = luma(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec3 normal = normalize(vec3((right - left) * relief_depth, (up - down) * relief_depth, 1.0));
    float edge = length(vec2(right - left, up - down));
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
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 * sin(t * 0.35), 0.3 * cos(t * 0.27), 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
    vec3 base = source.rgb * (0.18 + 0.85 * diff);
    vec3 env = mix(accent, chroma, 0.7) * field * (0.35 + 0.65 * pulse);
    vec3 rimLight = (accent * 0.55 + chroma * 0.45) * (rim * rim_strength + smoothstep(0.04, 0.22, edge) * 0.25 * rim_strength);
    vec3 result = (base + env * subject + rimLight) * intensity * subject;
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
    uniformValues: {
      "speed": 0.9,
      "intensity": 1.06,
      "scale": 1.14,
      "bg_threshold": 0.055,
      "relief_depth": 8.4,
      "rim_strength": 1.08,
      "accent": [0.2, 0.9, 0.76]
    },
  }
];
