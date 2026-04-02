export const watercolorShader = {
  id: 'default_watercolor',
  name: 'Watercolor Bleed',
  code: `// NAME: Watercolor Bleed
uniform float bleed; // @min 0.001 @max 0.02 @default 0.006
uniform float speed; // @min 0.0 @max 2.0 @default 0.4
uniform float saturation; // @min 0.3 @max 2.0 @default 1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    float n1 = node_noise(uv * 5.0 + t * 0.2);
    float n2 = node_noise(uv * 8.0 - t * 0.15);
    vec2 distort = vec2(n1 - 0.5, n2 - 0.5) * bleed;

    vec4 col = texture2D(tex, uv + distort);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.7, 0.15, lum);

    float hue = node_noise(uv * 2.0 + t * 0.1) * 6.28318;
    vec3 pigment = 0.5 + 0.5 * cos(hue + vec3(0.0, 2.094, 4.189));
    pigment = mix(vec3(dot(pigment, vec3(0.333))), pigment, saturation);

    float paper = 0.95 + 0.05 * node_noise(uv * 30.0);
    float edgeSoft = smoothstep(0.0, 0.5, lineMask);
    vec3 result = mix(vec3(paper), pigment * 0.7, edgeSoft);
    return vec4(result, col.a);
}`,
};
