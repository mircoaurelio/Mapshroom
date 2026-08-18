const WGSL_SHARED = `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  speed: f32,
  intensity: f32,
  scale: f32,
  padding: vec2f,
}

@group(0) @binding(0) var source_sampler: sampler;
@group(0) @binding(1) var source_texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  let positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  let position = positions[vertex_index];
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = vec2f(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));
  return output;
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

fn sample_luma(uv: vec2f) -> f32 {
  return luminance(textureSample(source_texture, source_sampler, clamp(uv, vec2f(0.0), vec2f(1.0))).rgb);
}

fn hash21(point: vec2f) -> f32 {
  let h = dot(point, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn value_noise(point: vec2f) -> f32 {
  let cell = floor(point);
  var local = fract(point);
  local = local * local * (vec2f(3.0) - 2.0 * local);
  let bottom = mix(hash21(cell), hash21(cell + vec2f(1.0, 0.0)), local.x);
  let top = mix(hash21(cell + vec2f(0.0, 1.0)), hash21(cell + vec2f(1.0, 1.0)), local.x);
  return mix(bottom, top, local.y);
}

fn spectral(phase: f32) -> vec3f {
  return vec3f(0.54) + vec3f(0.46) * cos(6.2831853 * (phase + vec3f(0.00, 0.67, 0.34)));
}
`;

const makeShader = (fragment) => `${WGSL_SHARED}\n${fragment}`;

