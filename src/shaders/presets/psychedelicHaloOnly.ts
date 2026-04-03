export const psychedelicHaloOnlyShader = {
  id: 'default_psych_halo_only',
  name: 'Psychedelic Dark Halo Only',
  description: 'A pure dark-halo treatment with animated color bands.',
  group: 'Glow',
  code: `// NAME: Psychedelic Dark Halo Only
uniform float intensity; // @min 0.0 @max 5.0 @default 2.0
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.0,0.33,0.67
uniform float haloSize; // @min 0.0 @max 1.0 @default 0.4
uniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.3

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 original = texture2D(tex, uv);
    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    float blurLum =
        lum * 0.4 +
        dot(texture2D(tex, uv + vec2(1.0 / max(resolution.x, 1.0), 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +
        dot(texture2D(tex, uv - vec2(1.0 / max(resolution.x, 1.0), 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +
        dot(texture2D(tex, uv + vec2(0.0, 1.0 / max(resolution.y, 1.0))).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +
        dot(texture2D(tex, uv - vec2(0.0, 1.0 / max(resolution.y, 1.0))).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;

    float darkHaloMask = smoothstep(max(0.0, haloSize - haloSoftness), haloSize, blurLum) *
                         (1.0 - smoothstep(haloSize, haloSize + haloSoftness, blurLum));

    float blobNoise = node_noise(uv * 3.0 + vec2(t * 0.18, -t * 0.14));
    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(blurLum + blobNoise * 1.1 + t * 0.2) + tint + vec3(0.0, 0.15, 0.3)));
    vec3 finalColor = psychColor * clamp(darkHaloMask * intensity, 0.0, 1.0);

    return vec4(clamp(finalColor, 0.0, 1.0), original.a);
}`,
};
