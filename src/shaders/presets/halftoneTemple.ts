export const halftoneTempleShader = {
  id: 'default_halftone_temple',
  name: 'Halftone Temple',
  description: 'Turns the illustration into offset print dots, which works especially well on white backgrounds.',
  group: 'Graphic',
  code: `// NAME: Halftone Temple
uniform float scale; // @min 30.0 @max 220.0 @default 92.0
uniform float softness; // @min 0.01 @max 0.35 @default 0.12
uniform vec3 dotColor; // @default 0.06,0.06,0.09

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 grid = uv * scale;
    vec2 cell = fract(grid) - 0.5;
    float angle = 0.35;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotatedCell = rot * cell;

    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float radius = mix(0.46, 0.06, lum);
    float dotMask = 1.0 - smoothstep(radius, radius + softness, length(rotatedCell));
    vec3 result = mix(vec3(1.0), dotColor, dotMask);
    return vec4(mix(source.rgb, result, 0.9), source.a);
}`,
};
