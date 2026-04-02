export const pulsingSoftHaloShader = {
  id: 'default_pulsing_soft_halo',
  name: 'Pulsing Soft Psychedelic Halo',
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

    vec2 off = 3.0 / resolution;
    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(-off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum += dot(texture2D(tex, uv + vec2(-off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));
    lum *= 0.2;

    float sizeBlob = node_noise(uv * 1.5 + vec2(t * 0.4, -t * 0.3));
    float dynamicHaloSize = clamp(haloSize + (sizeBlob - 0.5) * pulseAmount, 0.01, 0.99);

    float darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - haloSoftness), dynamicHaloSize, lum) *
                         (1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + haloSoftness, lum));

    vec2 p = uv * 2.0;
    vec2 q = vec2(node_noise(p + t * 0.2), node_noise(p + vec2(5.2, 1.3) - t * 0.3));
    vec2 r = vec2(node_noise(p + warp * q + t * 0.4), node_noise(p + warp * q + vec2(8.3, 2.8) - t * 0.4));
    float blobNoise = node_noise(p + warp * r + t * 0.3);

    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.0, 0.33, 0.67) + tint + r.x * 0.3;

    float phase = lum * 1.0 + blobNoise * 1.5 + t * 0.4;
    vec3 psychColor = a + b * cos(6.28318 * (c * phase + d));

    vec3 neonBands = vec3(
        sin(phase * 4.0 + t * 1.0),
        sin(phase * 5.0 - t * 0.8),
        sin(phase * 6.0 + t * 1.2)
    ) * 0.15;

    psychColor = clamp(psychColor + neonBands, 0.0, 1.0);

    vec3 finalColor = psychColor * clamp(darkHaloMask * intensity, 0.0, 1.0);

    return vec4(finalColor, original.a);
}`,
};
