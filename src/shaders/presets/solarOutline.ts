export const solarOutlineShader = {
  id: 'default_solar_outline',
  name: 'Solar Outline',
  description: 'Detects contour edges and wraps them with warm solar highlights.',
  group: 'Graphic',
  code: `// NAME: Solar Outline
uniform float edgeWidth; // @min 0.5 @max 4.0 @default 1.2
uniform vec3 outline; // @default 1.0,0.58,0.15
uniform float fill; // @min 0.0 @max 1.0 @default 0.22

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 drift = (vec2(
        node_noise(uv * 3.2 + vec2(time * 0.10, -time * 0.08)),
        node_noise(uv * 3.2 + vec2(-time * 0.07, time * 0.11) + 2.5)
    ) - 0.5) * 0.35;
    vec2 px = (edgeWidth + drift) / max(resolution, vec2(1.0));
    float left = dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float right = dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float up = dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114));
    float down = dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114));
    float base = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));

    float edge = clamp(length(vec2(right - left, down - up)) * 4.5, 0.0, 1.0);
    float ink = 1.0 - smoothstep(0.72, 0.95, base);
    float flare = 0.82 + 0.18 * sin(time * 1.0 + uv.x * 10.0);
    vec3 animatedOutline = clamp(
        outline + vec3(
            sin(time * 0.9),
            sin(time * 1.1 + 2.0),
            sin(time * 1.3 + 4.0)
        ) * 0.06,
        0.0,
        1.0
    );
    vec3 result = mix(vec3(base), animatedOutline * flare, clamp(edge + ink * fill, 0.0, 1.0));
    return vec4(result, 1.0);
}`,
};
