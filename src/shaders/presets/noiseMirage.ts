export const noiseMirageShader = {
  id: 'default_noise_mirage',
  name: 'Noise Mirage',
  description: 'Uses soft procedural displacement to make still line art feel alive and atmospheric.',
  group: 'Motion',
  code: `// NAME: Noise Mirage
uniform float amount; // @min 0.0 @max 0.06 @default 0.02
uniform float speed; // @min 0.0 @max 3.0 @default 0.7
uniform float scale; // @min 1.0 @max 18.0 @default 9.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float nx = node_noise(uv * scale + vec2(time * speed * 0.25, 0.0));
    float ny = node_noise(uv * scale * 1.3 + vec2(3.7, -time * speed * 0.22));
    vec2 offset = (vec2(nx, ny) - 0.5) * amount;
    vec2 sampleUv = clamp(uv + offset, 0.0, 1.0);
    return texture2D(tex, sampleUv);
}`,
};
