export const psychedelicHaloOnlyShader = {
  id: 'default_psych_halo_only',
  name: 'Psychedelic Dark Halo Only',
  code: `// NAME: Psychedelic Dark Halo Only
uniform float intensity; // @min 0.0 @max 5.0 @default 2.0
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.0,0.33,0.67
uniform float haloSize; // @min 0.0 @max 1.0 @default 0.4
uniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.3

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;

    vec2 q = vec2(node_noise(uv * 2.0 + t * 0.2), node_noise(uv * 2.0 - t * 0.3));
    vec2 r = vec2(node_noise(uv * 4.0 + q + t * 0.5), node_noise(uv * 4.0 + q - t * 0.4));
    float blobNoise = node_noise(uv * 3.0 + r * 2.0 + t * 0.3);

    vec4 original = texture2D(tex, uv);
    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    float darkHaloMask = smoothstep(max(0.0, haloSize - haloSoftness), haloSize, lum) *
                         (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum));

    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    float phase = lum * 0.5 + blobNoise * 1.2 + t * 0.2;
    vec3 psychColor = a + b * cos(6.28318 * (c * phase + tint));

    vec3 finalColor = psychColor * clamp(darkHaloMask * intensity, 0.0, 1.0);

    return vec4(finalColor, original.a);
}`,
};
