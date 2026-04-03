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
    float noisePulse = node_noise(uv * 3.0 + vec2(time * 0.12, -time * 0.09));
    float animatedLevels = max(2.0, levels + sin(time * 0.8 + noisePulse * 6.28318) * 0.35);
    float poster = floor(lum * animatedLevels) / max(animatedLevels - 1.0, 1.0);
    float ink = 1.0 - smoothstep(threshold - 0.16, threshold, lum + (noisePulse - 0.5) * 0.04);

    vec3 plate = vec3(poster) * (0.92 + 0.08 * sin(time * 0.9 + uv.y * 8.0));
    vec3 animatedLine = clamp(
        lineColor + vec3(
            sin(time * 0.8 + uv.x * 5.0),
            sin(time * 1.0 + uv.y * 6.0 + 2.0),
            sin(time * 1.2 + uv.x * 4.0 + 4.0)
        ) * 0.05,
        0.0,
        1.0
    );
    vec3 result = mix(plate, animatedLine, ink);
    return vec4(result, source.a);
}`,
};
