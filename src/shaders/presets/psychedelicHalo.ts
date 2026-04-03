export const psychedelicHaloShader = {
  id: 'default_psych_halo',
  name: 'Psychedelic Dark Halo Echoes',
  description: 'Animated halo echoes that stack color around dark contours.',
  group: 'Glow',
  code: `// NAME: Psychedelic Dark Halo Echoes
uniform float intensity; // @min 0.0 @max 5.0 @default 2.0
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.0,0.33,0.67
uniform float haloSize; // @min 0.0 @max 1.0 @default 0.4
uniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.3
uniform float echoDistance; // @min 0.0 @max 0.5 @default 0.05
uniform float blobDarkness; // @min 0.0 @max 5.0 @default 1.5

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec2 center = uv - 0.5;
    vec2 warp = (vec2(
        node_noise(uv * 2.2 + vec2(t * 0.12, -t * 0.18)),
        node_noise(uv * 2.2 + vec2(-t * 0.16, t * 0.11) + 3.1)
    ) - 0.5) * 0.05;

    vec2 echoUv0 = uv + warp * 0.35;
    vec2 echoUv1 = 0.5 + center * (1.0 - echoDistance * 0.7) + warp;
    vec2 echoUv2 = 0.5 + center * (1.0 - echoDistance * 1.4) - warp * 0.8;

    vec4 source = texture2D(tex, uv);
    float lum0 = dot(texture2D(tex, echoUv0).rgb, vec3(0.299, 0.587, 0.114));
    float lum1 = dot(texture2D(tex, echoUv1).rgb, vec3(0.299, 0.587, 0.114));
    float lum2 = dot(texture2D(tex, echoUv2).rgb, vec3(0.299, 0.587, 0.114));

    float blobNoise = node_noise(uv * 3.2 + warp * 8.0 + t * 0.2);
    float darkMultiplier = 0.35 + 0.65 * (1.0 - smoothstep(0.18, 0.88, blobNoise * blobDarkness * 0.35));

    float mask0 = smoothstep(0.0, 0.06, lum0) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum0));
    float mask1 = smoothstep(0.0, 0.06, lum1) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum1));
    float mask2 = smoothstep(0.0, 0.06, lum2) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum2));

    vec3 color0 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum0 + blobNoise * 0.9 + t * 0.18) + tint + vec3(0.00, 0.12, 0.24)));
    vec3 color1 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum1 + blobNoise * 1.1 + t * 0.20) + tint + vec3(0.08, 0.20, 0.32)));
    vec3 color2 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum2 + blobNoise * 1.3 + t * 0.22) + tint + vec3(0.16, 0.28, 0.40)));

    vec3 finalColor =
        color0 * mask0 +
        color1 * mask1 * 0.78 +
        color2 * mask2 * 0.56;

    finalColor *= intensity * darkMultiplier;
    return vec4(clamp(finalColor, 0.0, 1.0), source.a);
}`,
};
