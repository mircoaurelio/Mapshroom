export const neonGlowShader = {
  id: 'default_neon',
  name: 'Neon Glow Lines',
  code: `// NAME: Neon Glow Lines
uniform float glowSize; // @min 0.001 @max 0.02 @default 0.005
uniform float brightness; // @min 0.5 @max 3.0 @default 1.5
uniform vec3 tint; // @default 0.0,1.0,0.6

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float glow = 0.0;
    for (float i = 1.0; i <= 4.0; i += 1.0) {
        float d = glowSize * i;
        glow += dot(texture2D(tex, uv + vec2(d, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        glow += dot(texture2D(tex, uv - vec2(d, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        glow += dot(texture2D(tex, uv + vec2(0.0, d)).rgb, vec3(0.299, 0.587, 0.114));
        glow += dot(texture2D(tex, uv - vec2(0.0, d)).rgb, vec3(0.299, 0.587, 0.114));
    }
    glow = 1.0 - glow / 16.0;
    float glowMask = smoothstep(0.1, 0.6, glow);

    float pulse = 0.8 + 0.2 * sin(time * 2.0);
    vec3 neon = tint * brightness * pulse;

    vec3 result = mix(vec3(0.02), neon, max(lineMask, glowMask * 0.5));
    return vec4(result, col.a);
}`,
};
