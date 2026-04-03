export const pixelShrineShader = {
  id: 'default_pixel_shrine',
  name: 'Pixel Shrine',
  description: 'Pixelates the image into shrine-like tiles while keeping contour contrast intact.',
  group: 'Graphic',
  code: `// NAME: Pixel Shrine
uniform float cell; // @min 10.0 @max 240.0 @default 72.0
uniform float split; // @min 0.0 @max 0.08 @default 0.015
uniform float monochromeMix; // @min 0.0 @max 1.0 @default 0.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float wobble = node_noise(uv * 3.0 + time * 0.15);
    float animatedCell = cell * (0.96 + 0.04 * sin(time * 0.8 + uv.y * 5.0));
    vec2 gridOffset = (vec2(
        node_noise(uv * 2.5 + vec2(time * 0.10, -time * 0.08)),
        node_noise(uv * 2.5 + vec2(-time * 0.12, time * 0.09) + 1.6)
    ) - 0.5) / max(animatedCell, 1.0);
    vec2 quantized = (floor((uv + gridOffset) * animatedCell) + 0.5) / animatedCell;
    vec2 offset = vec2(split / max(animatedCell, 1.0), 0.0) * (0.8 + wobble * 0.6);
    vec4 center = texture2D(tex, quantized);
    vec4 red = texture2D(tex, clamp(quantized + offset, 0.0, 1.0));
    vec4 blue = texture2D(tex, clamp(quantized - offset, 0.0, 1.0));

    vec3 splitColor = vec3(red.r, center.g, blue.b);
    vec3 mono = vec3(dot(center.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 psychedelicTint = vec3(
        0.5 + 0.5 * sin(time * 0.9 + wobble * 6.28318),
        0.5 + 0.5 * sin(time * 1.1 + wobble * 6.28318 + 2.1),
        0.5 + 0.5 * sin(time * 1.3 + wobble * 6.28318 + 4.2)
    );
    vec3 colorized = mix(splitColor, splitColor * psychedelicTint, 0.22);
    vec3 result = mix(colorized, mono, step(0.5, monochromeMix));
    return vec4(result, center.a);
}`,
};
