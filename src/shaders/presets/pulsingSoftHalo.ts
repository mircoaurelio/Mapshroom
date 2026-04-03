export const pulsingSoftHaloShader = {
  id: 'default_pulsing_soft_halo',
  name: 'Pulsing Soft Psychedelic Halo',
  description: 'A soft halo variant with breathing size and color pulses.',
  group: 'Glow',
  code: `// NAME: Pulsing Soft Psychedelic Halo
uniform float intensity; // @min 0.0 @max 5.0 @default 2.5
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.1,0.5,0.9
uniform float haloSize; // @min 0.0 @max 1.0 @default 0.6
uniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5
uniform float warp; // @min 0.0 @max 5.0 @default 1.5
uniform float pulseAmount; // @min 0.0 @max 1.0 @default 0.4

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
    float sizeBlob = node_noise(uv * 1.5 + vec2(t * 0.28, -t * 0.22));
    float dynamicHaloSize = clamp(haloSize + (sizeBlob - 0.5) * pulseAmount, 0.01, 0.99);
    float darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - haloSoftness), dynamicHaloSize, lum) *
                         (1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + haloSoftness, lum));

    vec2 flow = (vec2(
        node_noise(uv * 2.0 + vec2(t * 0.18, -t * 0.12)),
        node_noise(uv * 2.0 + vec2(-t * 0.14, t * 0.16) + 2.7)
    ) - 0.5) * warp;
    float blobNoise = node_noise(uv * 2.8 + flow * 1.8 + t * 0.24);
    float pulse = 0.82 + 0.18 * sin(t * 1.8 + uv.y * 6.0);
    float phase = lum + blobNoise * 1.25 + flow.x * 0.35 + flow.y * 0.22 + t * 0.32;
    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));
    vec3 bands = vec3(
        sin(phase * 4.0 + t * 1.0),
        sin(phase * 5.2 - t * 0.75),
        sin(phase * 6.1 + t * 1.05)
    ) * 0.12;
    vec3 finalColor = clamp((psychColor + bands) * darkHaloMask * intensity * pulse, 0.0, 1.0);

    return vec4(finalColor, original.a);
}`,
};
