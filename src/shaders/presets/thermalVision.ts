export const thermalVisionShader = {
  id: 'default_thermal',
  name: 'Thermal Vision',
  code: `// NAME: Thermal Vision
uniform float contrast; // @min 0.5 @max 3.0 @default 1.5
uniform float heatSpread; // @min 0.0 @max 1.0 @default 0.5
uniform float speed; // @min 0.1 @max 3.0 @default 0.8

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    vec4 col = texture2D(tex, uv);
    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    float lineMask = smoothstep(0.6, 0.1, lum);

    float n1 = node_noise(uv * 4.0 + vec2(t * 0.4, t * 0.3));
    float n2 = node_noise(uv * 6.0 - vec2(t * 0.25, t * 0.5));
    float n3 = node_noise(uv * 3.0 + vec2(sin(t * 0.6) * 0.5, cos(t * 0.4) * 0.5));
    float flow = (n1 + n2 + n3) / 3.0;

    float heat = lineMask * contrast;
    float spreading = flow * heatSpread * (0.7 + 0.3 * sin(t * 1.5));
    heat = clamp(heat + spreading * lineMask + spreading * 0.15, 0.0, 1.0);

    float pulse = 0.85 + 0.15 * sin(t * 2.5 + uv.y * 5.0);
    heat *= pulse;

    vec3 cold = vec3(0.0, 0.0, 0.4);
    vec3 cool = vec3(0.0, 0.2, 1.0);
    vec3 warm = vec3(1.0, 0.8, 0.0);
    vec3 hot = vec3(1.0, 0.0, 0.0);
    vec3 white = vec3(1.0, 0.9, 0.8);

    vec3 thermal;
    if (heat < 0.25) thermal = mix(cold, cool, heat / 0.25);
    else if (heat < 0.5) thermal = mix(cool, warm, (heat - 0.25) / 0.25);
    else if (heat < 0.75) thermal = mix(warm, hot, (heat - 0.5) / 0.25);
    else thermal = mix(hot, white, (heat - 0.75) / 0.25);

    vec3 bg = vec3(0.0, 0.0, 0.12 + 0.03 * sin(t * 0.8));
    vec3 result = mix(bg, thermal, max(lineMask * 0.3, heat));
    return vec4(result, col.a);
}`,
};
