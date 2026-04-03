export const pixelSortShader = {
  id: 'default_pixelsort',
  name: 'Pixel Sort Drift',
  description: 'A horizontal drift that sorts dark contour fragments into soft glitches.',
  group: 'Motion',
  code: `// NAME: Pixel Sort Drift
uniform float drift; // @min 0.0 @max 0.15 @default 0.04
uniform float speed; // @min 0.1 @max 3.0 @default 1.0
uniform vec3 tint; // @default 0.1,0.4,0.8

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float wave = sin(uv.y * 36.0 + t * 2.6) * 0.5 + 0.5;
    float offsetA = lineMask * drift * sin(t * 1.8 + uv.y * 18.0) * wave;
    float offsetB = lineMask * drift * 0.6 * cos(t * 1.4 + uv.y * 12.0);

    vec4 shiftedA = texture2D(tex, vec2(uv.x + offsetA, uv.y));
    vec4 shiftedB = texture2D(tex, vec2(uv.x - offsetB, uv.y));
    float shiftedLumA = dot(shiftedA.rgb, vec3(0.299, 0.587, 0.114));
    float shiftedLumB = dot(shiftedB.rgb, vec3(0.299, 0.587, 0.114));
    float shiftedMaskA = smoothstep(0.6, 0.1, shiftedLumA);
    float shiftedMaskB = smoothstep(0.6, 0.1, shiftedLumB);

    float combinedMask = max(lineMask, max(shiftedMaskA * 0.6, shiftedMaskB * 0.45));
    vec3 lineColor = tint * (1.0 - combinedMask * 0.3);
    vec3 result = mix(vec3(1.0), lineColor, combinedMask);
    return vec4(result, col.a);
}`,
};