export const wgslShaders = [
  {
    id: 'wgsl-1',
    title: 'Compute-era Relief Scan',
    code: makeShader(`
@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let source = textureSample(source_texture, source_sampler, input.uv);
  let center = luminance(source.rgb);
  let alpha = source.a * smoothstep(0.008, 0.035, center);
  let pixel = 1.0 / max(uniforms.resolution, vec2f(1.0));
  let gradient = vec2f(
    sample_luma(input.uv + vec2f(pixel.x, 0.0)) - sample_luma(input.uv - vec2f(pixel.x, 0.0)),
    sample_luma(input.uv + vec2f(0.0, pixel.y)) - sample_luma(input.uv - vec2f(0.0, pixel.y))
  );
  let slope = length(gradient) * max(uniforms.resolution.x, uniforms.resolution.y) * 0.018;
  let aspect = uniforms.resolution.x / max(uniforms.resolution.y, 1.0);
  let point = (input.uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  let scale = max(abs(uniforms.scale), 0.05);
  let time = uniforms.time * uniforms.speed;
  let grain = value_noise(point * (22.0 * scale) + vec2f(time * 0.13, -time * 0.09));
  let height = center + 0.16 * slope + (grain - 0.5) * 0.075;
  let bands = 0.5 + 0.5 * cos(6.2831853 * (height * (11.0 * scale) - time * 0.28));
  let contour = 1.0 - smoothstep(0.06, 0.30, abs(bands - 0.5));
  var sweep = dot(point, normalize(vec2f(1.0, 0.42))) * 1.8 - time * 0.55;
  sweep += (grain - 0.5) * 0.34 + dot(gradient, vec2f(-1.0, 1.0)) * 2.0;
  let pulse = exp(-7.0 * pow(abs(fract(sweep) - 0.5), 2.0));
  let prism = spectral(height * 1.7 + sweep * 0.18 + time * 0.06);
  let base = source.rgb * (0.48 + 0.62 * center);
  var color = mix(base, prism * (0.45 + 0.85 * center), clamp(contour * 0.72, 0.0, 1.0));
  color += prism * pulse * (0.28 + 0.72 * contour) * uniforms.intensity;
  color += vec3f(0.35, 0.55, 0.85) * slope * 0.08 * uniforms.intensity;
  return vec4f(max(color, vec3f(0.0)), alpha);
}`),
  },
  {
    id: 'wgsl-2',
    title: 'Aurora Storage Current',
    code: makeShader(`
fn fbm(seed: vec2f) -> f32 {
  var point = seed;
  var amplitude = 0.5;
  var total = 0.0;
  for (var octave = 0; octave < 4; octave += 1) {
    total += value_noise(point) * amplitude;
    point = vec2f(0.80 * point.x - 0.60 * point.y, 0.60 * point.x + 0.80 * point.y) * 2.03 + vec2f(13.7);
    amplitude *= 0.5;
  }
  return total;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let source = textureSample(source_texture, source_sampler, input.uv);
  let center = luminance(source.rgb);
  let alpha = source.a * smoothstep(0.006, 0.03, center);
  let pixel = 1.0 / max(uniforms.resolution, vec2f(1.0));
  let gradient = vec2f(
    sample_luma(input.uv + vec2f(pixel.x, 0.0)) - sample_luma(input.uv - vec2f(pixel.x, 0.0)),
    sample_luma(input.uv + vec2f(0.0, pixel.y)) - sample_luma(input.uv - vec2f(0.0, pixel.y))
  );
  let ridge = length(gradient) * min(uniforms.resolution.x, uniforms.resolution.y) * 0.025;
  let aspect = uniforms.resolution.x / max(uniforms.resolution.y, 1.0);
  let point = (input.uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  let scale = max(abs(uniforms.scale), 0.08);
  let time = uniforms.time * uniforms.speed;
  let broad = fbm(point * (3.5 * scale) + vec2f(0.0, time * 0.12));
  let fine = fbm(point * (8.0 * scale) + vec2f(broad * 2.1, -time * 0.19));
  let topo = center * (14.0 * scale) + ridge * 1.8 + fine * 1.4;
  let contour = 1.0 - smoothstep(0.035, 0.13, abs(fract(topo) - 0.5));
  let current = point.y + 0.30 * sin(point.x * 4.2 + broad * 5.0) + (broad - 0.5) * 0.32;
  var crest = exp(-22.0 * pow(current - 0.62 * sin(time * 0.42), 2.0));
  crest *= 0.85 + 0.15 * sin(current * 18.0 - time * 3.0 + fine * 6.0);
  let aurora = spectral(center + broad * 0.35 + time * 0.035);
  var color = mix(source.rgb * (0.42 + center * 0.72), aurora * (0.35 + center), contour * 0.78);
  color += aurora * crest * (0.5 + contour * 0.7) * uniforms.intensity;
  color += vec3f(0.10, 0.50, 0.85) * ridge * 0.055 * uniforms.intensity;
  return vec4f(max(color, vec3f(0.0)), alpha);
}`),
  },
  {
    id: 'wgsl-3',
    title: 'Parallel Basin Pulse',
    code: makeShader(`
fn cellular(point: vec2f) -> f32 {
  let cell = floor(point);
  let local = fract(point);
  var nearest = 8.0;
  for (var y = -1; y <= 1; y += 1) {
    for (var x = -1; x <= 1; x += 1) {
      let offset = vec2f(f32(x), f32(y));
      let random = vec2f(hash21(cell + offset), hash21(cell + offset + vec2f(19.7, 7.1)));
      nearest = min(nearest, length(offset + random - local));
    }
  }
  return nearest;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let source = textureSample(source_texture, source_sampler, input.uv);
  let center = luminance(source.rgb);
  let alpha = source.a * smoothstep(0.007, 0.032, center);
  let pixel = 1.0 / max(uniforms.resolution, vec2f(1.0));
  let gradient = vec2f(
    sample_luma(input.uv + vec2f(pixel.x, 0.0)) - sample_luma(input.uv - vec2f(pixel.x, 0.0)),
    sample_luma(input.uv + vec2f(0.0, pixel.y)) - sample_luma(input.uv - vec2f(0.0, pixel.y))
  );
  let relief = length(gradient) * min(uniforms.resolution.x, uniforms.resolution.y) * 0.028;
  let aspect = uniforms.resolution.x / max(uniforms.resolution.y, 1.0);
  let point = (input.uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  let scale = max(abs(uniforms.scale), 0.06);
  let time = uniforms.time * uniforms.speed;
  let cells = cellular(point * (12.0 * scale) + vec2f(time * 0.11, -time * 0.07));
  let levels = center * (10.0 + 7.0 * scale) + relief * 3.1 + (cells - 0.36) * 0.16;
  let contour = 1.0 - smoothstep(0.055, 0.18, abs(fract(levels) - 0.5));
  let origin = vec2f(-0.34 * aspect, -0.28);
  let basin = length(point - origin + gradient * 0.8);
  let ring = basin * 2.35 - time * 0.48 + cells * 0.11;
  let pulse = exp(-30.0 * pow(abs(fract(ring) - 0.5), 2.0));
  let filament = 0.5 + 0.5 * cos(28.0 * cells + time * 1.4);
  let chroma = spectral(center * 0.62 + basin * 0.22 - time * 0.045);
  var color = mix(source.rgb * (0.36 + center * 0.78), chroma * (0.38 + center * 0.92), contour * 0.74);
  color += chroma * pulse * (0.42 + 0.58 * filament) * (0.6 + contour) * uniforms.intensity;
  color += vec3f(0.8, 0.35, 1.0) * relief * 0.65 * uniforms.intensity;
  return vec4f(max(color, vec3f(0.0)), alpha);
}`),
  },
  {
    id: 'wgsl-4',
    title: 'Iridescent Pipeline Faults',
    code: makeShader(`
@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let source = textureSample(source_texture, source_sampler, input.uv);
  let center = luminance(source.rgb);
  let alpha = source.a * smoothstep(0.009, 0.038, center);
  let pixel = 1.0 / max(uniforms.resolution, vec2f(1.0));
  let gradient = vec2f(
    sample_luma(input.uv + vec2f(pixel.x, 0.0)) - sample_luma(input.uv - vec2f(pixel.x, 0.0)),
    sample_luma(input.uv + vec2f(0.0, pixel.y)) - sample_luma(input.uv - vec2f(0.0, pixel.y))
  );
  let edge = length(gradient) * sqrt(max(uniforms.resolution.x * uniforms.resolution.y, 1.0)) * 0.018;
  let aspect = uniforms.resolution.x / max(uniforms.resolution.y, 1.0);
  let point = (input.uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  let scale = max(abs(uniforms.scale), 0.05);
  let time = uniforms.time * uniforms.speed;
  let fault = vec2f(sin(point.y * 9.0 * scale + time * 0.33), cos(point.x * 7.0 * scale - time * 0.29));
  let grit = value_noise(point * (30.0 * scale) + fault * 0.85);
  let direction = dot(normalize(gradient + vec2f(0.0001)), normalize(vec2f(0.72, -0.69)));
  let topo = center * (13.0 * scale) + edge * 1.4 + direction * 0.22 + (grit - 0.5) * 0.18;
  let contour = 1.0 - smoothstep(0.045 + max(fwidth(topo), 0.003), 0.14 + max(fwidth(topo), 0.003), abs(fract(topo) - 0.5));
  var slash = dot(point + fault * 0.025, normalize(vec2f(-0.38, 0.925)));
  slash += 0.055 * sin(point.x * 23.0 + grit * 5.0);
  let wave = 0.5 + 0.5 * cos((slash - time * 0.31) * 6.2831853);
  let energy = pow(wave, 9.0) + pow(wave, 2.5) * 0.22;
  let spectrum = spectral(topo * 0.075 + slash * 0.24 + time * 0.04 + 0.18);
  var color = mix(source.rgb * (0.44 + 0.64 * center), spectrum * (0.42 + 0.82 * center), contour * 0.80);
  color += spectrum * energy * (0.55 + contour * 0.65) * uniforms.intensity;
  color += vec3f(0.20, 0.62, 1.0) * edge * 0.07 * uniforms.intensity;
  return vec4f(max(color, vec3f(0.0)), alpha);
}`),
  },
  {
    id: 'wgsl-5',
    title: 'Spectral Bind-group Gyre',
    code: makeShader(`
@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let source = textureSample(source_texture, source_sampler, input.uv);
  let center = luminance(source.rgb);
  let alpha = source.a * smoothstep(0.006, 0.034, center);
  let pixel = 1.0 / max(uniforms.resolution, vec2f(1.0));
  let gradient = vec2f(
    sample_luma(input.uv + vec2f(pixel.x, 0.0)) - sample_luma(input.uv - vec2f(pixel.x, 0.0)),
    sample_luma(input.uv + vec2f(0.0, pixel.y)) - sample_luma(input.uv - vec2f(0.0, pixel.y))
  );
  let slope = length(gradient) * min(uniforms.resolution.x, uniforms.resolution.y) * 0.028;
  let aspect = uniforms.resolution.x / max(uniforms.resolution.y, 1.0);
  let point = (input.uv - vec2f(0.5)) * vec2f(aspect, 1.0);
  let scale = max(abs(uniforms.scale), 0.06);
  let time = uniforms.time * uniforms.speed;
  let radius = length(point);
  let angle = atan2(point.y, point.x);
  let fine = value_noise(point * (27.0 * scale) + vec2f(cos(time * 0.11), sin(time * 0.09)));
  let elevation = center * (12.0 * scale) + slope * 2.25 + 0.24 * sin(atan2(gradient.y, gradient.x) * 3.0) + (fine - 0.5) * 0.28;
  let contour = 1.0 - smoothstep(0.10, 0.34, abs(sin(3.14159265 * elevation)));
  var spiral = radius * 2.8 + angle / 6.2831853;
  spiral += 0.10 * sin(angle * 5.0 - radius * 17.0 + fine * 3.0);
  let phase = fract(spiral - time * 0.24);
  let front = exp(-42.0 * pow(phase - 0.5, 2.0));
  let shimmer = 0.55 + 0.45 * sin(elevation * 5.0 - time * 1.5 + angle * 2.0);
  let chroma = spectral(center * 0.55 + angle / 6.2831853 + time * 0.035 + fine * 0.1);
  var color = mix(source.rgb * (0.40 + 0.72 * center), chroma * (0.38 + center), contour * 0.76);
  color += chroma * front * (0.48 + 0.52 * shimmer) * (0.65 + contour) * uniforms.intensity;
  color += spectral(atan2(gradient.y, gradient.x) / 6.2831853) * slope * 0.075 * uniforms.intensity;
  return vec4f(max(color, vec3f(0.0)), alpha);
}`),
  },
];
