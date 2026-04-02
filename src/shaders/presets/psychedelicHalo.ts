export const psychedelicHaloShader = {
  id: 'default_psych_halo',
  name: 'Psychedelic Dark Halo Echoes',
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

    vec2 q = vec2(node_noise(uv * 2.0 + t * 0.2), node_noise(uv * 2.0 - t * 0.3));
    vec2 r = vec2(node_noise(uv * 4.0 + q + t * 0.5), node_noise(uv * 4.0 + q - t * 0.4));
    float blobNoise = node_noise(uv * 3.0 + r * 2.0 + t * 0.3);

    float darkSpotNoise = node_noise(uv * 4.0 - r * 1.5 + t * 0.4);
    float darkMultiplier = clamp(pow(darkSpotNoise, blobDarkness), 0.0, 1.0);

    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);

    vec3 finalColor = vec3(0.0);

    for(int i = 0; i < 5; i++) {
        float fi = float(i);
        float scale = 1.0 - fi * echoDistance;
        vec2 offsetUv = (uv - 0.5) * scale + 0.5;

        vec4 orig = texture2D(tex, offsetUv);
        float lum = dot(orig.rgb, vec3(0.299, 0.587, 0.114));

        float darkHaloMask = smoothstep(0.0, 0.05, lum) *
                             (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum));

        float phase = lum * 0.5 + blobNoise * 1.2 + t * 0.2 - fi * 0.15;
        vec3 psychColor = a + b * cos(6.28318 * (c * phase + tint));

        psychColor *= darkMultiplier;

        float alpha = 1.0 - (fi / 5.0);
        finalColor += psychColor * clamp(darkHaloMask * intensity, 0.0, 1.0) * alpha;
    }

    vec4 original = texture2D(tex, uv);
    return vec4(finalColor, original.a);
}`,
};
