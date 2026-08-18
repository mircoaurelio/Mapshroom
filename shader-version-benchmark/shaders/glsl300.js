export const glsl300Shaders = [
  {
    id: 'glsl300-1',
    title: 'Prismatic Relief Scan',
    code: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + 1.0), f.x), f.y);
}

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 spectral(float x) {
  return 0.55 + 0.45 * cos(6.2831853 * (x + vec3(0.00, 0.67, 0.34)));
}

void main() {
  vec4 src = texture(u_source, v_uv);
  float l = luminance(src.rgb);
  float alpha = src.a * smoothstep(0.008, 0.035, l);
  if (alpha <= 0.001) {
    outColor = vec4(0.0);
    return;
  }

  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float lx0 = luminance(texture(u_source, v_uv - vec2(texel.x, 0.0)).rgb);
  float lx1 = luminance(texture(u_source, v_uv + vec2(texel.x, 0.0)).rgb);
  float ly0 = luminance(texture(u_source, v_uv - vec2(0.0, texel.y)).rgb);
  float ly1 = luminance(texture(u_source, v_uv + vec2(0.0, texel.y)).rgb);
  vec2 grad = vec2(lx1 - lx0, ly1 - ly0);
  float slope = length(grad) * max(u_resolution.x, u_resolution.y) * 0.018;

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float sc = max(abs(u_scale), 0.05);
  float t = u_time * u_speed;
  float grain = valueNoise(p * (22.0 * sc) + vec2(t * 0.13, -t * 0.09));
  float height = l + 0.16 * slope + (grain - 0.5) * 0.075;
  float bands = 0.5 + 0.5 * cos(6.2831853 * (height * (11.0 * sc) - t * 0.28));
  float line = 1.0 - smoothstep(0.06, 0.30, abs(bands - 0.5));

  float sweepPhase = dot(p, normalize(vec2(1.0, 0.42))) * 1.8 - t * 0.55;
  sweepPhase += (grain - 0.5) * 0.34 + dot(grad, vec2(-1.0, 1.0)) * 2.0;
  float pulse = exp(-7.0 * pow(abs(fract(sweepPhase) - 0.5), 2.0));
  vec3 prism = spectral(height * 1.7 + sweepPhase * 0.18 + t * 0.06);
  vec3 base = src.rgb * (0.48 + 0.62 * l);
  vec3 color = mix(base, prism * (0.45 + 0.85 * l), clamp(line * 0.72, 0.0, 1.0));
  color += prism * pulse * (0.28 + 0.72 * line) * u_intensity;
  color += vec3(0.35, 0.55, 0.85) * slope * 0.08 * u_intensity;
  outColor = vec4(max(color, 0.0), alpha);
}`
  },
  {
    id: 'glsl300-2',
    title: 'Aurora Contour Current',
    code: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float lum(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; ++i) {
    s += a * noise2(p);
    p = r * p * 2.03 + 13.7;
    a *= 0.5;
  }
  return s;
}

vec3 aurora(float x) {
  vec3 a = vec3(0.48, 0.50, 0.54);
  vec3 b = vec3(0.46, 0.42, 0.48);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.00, 0.28, 0.61);
  return a + b * cos(6.2831853 * (c * x + d));
}

void main() {
  vec4 src = texture(u_source, v_uv);
  float center = lum(src.rgb);
  float alpha = src.a * smoothstep(0.006, 0.03, center);
  if (alpha < 0.001) {
    outColor = vec4(0.0);
    return;
  }

  vec2 e = 1.0 / max(u_resolution, vec2(1.0));
  float n = lum(texture(u_source, v_uv + vec2(0.0, e.y)).rgb);
  float s = lum(texture(u_source, v_uv - vec2(0.0, e.y)).rgb);
  float east = lum(texture(u_source, v_uv + vec2(e.x, 0.0)).rgb);
  float west = lum(texture(u_source, v_uv - vec2(e.x, 0.0)).rgb);
  vec2 g = vec2(east - west, n - s);
  float ridge = length(g) * min(u_resolution.x, u_resolution.y) * 0.025;

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float sc = max(abs(u_scale), 0.08);
  float t = u_time * u_speed;
  float q = fbm(p * (3.5 * sc) + vec2(0.0, t * 0.12));
  float r = fbm(p * (8.0 * sc) + vec2(q * 2.1, -t * 0.19));
  vec2 flow = vec2(q - 0.5, r - 0.5);

  float topoCoord = center * (14.0 * sc) + ridge * 1.8 + r * 1.4;
  float cell = abs(fract(topoCoord) - 0.5);
  float contour = 1.0 - smoothstep(0.035, 0.13, cell);
  float current = p.y + 0.30 * sin(p.x * 4.2 + q * 5.0) + flow.x * 0.32;
  float crest = exp(-22.0 * pow(current - 0.62 * sin(t * 0.42), 2.0));
  float wake = 0.5 + 0.5 * sin(current * 18.0 - t * 3.0 + r * 6.0);
  crest *= 0.7 + 0.3 * wake;

  vec3 hue = aurora(center + q * 0.35 + t * 0.035);
  vec3 ink = src.rgb * (0.42 + center * 0.72);
  vec3 color = mix(ink, hue * (0.35 + center), contour * 0.78);
  color += hue * crest * (0.5 + contour * 0.7) * u_intensity;
  color += vec3(0.10, 0.50, 0.85) * ridge * 0.055 * u_intensity;
  outColor = vec4(max(color, vec3(0.0)), alpha);
}`
  },
  {
    id: 'glsl300-3',
    title: 'Chromatic Basin Pulse',
    code: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float cellular(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; ++y) {
    for (int x = -1; x <= 1; ++x) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hash22(i + o);
      vec2 delta = o + h - f;
      d = min(d, dot(delta, delta));
    }
  }
  return sqrt(d);
}

