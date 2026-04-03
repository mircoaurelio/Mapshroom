export const inkBloomShader = {
  id: 'default_ink_bloom',
  name: 'Ink Bloom',
  description: 'Creates a colorful bloom from the darkest strokes while preserving fine line detail.',
  group: 'Glow',
  code: `// NAME: Ink Bloom
uniform float bloom; // @min 0.0 @max 3.0 @default 1.1
uniform vec3 bloomColor; // @default 1.0,0.35,0.74
uniform float threshold; // @min 0.55 @max 0.98 @default 0.82

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 px = 2.0 / max(resolution, vec2(1.0));
    vec4 source = texture2D(tex, uv);
    float center = 1.0 - smoothstep(threshold - 0.16, threshold, dot(source.rgb, vec3(0.299, 0.587, 0.114)));

    float blur = 0.0;
    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    blur *= 0.25;

    float pulse = 0.82 + 0.18 * sin(time * 0.9 + uv.y * 10.0);
    float swirl = node_noise(uv * 3.0 + vec2(time * 0.12, -time * 0.08));
    float glow = max(0.0, blur - center * 0.5) * bloom * pulse;
    vec3 animatedBloom = clamp(
        bloomColor + vec3(
            sin(time * 0.7 + swirl * 6.28318),
            sin(time * 0.9 + swirl * 6.28318 + 2.1),
            sin(time * 1.1 + swirl * 6.28318 + 4.2)
        ) * 0.08,
        0.0,
        1.0
    );
    vec3 result = clamp(source.rgb + animatedBloom * glow + animatedBloom * center * 0.15, 0.0, 1.0);
    return vec4(result, source.a);
}`,
};
