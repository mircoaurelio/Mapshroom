export const duotoneRelicShader = {
  id: 'default_duotone_relic',
  name: 'Duotone Relic',
  description: 'Maps the drawing to paper and ink tones, giving black-line art a printmaking finish.',
  group: 'Color',
  code: `// NAME: Duotone Relic
uniform vec3 paper; // @default 1.0,0.96,0.90
uniform vec3 inkColor; // @default 0.11,0.12,0.16
uniform float contrast; // @min 0.5 @max 2.0 @default 1.2

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float tone = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);
    float grain = node_noise(uv * resolution * 0.02 + time * 0.04) * 0.05;

    vec3 paperShade = clamp(paper - vec3(grain * 0.7), 0.0, 1.0);
    vec3 inkShade = clamp(inkColor + vec3(grain * 0.15), 0.0, 1.0);
    vec3 result = mix(inkShade, paperShade, tone);
    return vec4(result, source.a);
}`,
};
