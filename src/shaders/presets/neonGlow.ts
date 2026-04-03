export const neonGlowShader = {
  id: 'default_neon',
  name: 'Neon Glow Lines',
  description: 'A bright neon outline that glows around dark edges.',
  group: 'Glow',
  code: `// NAME: Neon Glow Lines
uniform float glowSize; // @min 0.001 @max 0.02 @default 0.005
uniform float brightness; // @min 0.5 @max 3.0 @default 1.5
uniform vec3 tint; // @default 0.0,1.0,0.6

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float d1 = glowSize;
    float d2 = glowSize * 2.0;
    float d3 = glowSize * 3.0;
    float d4 = glowSize * 4.0;
    float glow =
        dot(texture2D(tex, uv + vec2(d1, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv - vec2(d1, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv + vec2(0.0, d2)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv - vec2(0.0, d2)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv + vec2(d3, d3)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv - vec2(d3, d3)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv + vec2(-d4, d4)).rgb, vec3(0.299, 0.587, 0.114)) +
        dot(texture2D(tex, uv + vec2(d4, -d4)).rgb, vec3(0.299, 0.587, 0.114));
    glow = 1.0 - glow / 8.0;
    float glowMask = smoothstep(0.1, 0.6, glow);

    float pulse = 0.8 + 0.2 * sin(time * 2.0);
    vec3 neon = tint * brightness * pulse;

    vec3 result = mix(vec3(0.02), neon, max(lineMask, glowMask * 0.5));
    return vec4(result, col.a);
}`,
};
