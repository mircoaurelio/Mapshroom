export const ritualKaleidoscopeShader = {
  id: 'default_ritual_kaleidoscope',
  name: 'Ritual Kaleidoscope',
  description: 'Mirrors the drawing into a radial mandala, ideal for symmetrical spiritual artwork.',
  group: 'Geometry',
  code: `// NAME: Ritual Kaleidoscope
uniform float segments; // @min 3.0 @max 12.0 @default 6.0
uniform float zoom; // @min 0.6 @max 2.0 @default 1.0
uniform float spin; // @min -2.0 @max 2.0 @default 0.15

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 p = (uv - 0.5) / zoom;
    float angle = atan(p.y, p.x) + time * spin * 0.35;
    float radius = length(p);
    float slice = 6.28318 / max(segments, 1.0);
    angle = abs(mod(angle, slice) - 0.5 * slice);

    vec2 sampleUv = vec2(cos(angle), sin(angle)) * radius + 0.5;
    sampleUv = clamp(sampleUv, 0.0, 1.0);
    return texture2D(tex, sampleUv);
}`,
};
