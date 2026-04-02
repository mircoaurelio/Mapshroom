export const vortexInkShader = {
  id: 'default_vortex_ink',
  name: 'Vortex Ink',
  description: 'Twists the drawing around the center for a ceremonial vortex without losing line readability.',
  group: 'Geometry',
  code: `// NAME: Vortex Ink
uniform float twist; // @min 0.0 @max 4.0 @default 1.2
uniform float speed; // @min 0.0 @max 3.0 @default 0.8
uniform float zoom; // @min 0.6 @max 2.0 @default 1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 p = (uv - 0.5) / zoom;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    angle += twist * (1.0 - clamp(radius, 0.0, 1.0)) * sin(time * speed);

    vec2 sampleUv = vec2(cos(angle), sin(angle)) * radius + 0.5;
    sampleUv = clamp(sampleUv, 0.0, 1.0);
    return texture2D(tex, sampleUv);
}`,
};
