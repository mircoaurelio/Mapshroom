export const monochromeBleedShader = {
  id: 'default_monochrome_bleed',
  name: 'Monochrome Bleed',
  description: 'Expands dark lines into a soft analog bleed, useful for projection surfaces with texture.',
  group: 'Glow',
  code: `// NAME: Monochrome Bleed
uniform float bleed; // @min 0.5 @max 4.0 @default 1.5
uniform float softness; // @min 0.0 @max 1.0 @default 0.45
uniform vec3 inkColor; // @default 0.08,0.08,0.10

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 pulse = (vec2(
        node_noise(uv * 2.6 + vec2(time * 0.10, -time * 0.07)),
        node_noise(uv * 2.6 + vec2(-time * 0.08, time * 0.11) + 3.7)
    ) - 0.5) * 0.6;
    vec2 px = (bleed + pulse) / max(resolution, vec2(1.0));
    vec4 source = texture2D(tex, uv);
    float center = 1.0 - smoothstep(0.72, 0.94, dot(source.rgb, vec3(0.299, 0.587, 0.114)));

    float sampleX1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    float sampleX2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    float sampleY1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    float sampleY2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    float sampleD1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + px).rgb, vec3(0.299, 0.587, 0.114)));
    float sampleD2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - px).rgb, vec3(0.299, 0.587, 0.114)));
    float surround = (sampleX1 + sampleX2 + sampleY1 + sampleY2 + sampleD1 + sampleD2) * 0.1667;

    float shimmer = 0.8 + 0.2 * sin(time * 1.0 + uv.y * 12.0);
    float bleedMask = smoothstep(0.08, 0.9, surround) * softness * shimmer;
    vec3 animatedInk = clamp(
        inkColor + vec3(
            sin(time * 0.7 + uv.x * 6.0),
            sin(time * 0.9 + uv.y * 5.0 + 2.0),
            sin(time * 1.1 + uv.x * 4.0 + 4.0)
        ) * 0.04,
        0.0,
        1.0
    );
    vec3 result = mix(vec3(1.0), animatedInk, clamp(center + bleedMask * 0.7, 0.0, 1.0));
    return vec4(result, source.a);
}`,
};
