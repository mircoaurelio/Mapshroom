export const cyberGlitchShader = {
  id: 'default_cyber',
  name: 'Spectral Contour Split',
  description: 'Pushes RGB channels away from the dark line work for a clean chromatic contour effect.',
  group: 'Color',
  code: `// NAME: Spectral Contour Split
uniform float split; // @min 0.0 @max 0.08 @default 0.02
uniform float pulse; // @min 0.0 @max 4.0 @default 0.9
uniform float invertMix; // @min 0.0 @max 1.0 @default 0.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 center = uv - 0.5;
    vec2 dir = normalize(center + vec2(0.0001));
    float shift = split * (0.7 + 0.3 * sin(time * pulse));

    vec4 base = texture2D(tex, uv);
    vec4 red = texture2D(tex, uv + dir * shift);
    vec4 blue = texture2D(tex, uv - dir * shift);

    float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));
    float ink = 1.0 - smoothstep(0.72, 0.95, lum);
    vec3 aberration = vec3(red.r, base.g, blue.b);
    vec3 result = mix(base.rgb, aberration, ink);
    result = mix(result, 1.0 - result, step(0.5, invertMix));

    return vec4(result, base.a);
}`,
};
