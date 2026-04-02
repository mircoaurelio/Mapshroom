export const posterThresholdShader = {
  id: 'default_poster_threshold',
  name: 'Poster Threshold',
  description: 'Quantizes the drawing into bold tonal bands that stay readable on black-line illustrations.',
  group: 'Color',
  code: `// NAME: Poster Threshold
uniform float levels; // @min 2.0 @max 8.0 @default 4.0
uniform float threshold; // @min 0.45 @max 0.95 @default 0.8
uniform vec3 lineColor; // @default 0.10,0.12,0.16

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float poster = floor(lum * levels) / max(levels - 1.0, 1.0);
    float ink = 1.0 - smoothstep(threshold - 0.16, threshold, lum);

    vec3 plate = vec3(poster);
    vec3 result = mix(plate, lineColor, ink);
    return vec4(result, source.a);
}`,
};