vec3 spectrum(float x) {
  x = fract(x);
  vec3 c = clamp(abs(fract(x + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}

void main() {
  vec4 src = texture(u_source, v_uv);
  float h = luma(src.rgb);
  float alpha = src.a * smoothstep(0.007, 0.032, h);
  if (alpha <= 0.001) {
    outColor = vec4(0.0);
    return;
  }

  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  float h00 = luma(texture(u_source, v_uv + px * vec2(-1.0, -1.0)).rgb);
  float h10 = luma(texture(u_source, v_uv + px * vec2( 0.0, -1.0)).rgb);
  float h20 = luma(texture(u_source, v_uv + px * vec2( 1.0, -1.0)).rgb);
  float h01 = luma(texture(u_source, v_uv + px * vec2(-1.0,  0.0)).rgb);
  float h21 = luma(texture(u_source, v_uv + px * vec2( 1.0,  0.0)).rgb);
  float h02 = luma(texture(u_source, v_uv + px * vec2(-1.0,  1.0)).rgb);
  float h12 = luma(texture(u_source, v_uv + px * vec2( 0.0,  1.0)).rgb);
  float h22 = luma(texture(u_source, v_uv + px * vec2( 1.0,  1.0)).rgb);
  vec2 sobel = vec2((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02),
                    (h02 + 2.0 * h12 + h22) - (h00 + 2.0 * h10 + h20));
  float relief = length(sobel);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float sc = max(abs(u_scale), 0.06);
  float t = u_time * u_speed;
  float cells = cellular(p * (12.0 * sc) + vec2(t * 0.11, -t * 0.07));
  float microWarp = (cells - 0.36) * 0.16;

  float levels = h * (10.0 + 7.0 * sc) + relief * 3.1 + microWarp;
  float saw = abs(fract(levels) - 0.5);
  float contour = 1.0 - smoothstep(0.055, 0.18, saw);
  vec2 origin = vec2(-0.34 * aspect, -0.28);
  float basinDistance = length(p - origin + sobel * 0.8);
  float ringPhase = basinDistance * 2.35 - t * 0.48 + cells * 0.11;
  float pulse = exp(-30.0 * pow(abs(fract(ringPhase) - 0.5), 2.0));
  float filament = 0.5 + 0.5 * cos(28.0 * cells + t * 1.4);

  vec3 spectralColor = spectrum(h * 0.62 + basinDistance * 0.22 - t * 0.045);
  vec3 charcoal = src.rgb * (0.36 + h * 0.78);
  vec3 color = mix(charcoal, spectralColor * (0.38 + h * 0.92), contour * 0.74);
  color += spectralColor * pulse * (0.42 + 0.58 * filament) * (0.6 + contour) * u_intensity;
  color += vec3(0.8, 0.35, 1.0) * relief * 0.65 * u_intensity;
  outColor = vec4(max(color, vec3(0.0)), alpha);
}`
  },
  {
    id: 'glsl300-4',
    title: 'Iridescent Fault Lines',
    code: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
}

vec3 fireSpectrum(float x) {
  vec3 p = vec3(0.52, 0.50, 0.52);
  vec3 q = vec3(0.48, 0.48, 0.48);
  return p + q * cos(6.2831853 * (x + vec3(0.18, 0.51, 0.84)));
}

void main() {
  vec4 src = texture(u_source, v_uv);
  float h = luminance(src.rgb);
  float alpha = src.a * smoothstep(0.009, 0.038, h);
  if (alpha < 0.001) {
    outColor = vec4(0.0);
    return;
  }

  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float rightH = luminance(texture(u_source, v_uv + vec2(texel.x, 0.0)).rgb);
  float leftH = luminance(texture(u_source, v_uv - vec2(texel.x, 0.0)).rgb);
  float upH = luminance(texture(u_source, v_uv + vec2(0.0, texel.y)).rgb);
  float downH = luminance(texture(u_source, v_uv - vec2(0.0, texel.y)).rgb);
  vec2 grad = vec2(rightH - leftH, upH - downH);
  float edge = length(grad) * sqrt(max(u_resolution.x * u_resolution.y, 1.0)) * 0.018;

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float sc = max(abs(u_scale), 0.05);
  float t = u_time * u_speed;
  vec2 fault = vec2(
    sin(p.y * 9.0 * sc + t * 0.33),
    cos(p.x * 7.0 * sc - t * 0.29)
  );
  float grit = smoothNoise(p * (30.0 * sc) + fault * 0.85);
  float directional = dot(normalize(grad + vec2(0.0001)), normalize(vec2(0.72, -0.69)));

  float topo = h * (13.0 * sc) + edge * 1.4 + directional * 0.22 + (grit - 0.5) * 0.18;
  float phaseDeriv = max(fwidth(topo), 0.003);
  float nearestLine = abs(fract(topo) - 0.5);
  float contour = 1.0 - smoothstep(0.045 + phaseDeriv, 0.14 + phaseDeriv, nearestLine);

  float slash = dot(p + fault * 0.025, normalize(vec2(-0.38, 0.925)));
  slash += 0.055 * sin(p.x * 23.0 + grit * 5.0);
  float wave = 0.5 + 0.5 * cos((slash - t * 0.31) * 6.2831853);
  float energy = pow(wave, 9.0);
  float afterglow = pow(wave, 2.5) * 0.22;
  vec3 spectrum = fireSpectrum(topo * 0.075 + slash * 0.24 + t * 0.04);

  vec3 base = src.rgb * (0.44 + 0.64 * h);
  vec3 color = mix(base, spectrum * (0.42 + 0.82 * h), contour * 0.80);
  color += spectrum * (energy + afterglow) * (0.55 + contour * 0.65) * u_intensity;
  color += vec3(0.20, 0.62, 1.0) * edge * 0.07 * u_intensity;
  outColor = vec4(max(color, 0.0), alpha);
}`
  },
  {
    id: 'glsl300-5',
    title: 'Spectral Gyre Cartography',
    code: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash11(float x) {
  return fract(sin(x * 127.17) * 43758.5453);
}

float ridgeNoise(vec2 p) {
  float a = sin(dot(p, vec2(1.0, 1.618)) + hash11(floor(p.x)) * 6.2831853);
  float b = sin(dot(p, vec2(-1.414, 0.73)) * 1.37 + hash11(floor(p.y) + 9.0) * 6.2831853);
  return 0.5 + 0.25 * (a + b);
}

vec3 rainbow(float x) {
  vec3 k = vec3(0.0, 2.0943951, 4.1887902);
  return 0.52 + 0.48 * sin(6.2831853 * x + k);
}

void main() {
  vec4 src = texture(u_source, v_uv);
  float h = lum(src.rgb);
  float alpha = src.a * smoothstep(0.006, 0.034, h);
  if (alpha <= 0.001) {
    outColor = vec4(0.0);
    return;
  }

  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float xp = lum(texture(u_source, v_uv + vec2(texel.x, 0.0)).rgb);
  float xm = lum(texture(u_source, v_uv - vec2(texel.x, 0.0)).rgb);
  float yp = lum(texture(u_source, v_uv + vec2(0.0, texel.y)).rgb);
  float ym = lum(texture(u_source, v_uv - vec2(0.0, texel.y)).rgb);
  vec2 g = vec2(xp - xm, yp - ym);
  float inclination = atan(g.y, g.x);
  float slope = length(g) * min(u_resolution.x, u_resolution.y) * 0.028;

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float sc = max(abs(u_scale), 0.06);
  float t = u_time * u_speed;
  float radial = length(p);
  float angle = atan(p.y, p.x);
  float fine = ridgeNoise(p * (27.0 * sc) + vec2(cos(t * 0.11), sin(t * 0.09)));

  float elevation = h * (12.0 * sc) + slope * 2.25 + 0.24 * sin(inclination * 3.0);
  elevation += (fine - 0.5) * 0.28;
  float iso = abs(sin(3.14159265 * elevation));
  float contour = 1.0 - smoothstep(0.10, 0.34, iso);

  float spiral = radial * 2.8 + angle / 6.2831853;
  spiral += 0.10 * sin(angle * 5.0 - radial * 17.0 + fine * 3.0);
  float phase = fract(spiral - t * 0.24);
  float front = exp(-42.0 * pow(phase - 0.5, 2.0));
  float shimmer = 0.55 + 0.45 * sin(elevation * 5.0 - t * 1.5 + angle * 2.0);
  vec3 spectral = rainbow(h * 0.55 + angle / 6.2831853 + t * 0.035 + fine * 0.1);

  vec3 base = src.rgb * (0.40 + 0.72 * h);
  vec3 color = mix(base, spectral * (0.38 + h), contour * 0.76);
  color += spectral * front * (0.48 + 0.52 * shimmer) * (0.65 + contour) * u_intensity;
  color += rainbow(inclination / 6.2831853) * slope * 0.075 * u_intensity;
  outColor = vec4(max(color, vec3(0.0)), alpha);
}`
  }
];
