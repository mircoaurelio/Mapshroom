export const scanlineApparitionShader = {
  id: 'default_scanline_apparition',
  name: 'Scanline Apparition',
  description: 'Adds drifting CRT-style scanlines that suit monochrome illustration surprisingly well.',
  group: 'Motion',
  code: `// NAME: Scanline Apparition
uniform float density; // @min 40.0 @max 600.0 @default 220.0
uniform float drift; // @min 0.0 @max 0.08 @default 0.012
uniform float speed; // @min 0.0 @max 4.0 @default 1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 warped = uv + vec2(sin(uv.y * density * 0.05 + time * speed) * drift, 0.0);
    vec4 source = texture2D(tex, clamp(warped, 0.0, 1.0));
    float lines = 0.82 + 0.18 * sin(uv.y * density - time * speed * 6.0);
    return vec4(source.rgb * lines, source.a);
}`,
};
