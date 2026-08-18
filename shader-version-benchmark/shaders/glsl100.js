export const glsl100Shaders = [
  {
    id: 'glsl100-1',
    title: 'Prismatic Drift Cartography',
    code: `precision highp float;

varying vec2 v_uv;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    s += a * valueNoise(p);
    p = r * p * 2.03 + 7.1;
    a *= 0.5;
  }
  return s;
}

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 spectral(float t) {
  return 0.52 + 0.48 * cos(6.2831853 * (t + vec3(0.00, 0.34, 0.67)));
}

void main() {
  vec4 src = texture2D(u_source, v_uv);
  float lum = luminance(src.rgb);
  float keep = step(0.004, src.a) * step(0.008, lum);

  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float lx1 = luminance(texture2D(u_source, clamp(v_uv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float lx0 = luminance(texture2D(u_source, clamp(v_uv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float ly1 = luminance(texture2D(u_source, clamp(v_uv + vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  float ly0 = luminance(texture2D(u_source, clamp(v_uv - vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  vec2 grad = vec2(lx1 - lx0, ly1 - ly0);
  float slope = length(grad);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float tm = u_time * u_speed;
  float scale = max(u_scale, 0.001);
  vec2 q = p * (2.5 * scale);
  vec2 warp = vec2(fbm(q + vec2(0.0, tm * 0.13)), fbm(q + vec2(5.2, -tm * 0.11))) - 0.5;
  float terrain = lum * 9.0 + slope * 24.0 + fbm(q * 1.7 + warp * 1.8) * 1.7;
  float contourPhase = fract(terrain - tm * 0.18);
  float contours = 1.0 - smoothstep(0.05, 0.22, min(contourPhase, 1.0 - contourPhase));

  float path = dot(p + warp * 0.16, normalize(vec2(1.0, 0.38)));
  float waveCenter = fract(tm * 0.10) * (aspect + 1.4) - 0.7;
  float energy = exp(-18.0 * abs(path - waveCenter));
  energy += 0.35 * exp(-8.0 * abs(path - waveCenter + 0.18));
  float phase = terrain * 0.075 + path * 0.42 - tm * 0.07;
  vec3 color = spectral(phase + energy * 0.18);
  color *= 0.22 + 0.78 * lum;
  color += spectral(phase + 0.18) * contours * (0.38 + slope * 3.5);
  color += spectral(phase - 0.12) * energy * (0.85 + 0.65 * u_intensity);
  color = mix(src.rgb, color, clamp(0.58 + 0.32 * u_intensity, 0.0, 1.0));

  gl_FragColor = vec4(color * keep, src.a * keep);
}`
  },
  {
    id: 'glsl100-2',
    title: 'Aurora Radial Survey',
    code: `precision highp float;

varying vec2 v_uv;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0)), u.x), u.y);
}

vec3 heatSpectrum(float x) {
  x = fract(x);
  vec3 c1 = vec3(0.04, 0.08, 0.32);
  vec3 c2 = vec3(0.05, 0.85, 0.92);
  vec3 c3 = vec3(0.92, 0.15, 0.82);
  vec3 c4 = vec3(1.00, 0.84, 0.18);
  vec3 a = mix(c1, c2, smoothstep(0.0, 0.34, x));
  vec3 b = mix(c3, c4, smoothstep(0.66, 1.0, x));
  return mix(a, b, smoothstep(0.32, 0.70, x));
}

void main() {
  vec4 src = texture2D(u_source, v_uv);
  float centerLum = luminance(src.rgb);
  float keep = step(0.004, src.a) * step(0.008, centerLum);
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));

  float tl = luminance(texture2D(u_source, clamp(v_uv + px * vec2(-1.0, 1.0), 0.0, 1.0)).rgb);
  float tc = luminance(texture2D(u_source, clamp(v_uv + px * vec2(0.0, 1.0), 0.0, 1.0)).rgb);
  float tr = luminance(texture2D(u_source, clamp(v_uv + px, 0.0, 1.0)).rgb);
  float ml = luminance(texture2D(u_source, clamp(v_uv + px * vec2(-1.0, 0.0), 0.0, 1.0)).rgb);
  float mr = luminance(texture2D(u_source, clamp(v_uv + px * vec2(1.0, 0.0), 0.0, 1.0)).rgb);
  float bl = luminance(texture2D(u_source, clamp(v_uv - px, 0.0, 1.0)).rgb);
  float bc = luminance(texture2D(u_source, clamp(v_uv + px * vec2(0.0, -1.0), 0.0, 1.0)).rgb);
  float br = luminance(texture2D(u_source, clamp(v_uv + px * vec2(1.0, -1.0), 0.0, 1.0)).rgb);
  vec2 sobel = vec2(tr + 2.0 * mr + br - tl - 2.0 * ml - bl,
                    tl + 2.0 * tc + tr - bl - 2.0 * bc - br);
  float slope = length(sobel);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float tm = u_time * u_speed;
  float sc = max(u_scale, 0.001);
  float n1 = smoothNoise(p * (7.0 * sc) + vec2(tm * 0.09, -tm * 0.06));
  float n2 = smoothNoise(p.yx * (15.0 * sc) + vec2(-tm * 0.04, 8.0));
  vec2 bent = p + vec2(n1 - 0.5, n2 - 0.5) * 0.075;
  float radius = length(bent);
  float angle = atan(bent.y, bent.x);

  float elevation = centerLum * 12.0 + slope * 9.0 + n2 * 0.9;
  float bandCell = abs(fract(elevation) - 0.5);
  float bands = 1.0 - smoothstep(0.38, 0.49, bandCell);
  float sweepPhase = angle + radius * 5.0 - tm * 0.9 + n1 * 1.4;
  float sweep = pow(0.5 + 0.5 * cos(sweepPhase), 12.0);
  float halo = exp(-10.0 * abs(radius - (0.18 + 0.22 * (0.5 + 0.5 * sin(tm * 0.37)))));

  vec3 color = heatSpectrum(elevation * 0.065 + angle / 6.2831853 + tm * 0.025);
  color *= 0.18 + centerLum * 0.82;
  color += heatSpectrum(elevation * 0.08 + 0.35) * bands * (0.30 + slope * 1.8);
  color += heatSpectrum(angle / 6.2831853 - tm * 0.08) * (sweep + halo * 0.6) * (0.55 + u_intensity);
  color = mix(src.rgb, color, clamp(0.55 + 0.35 * u_intensity, 0.0, 1.0));

  gl_FragColor = vec4(color * keep, src.a * keep);
}`
  },
  {
    id: 'glsl100-3',
    title: 'Cellular Spectral Isobars',
    code: `precision highp float;

varying vec2 v_uv;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec2 cellular(vec2 p, float tm) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float nearest = 8.0;
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      o = 0.5 + 0.38 * sin(tm * 0.22 + 6.2831853 * o);
      float d = length(g + o - f);
      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) {
        second = d;
      }
    }
  }
  return vec2(nearest, second - nearest);
}

vec3 spectrum(float t) {
  vec3 k = vec3(1.0, 0.72, 0.48);
  return 0.5 + 0.5 * cos(6.2831853 * (t * k + vec3(0.02, 0.35, 0.68)));
}

void main() {
  vec4 src = texture2D(u_source, v_uv);
  float lum = luminance(src.rgb);
  float keep = step(0.004, src.a) * step(0.008, lum);
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float e = luminance(texture2D(u_source, clamp(v_uv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float w = luminance(texture2D(u_source, clamp(v_uv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float n = luminance(texture2D(u_source, clamp(v_uv + vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  float s = luminance(texture2D(u_source, clamp(v_uv - vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  vec2 grad = vec2(e - w, n - s);
  float slope = length(grad);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float tm = u_time * u_speed;
  float sc = max(u_scale, 0.001);
  vec2 cellsA = cellular(p * (6.0 * sc) + vec2(tm * 0.07, 0.0), tm);
  vec2 cellsB = cellular((p + grad * 0.35) * (12.0 * sc) - vec2(0.0, tm * 0.05), -tm);
  float organic = cellsA.x * 0.65 + cellsB.x * 0.35;
  float ridges = 1.0 - smoothstep(0.025, 0.11, min(cellsA.y, cellsB.y));

  float elevation = lum * 10.5 + slope * 18.0 + organic * 2.2;
  float iso = abs(fract(elevation) - 0.5);
  float contours = 1.0 - smoothstep(0.39, 0.49, iso);
  vec2 direction = normalize(vec2(0.75 + 0.2 * sin(tm * 0.13), -0.62));
  float front = dot(p, direction) + 0.13 * sin(p.y * 18.0 * sc + tm * 0.31 + organic * 5.0);
  float travel = 0.5 + 0.5 * sin(front * 12.0 - tm * 1.45);
  float pulse = pow(travel, 10.0);

  float chroma = elevation * 0.07 + organic * 0.18 - tm * 0.03;
  vec3 color = spectrum(chroma) * (0.16 + 0.84 * lum);
  color += spectrum(chroma + 0.16) * contours * (0.36 + slope * 2.5);
  color += spectrum(chroma - 0.21) * (pulse * (0.7 + u_intensity) + ridges * 0.22);
  color = mix(src.rgb, color, clamp(0.56 + 0.34 * u_intensity, 0.0, 1.0));

  gl_FragColor = vec4(color * keep, src.a * keep);
}`
  },
  {
    id: 'glsl100-4',
    title: 'Ridged Chromatic Watershed',
    code: `precision highp float;

varying vec2 v_uv;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(41.37, 289.11))) * 45758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float ridged(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  mat2 m = mat2(0.60, 0.80, -0.80, 0.60);
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(2.0 * noise2(p) - 1.0);
    sum += n * n * amp;
    p = m * p * 1.96 + vec2(3.4, 1.7);
    amp *= 0.48;
  }
  return sum;
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec4 src = texture2D(u_source, v_uv);
  float lum = luminance(src.rgb);
  float keep = step(0.004, src.a) * step(0.008, lum);
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float gx = luminance(texture2D(u_source, clamp(v_uv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb)
           - luminance(texture2D(u_source, clamp(v_uv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float gy = luminance(texture2D(u_source, clamp(v_uv + vec2(0.0, texel.y), 0.0, 1.0)).rgb)
           - luminance(texture2D(u_source, clamp(v_uv - vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  vec2 grad = vec2(gx, gy);
  float slope = length(grad);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float tm = u_time * u_speed;
  float sc = max(u_scale, 0.001);
  vec2 flow = vec2(-grad.y, grad.x);
  vec2 terrainP = p * (4.2 * sc) + flow * 1.8;
  terrainP += 0.16 * vec2(sin(p.y * 13.0 - tm * 0.21), cos(p.x * 11.0 + tm * 0.17));
  float ridgeField = ridged(terrainP + vec2(tm * 0.025, -tm * 0.018));

  float height = lum * 13.0 + slope * 21.0 + ridgeField * 1.65;
  float saw = fract(height);
  float lines = 1.0 - smoothstep(0.0, 0.04, min(saw, 1.0 - saw));
  float streamCoord = dot(p, normalize(vec2(-0.44, 0.90))) + ridgeField * 0.11;
  float packet = fract(streamCoord * 0.65 - tm * 0.14);
  float energy = exp(-42.0 * abs(packet - 0.5));
  energy *= 0.65 + 0.35 * sin(height * 2.2 - tm * 0.8);

  float hue = fract(0.72 - height * 0.045 + tm * 0.018 + energy * 0.25);
  vec3 spectral = hsv2rgb(vec3(hue, 0.82, 1.0));
  vec3 lineColor = hsv2rgb(vec3(fract(hue + 0.31), 0.92, 1.0));
  vec3 color = spectral * (0.14 + lum * 0.86);
  color += lineColor * lines * (0.38 + slope * 4.0);
  color += hsv2rgb(vec3(fract(hue - 0.18), 0.75, 1.0)) * energy * (0.9 + u_intensity);
  color = mix(src.rgb, color, clamp(0.57 + 0.33 * u_intensity, 0.0, 1.0));

  gl_FragColor = vec4(color * keep, src.a * keep);
}`
  },
  {
    id: 'glsl100-5',
    title: 'Luminous Interference Atlas',
    code: `precision highp float;

varying vec2 v_uv;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_scale;

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float trigField(vec2 p, float tm) {
  float a = sin(p.x * 1.7 + sin(p.y * 1.3 - tm * 0.19));
  float b = cos(p.y * 2.1 - cos(p.x * 1.1 + tm * 0.16));
  float c = sin((p.x + p.y) * 1.35 + tm * 0.11);
  return (a + b + c) / 3.0;
}

vec3 turboLike(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 c0 = vec3(0.10, 0.03, 0.38);
  vec3 c1 = vec3(0.00, 0.66, 0.95);
  vec3 c2 = vec3(0.18, 0.96, 0.35);
  vec3 c3 = vec3(1.00, 0.76, 0.08);
  vec3 c4 = vec3(0.92, 0.05, 0.18);
  if (x < 0.25) return mix(c0, c1, x * 4.0);
  if (x < 0.50) return mix(c1, c2, (x - 0.25) * 4.0);
  if (x < 0.75) return mix(c2, c3, (x - 0.50) * 4.0);
  return mix(c3, c4, (x - 0.75) * 4.0);
}

void main() {
  vec4 src = texture2D(u_source, v_uv);
  float lum = luminance(src.rgb);
  float keep = step(0.004, src.a) * step(0.008, lum);
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float xp = luminance(texture2D(u_source, clamp(v_uv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float xm = luminance(texture2D(u_source, clamp(v_uv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
  float yp = luminance(texture2D(u_source, clamp(v_uv + vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  float ym = luminance(texture2D(u_source, clamp(v_uv - vec2(0.0, texel.y), 0.0, 1.0)).rgb);
  vec2 grad = vec2(xp - xm, yp - ym);
  float slope = length(grad);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float tm = u_time * u_speed;
  float sc = max(u_scale, 0.001);
  vec2 q = p * (5.0 * sc);
  float coarse = trigField(q, tm);
  float fine = trigField(q * 2.73 + vec2(coarse, -coarse) * 1.4, -tm * 0.7);
  vec2 warped = p + vec2(coarse, fine) * 0.045 + grad * 0.22;

  float elevation = lum * 11.0 + slope * 26.0 + coarse * 0.9 + fine * 0.45;
  float isoPhase = fract(elevation);
  float contours = 1.0 - smoothstep(0.035, 0.16, min(isoPhase, 1.0 - isoPhase));
  float curve = warped.y - 0.18 * sin(warped.x * 9.0 * sc + fine * 2.5 - tm * 0.34);
  float movingCenter = mix(-0.65, 0.65, 0.5 + 0.5 * sin(tm * 0.42));
  float ribbon = exp(-30.0 * abs(curve - movingCenter));
  float sparks = pow(0.5 + 0.5 * sin((warped.x - warped.y) * 31.0 + tm * 2.0 + fine * 4.0), 16.0);
  ribbon *= 0.75 + 0.45 * sparks;

  float palettePos = fract(elevation * 0.058 + coarse * 0.12 - tm * 0.024);
  vec3 color = turboLike(palettePos) * (0.15 + 0.85 * lum);
  color += turboLike(fract(palettePos + 0.24)) * contours * (0.32 + slope * 3.2);
  color += turboLike(fract(palettePos + 0.53)) * ribbon * (0.8 + 0.9 * u_intensity);
  color = mix(src.rgb, color, clamp(0.58 + 0.32 * u_intensity, 0.0, 1.0));

  gl_FragColor = vec4(color * keep, src.a * keep);
}`
  }
];
