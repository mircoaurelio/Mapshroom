export const thermalVisionShader = {
  id: 'default_thermal',
  name: 'Thermal Vision',
  code: `// NAME: Thermal Vision
uniform float contrast; // @min 0.5 @max 3.0 @default 1.5
uniform float heatSpread; // @min 0.0 @max 1.0 @default 0.4
uniform float speed; // @min 0.0 @max 2.0 @default 0.5

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float heat = lineMask * contrast;
    float pulse = node_noise(uv * 3.0 + t * 0.3) * heatSpread;
    heat = clamp(heat + pulse * lineMask, 0.0, 1.0);

    vec3 cold = vec3(0.0, 0.0, 0.4);
    vec3 cool = vec3(0.0, 0.2, 1.0);
    vec3 warm = vec3(1.0, 0.8, 0.0);
    vec3 hot = vec3(1.0, 0.0, 0.0);

    vec3 thermal;
    if (heat < 0.33) thermal = mix(cold, cool, heat / 0.33);
    else if (heat < 0.66) thermal = mix(cool, warm, (heat - 0.33) / 0.33);
    else thermal = mix(warm, hot, (heat - 0.66) / 0.34);

    vec3 bg = vec3(0.0, 0.0, 0.15);
    vec3 result = mix(bg, thermal, max(lineMask * 0.3, heat));
    return vec4(result, col.a);
}`,
};
