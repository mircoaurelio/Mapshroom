export const radialCrownShader = {
  id: 'default_radial_crown',
  name: 'Radial Crown',
  description: 'Places animated circular light crowns around dark strokes and central motifs.',
  group: 'Glow',
  code: `// NAME: Radial Crown
uniform float rings; // @min 1.0 @max 20.0 @default 6.0
uniform float strength; // @min 0.0 @max 1.2 @default 0.35
uniform vec3 crown; // @default 0.98,0.78,0.24

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float ink = 1.0 - smoothstep(0.72, 0.95, lum);
    float radius = length(uv - 0.5);
    float pulse = 0.5 + 0.5 * cos(radius * rings * 18.0 - time * 2.0);
    vec3 aura = crown * pulse * ink * strength;
    vec3 result = clamp(source.rgb + aura, 0.0, 1.0);
    return vec4(result, source.a);
}`,
};
