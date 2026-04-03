export const crosshatchShadeShader = {
  id: 'default_crosshatch_shade',
  name: 'Crosshatch Shade',
  description: 'Adds procedural hatch layers so the line work feels etched and shaded rather than flat.',
  group: 'Graphic',
  code: `// NAME: Crosshatch Shade
uniform float density; // @min 100.0 @max 900.0 @default 420.0
uniform float strength; // @min 0.0 @max 1.0 @default 0.78
uniform vec3 inkColor; // @default 0.08,0.08,0.10

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float shadow = 1.0 - lum;
    vec2 flow = (vec2(
        node_noise(uv * 2.0 + vec2(time * 0.08, -time * 0.05)),
        node_noise(uv * 2.0 + vec2(-time * 0.06, time * 0.09) + 4.1)
    ) - 0.5) * 0.018;
    vec2 hatchUv = uv + flow;

    float hatchA = step(0.5, fract((hatchUv.x + hatchUv.y * 1.1) * density));
    float hatchB = step(0.5, fract((hatchUv.x - hatchUv.y * 1.3) * density * 0.78));
    float hatchC = step(0.5, fract((hatchUv.x + hatchUv.y * 0.45) * density * 1.35));

    float pattern = 0.0;
    pattern = max(pattern, hatchA * smoothstep(0.12, 0.38, shadow));
    pattern = max(pattern, hatchB * smoothstep(0.28, 0.62, shadow));
    pattern = max(pattern, hatchC * smoothstep(0.5, 0.92, shadow));
    pattern = max(pattern, shadow * 0.65);

    float phase = node_noise(hatchUv * 3.0 + time * 0.12);
    vec3 animatedInk = clamp(
        inkColor + vec3(
            sin(time * 0.7 + phase * 6.28318),
            sin(time * 0.9 + phase * 6.28318 + 1.9),
            sin(time * 1.1 + phase * 6.28318 + 3.8)
        ) * 0.05,
        0.0,
        1.0
    );
    vec3 result = mix(vec3(1.0), animatedInk, pattern * strength);
    return vec4(result, source.a);
}`,
};
