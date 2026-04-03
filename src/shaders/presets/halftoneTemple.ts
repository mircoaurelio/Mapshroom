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
    float phase = time * 0.7;
    float animatedScale = scale * (0.94 + 0.06 * sin(phase + uv.y * 4.0));
    vec2 wave = (vec2(
        node_noise(uv * 2.2 + vec2(phase * 0.18, -phase * 0.14)),
        node_noise(uv * 2.2 + vec2(-phase * 0.16, phase * 0.12) + 5.0)
    ) - 0.5) * 0.035;
    vec2 grid = (uv + wave) * animatedScale;
    vec2 cell = fract(grid) - 0.5;
    float angle = 0.35 + sin(phase * 0.8) * 0.12;
    vec2 rotatedCell = vec2(
        cell.x * cos(angle) - cell.y * sin(angle),
        cell.x * sin(angle) + cell.y * cos(angle)
    );

    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float radius = mix(0.46, 0.06, lum) * (0.94 + 0.06 * sin(phase + wave.x * 40.0));
    float dotMask = 1.0 - smoothstep(radius, radius + softness, length(rotatedCell));
    vec3 animatedDotColor = clamp(
        dotColor + vec3(
            sin(phase + uv.x * 6.0),
            sin(phase * 1.1 + uv.y * 5.0 + 2.1),
            sin(phase * 1.2 + uv.x * 4.0 + 4.2)
        ) * 0.05,
        0.0,
        1.0
    );
    vec3 result = mix(vec3(1.0), animatedDotColor, dotMask);
    return vec4(mix(source.rgb, result, 0.9), source.a);
}`,
};
