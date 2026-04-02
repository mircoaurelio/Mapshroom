export const psychedelicBlobShader = {
  id: 'default_psych',
  name: 'Psychedelic Blob Shadows',
  code: `// NAME: Psychedelic Blob Shadows
uniform float intensity; // @min 0.0 @max 2.0 @default 1.0
uniform float speed; // @min 0.0 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.0,0.33,0.67

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec2 q = vec2(node_noise(uv * 2.0 + t * 0.2), node_noise(uv * 2.0 - t * 0.3));
    vec2 r = vec2(node_noise(uv * 4.0 + q + t * 0.5), node_noise(uv * 4.0 + q - t * 0.4));

    float blobNoise = node_noise(uv * 3.0 + r * 2.0 + t * 0.3);
    float halos = smoothstep(0.35, 0.65, blobNoise);

    vec4 original = texture2D(tex, uv);
    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    float phase = lum * 0.5 + halos * 1.2 + t * 0.2;
    vec3 psychColor = a + b * cos(6.28318 * (c * phase + tint));

    float darkSpotMask = smoothstep(0.5, 0.05, lum);
    float illumination = clamp(halos * darkSpotMask * intensity, 0.0, 1.0);

    vec3 finalEffect = mix(vec3(0.0), psychColor, illumination);
    return vec4(mix(original.rgb, finalEffect, 1.0), original.a);
}`,
};
