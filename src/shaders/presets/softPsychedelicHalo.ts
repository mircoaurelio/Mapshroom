export const softPsychedelicHaloShader = {
  id: 'default_soft_psych_halo',
  name: 'Soft Psychedelic Halo',
  description: 'A softer halo bloom with gently warped color motion.',
  group: 'Glow',
  code: `// NAME: Soft Psychedelic Halo
uniform float intensity; // @min 0.0 @max 5.0 @default 2.5
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.1,0.5,0.9
uniform float haloSize; // @min 0.0 @max 1.0 @default 0.6
uniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5
uniform float warp; // @min 0.0 @max 5.0 @default 1.5

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 original = texture2D(tex, uv);
    vec2 off = 2.0 / max(resolution, vec2(1.0));
    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(-off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(-off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum *= 0.2;
    float darkHaloMask = smoothstep(max(0.0, haloSize - haloSoftness), haloSize, lum) *
                         (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum));

    vec2 flow = (vec2(
        node_noise(uv * 2.0 + vec2(t * 0.16, -t * 0.10)),
        node_noise(uv * 2.0 + vec2(-t * 0.12, t * 0.14) + 4.2)
    ) - 0.5) * warp;
    float blobNoise = node_noise(uv * 3.0 + flow * 1.5 + t * 0.22);
    float phase = lum + blobNoise * 1.3 + flow.x * 0.4 + flow.y * 0.2 + t * 0.35;
    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.0, 0.18, 0.36)));
    vec3 bands = vec3(
        sin(phase * 4.0 + t),
        sin(phase * 5.0 - t * 0.8),
        sin(phase * 6.0 + t * 1.1)
    ) * 0.12;
    vec3 finalColor = clamp((psychColor + bands) * darkHaloMask * intensity, 0.0, 1.0);

    return vec4(finalColor, original.a);
}`,
};
