export const pixelSortShader = {
  id: 'default_pixelsort',
  name: 'Pixel Sort Drift',
  code: `// NAME: Pixel Sort Drift
uniform float drift; // @min 0.0 @max 0.15 @default 0.04
uniform float speed; // @min 0.1 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.1,0.4,0.8

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float wave = sin(uv.y * 40.0 + t * 3.0) * 0.5 + 0.5;
    float offset = lineMask * drift * sin(t * 2.0 + uv.y * 20.0) * wave;

    vec4 shifted = texture2D(tex, vec2(uv.x + offset, uv.y));
    float shiftedLum = dot(shifted.rgb, vec3(0.299, 0.587, 0.114));
    float shiftedMask = smoothstep(0.6, 0.1, shiftedLum);

    float combinedMask = max(lineMask, shiftedMask * 0.6);
    vec3 lineColor = tint * (1.0 - combinedMask * 0.3);
    vec3 result = mix(vec3(1.0), lineColor, combinedMask);
    return vec4(result, col.a);
}`,
};
