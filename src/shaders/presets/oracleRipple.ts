export const oracleRippleShader = {
  id: 'default_oracle_ripple',
  name: 'Oracle Ripple',
  description: 'Adds circular breathing waves from the center without destroying the line structure.',
  group: 'Motion',
  code: `// NAME: Oracle Ripple
uniform float amplitude; // @min 0.0 @max 0.08 @default 0.018
uniform float frequency; // @min 0.5 @max 18.0 @default 6.0
uniform float speed; // @min 0.0 @max 4.0 @default 1.2

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 p = uv - 0.5;
    float radius = length(p);
    vec2 dir = normalize(p + vec2(0.0001));
    float wave = sin(radius * frequency * 6.28318 - time * speed * 2.0);
    vec2 offset = dir * wave * amplitude * (0.2 + 0.8 * (1.0 - radius));
    vec2 sampleUv = clamp(uv + offset, 0.0, 1.0);
    return texture2D(tex, sampleUv);
}`,
};
