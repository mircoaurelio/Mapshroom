export const kaleidoscopeShader = {
  id: 'default_kaleidoscope',
  name: 'Kaleidoscope Mirror',
  code: `// NAME: Kaleidoscope Mirror
uniform float segments; // @min 2.0 @max 16.0 @default 6.0
uniform float rotation; // @min 0.0 @max 6.28 @default 0.0
uniform float speed; // @min 0.0 @max 2.0 @default 0.3

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed + rotation;
    vec2 center = uv - 0.5;
    float angle = atan(center.y, center.x) + t;
    float radius = length(center);

    float segAngle = 3.14159 * 2.0 / segments;
    angle = mod(angle, segAngle);
    angle = abs(angle - segAngle * 0.5);

    vec2 kalUv = vec2(cos(angle), sin(angle)) * radius + 0.5;
    vec4 col = texture2D(tex, kalUv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    vec3 lineColor = 0.5 + 0.5 * cos(6.28318 * (angle * 0.5 + vec3(0.0, 0.33, 0.67)));
    vec3 result = mix(vec3(1.0), lineColor, lineMask);
    return vec4(result, col.a);
}`,
};
