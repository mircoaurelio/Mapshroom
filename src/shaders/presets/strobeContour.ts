export const strobeContourShader = {
  id: 'default_strobe_contour',
  name: 'Strobe Contour',
  description: 'Turns dark line density into a rhythmic strobe palette for energetic projection looks.',
  group: 'Motion',
  code: `// NAME: Strobe Contour
uniform float speed; // @min 0.0 @max 5.0 @default 1.2
uniform float contrast; // @min 0.4 @max 2.0 @default 1.25
uniform vec3 strobeColor; // @default 0.92,0.16,0.44

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float ink = pow(1.0 - lum, contrast);
    float strobe = step(0.5, fract(time * speed * 0.5 + ink * 0.65));
    vec3 lineColor = mix(vec3(0.05), strobeColor, strobe);
    vec3 result = mix(vec3(1.0), lineColor, ink);
    return vec4(result, source.a);
}`,
};
