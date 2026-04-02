export const psychedelicBlobShader = {
  id: 'default_psych',
  name: 'Ink Aura Bloom',
  description: 'Builds a soft colored halo around dark contours while keeping the white paper readable.',
  group: 'Glow',
  code: `// NAME: Ink Aura Bloom
uniform float glow; // @min 0.0 @max 2.0 @default 0.85
uniform float threshold; // @min 0.55 @max 0.98 @default 0.82
uniform vec3 glowColor; // @default 0.10,0.88,0.76

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 px = 2.0 / max(resolution, vec2(1.0));
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float ink = 1.0 - smoothstep(threshold - 0.18, threshold, lum);

    float aura = 0.0;
    aura += 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    aura += 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    aura += 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    aura += 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    aura *= 0.25;
    aura = max(0.0, aura - ink) * glow;

    float pulse = 0.72 + 0.28 * sin(time * 0.9 + uv.y * 8.0);
    vec3 halo = glowColor * aura * pulse;
    vec3 lineLift = mix(source.rgb, glowColor, ink * 0.18);
    vec3 result = clamp(lineLift + halo, 0.0, 1.0);
    return vec4(result, source.a);
}`,
};
