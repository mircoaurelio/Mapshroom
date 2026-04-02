export const marbleDriftShader = {
  id: 'default_marble_drift',
  name: 'Marble Drift',
  description: 'Warps the line work through slow marbled noise, useful for ceremonial or fluid visuals.',
  group: 'Motion',
  code: `// NAME: Marble Drift
uniform float distortion; // @min 0.0 @max 0.08 @default 0.028
uniform float scale; // @min 1.0 @max 18.0 @default 6.0
uniform vec3 tint; // @default 0.42,0.72,1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float nx = node_noise(uv * scale + vec2(time * 0.24, time * 0.12));
    float ny = node_noise(uv * scale + vec2(7.0 - time * 0.18, 3.0 + time * 0.15));
    vec2 sampleUv = clamp(uv + (vec2(nx, ny) - 0.5) * distortion, 0.0, 1.0);
    vec4 source = texture2D(tex, sampleUv);
    float ink = 1.0 - smoothstep(0.72, 0.95, dot(source.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 haze = tint * (0.18 + 0.82 * node_noise(sampleUv * scale * 1.35 + time * 0.1));
    vec3 result = mix(source.rgb, haze, ink * 0.72);
    return vec4(result, source.a);
}`,
};
