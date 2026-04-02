export const pixelShrineShader = {
  id: 'default_pixel_shrine',
  name: 'Pixel Shrine',
  description: 'Pixelates the image into shrine-like tiles while keeping contour contrast intact.',
  group: 'Graphic',
  code: `// NAME: Pixel Shrine
uniform float cell; // @min 10.0 @max 240.0 @default 72.0
uniform float split; // @min 0.0 @max 0.08 @default 0.015
uniform bool monochrome; // @default false

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 quantized = (floor(uv * cell) + 0.5) / cell;
    vec2 offset = vec2(split / max(cell, 1.0), 0.0);
    vec4 center = texture2D(tex, quantized);
    vec4 red = texture2D(tex, clamp(quantized + offset, 0.0, 1.0));
    vec4 blue = texture2D(tex, clamp(quantized - offset, 0.0, 1.0));

    vec3 result = monochrome ? vec3(dot(center.rgb, vec3(0.299, 0.587, 0.114))) : vec3(red.r, center.g, blue.b);
    return vec4(result, center.a);
}`,
};
