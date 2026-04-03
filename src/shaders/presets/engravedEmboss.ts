export const engravedEmbossShader = {
  id: 'default_engraved_emboss',
  name: 'Engraved Emboss',
  description: 'Uses neighboring luminance differences to turn the line art into a beveled engraving.',
  group: 'Graphic',
  code: `// NAME: Engraved Emboss
uniform float radius; // @min 0.5 @max 4.0 @default 1.6
uniform float depth; // @min 0.2 @max 3.0 @default 1.15
uniform vec3 tint; // @default 0.78,0.82,0.88

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 jitter = (vec2(
        node_noise(uv * 3.0 + vec2(time * 0.1, -time * 0.08)),
        node_noise(uv * 3.0 + vec2(-time * 0.09, time * 0.07) + 2.8)
    ) - 0.5) * 0.4;
    vec2 px = (radius + jitter) / max(resolution, vec2(1.0));
    float topLeft = dot(texture2D(tex, uv - px).rgb, vec3(0.299, 0.587, 0.114));
    float bottomRight = dot(texture2D(tex, uv + px).rgb, vec3(0.299, 0.587, 0.114));
    float baseLum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));

    float relief = clamp(0.5 + (topLeft - bottomRight) * depth, 0.0, 1.0);
    float mask = 1.0 - smoothstep(0.7, 0.96, baseLum);
    float shimmer = 0.5 + 0.5 * sin(time * 0.9 + uv.y * 8.0);
    vec3 animatedTint = clamp(tint + vec3(0.08, -0.04, 0.1) * (shimmer - 0.5), 0.0, 1.0);
    vec3 engraved = mix(vec3(0.16), animatedTint, relief);
    vec3 paper = vec3(0.97);
    vec3 result = mix(paper, engraved, mask + 0.22);
    return vec4(clamp(result, 0.0, 1.0), 1.0);
}`,
};
