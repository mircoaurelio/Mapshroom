export const invertedNeonShader = {
  id: 'default_inverted_neon',
  name: 'Inverted Neon',
  description: 'Flips the page toward darkness and turns the black contours into bright electric traces.',
  group: 'Glow',
  code: `// NAME: Inverted Neon
uniform vec3 neon; // @default 0.20,0.84,1.0
uniform float boost; // @min 0.0 @max 2.5 @default 1.25
uniform float threshold; // @min 0.55 @max 0.98 @default 0.82

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float ink = 1.0 - smoothstep(threshold - 0.18, threshold, lum);

    vec3 night = vec3(0.02, 0.03, 0.05);
    vec3 electric = neon * (0.45 + ink * boost);
    float shimmer = 0.88 + 0.12 * sin(time * 1.6 + uv.y * 18.0);
    vec3 result = mix(night, electric * shimmer, ink);
    return vec4(clamp(result, 0.0, 1.0), source.a);
}`,
};
