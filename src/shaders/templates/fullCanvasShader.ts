export const fullCanvasShaderTemplate = `// NAME: Full Canvas Flow
uniform float speed; // @min 0.05 @max 3.0 @default 0.42
uniform float scale; // @min 0.5 @max 5.0 @default 1.65
uniform float warp; // @min 0.0 @max 2.0 @default 0.72
uniform float glow; // @min 0.0 @max 3.0 @default 1.35
uniform vec3 color_a; // @default 0.025,0.05,0.14
uniform vec3 color_b; // @default 0.08,0.92,0.78
uniform vec3 color_c; // @default 0.94,0.18,0.78

float canvas_hash(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
}

float canvas_noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 curve = local * local * (3.0 - 2.0 * local);
    float a = canvas_hash(cell);
    float b = canvas_hash(cell + vec2(1.0, 0.0));
    float c = canvas_hash(cell + vec2(0.0, 1.0));
    float d = canvas_hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float canvas_fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.54;
    mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
    for (int octave = 0; octave < 6; octave++) {
        value += canvas_noise(point) * amplitude;
        point = rotation * point * 2.03 + vec2(1.7, -2.4);
        amplitude *= 0.48;
    }
    return value;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 point = uv * 2.0 - 1.0;
    point.x *= resolution.x / max(resolution.y, 1.0);
    point *= scale;
    float localTime = time * speed;

    float lowField = canvas_fbm(point * 0.52 + vec2(localTime * 0.16, -localTime * 0.11));
    vec2 domainWarp = vec2(
        canvas_fbm(point * 0.78 + lowField + vec2(localTime * 0.12, 4.2)),
        canvas_fbm(point * 0.74 - lowField + vec2(-3.7, -localTime * 0.14))
    ) - 0.5;
    vec2 flowPoint = point + domainWarp * warp;
    float flowA = canvas_fbm(flowPoint * 1.18 + vec2(localTime * 0.28, 0.0));
    float flowB = canvas_fbm(
        mat2(0.36, -0.93, 0.93, 0.36) * flowPoint * 1.34 -
        vec2(0.0, localTime * 0.22)
    );
    float current = flowA * 0.58 + flowB * 0.42;

    float ribbon = pow(
        0.5 + 0.5 * sin(
            flowPoint.y * 3.4 + domainWarp.x * 5.2 -
            localTime * 1.35 + current * 4.1
        ),
        4.0
    );
    float crossRibbon = pow(
        0.5 + 0.5 * cos(
            flowPoint.x * 2.65 - domainWarp.y * 4.4 +
            localTime * 0.92 + current * 3.2
        ),
        6.0
    );
    float energy = clamp(ribbon * 0.68 + crossRibbon * 0.52, 0.0, 1.0);
    vec3 palette = mix(color_a, color_b, smoothstep(0.22, 0.76, current));
    palette = mix(palette, color_c, crossRibbon * 0.56 + max(domainWarp.x, 0.0) * 0.18);

    vec3 color = color_a * (0.34 + lowField * 0.38);
    color += palette * energy * glow;
    color += color_b * pow(max(ribbon - crossRibbon * 0.35, 0.0), 8.0) * 0.7;
    color += color_c * pow(max(crossRibbon - ribbon * 0.42, 0.0), 10.0) * 0.48;

    float vignette = 1.0 - smoothstep(0.62, 1.58, length(point / max(scale, 0.001)));
    color *= 0.68 + vignette * 0.32;
    color = vec3(1.0) - exp(-max(color, vec3(0.0)) * 1.28);
    return vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const fullCanvasShaderUniformValues = {
  speed: 0.42,
  scale: 1.65,
  warp: 0.72,
  glow: 1.35,
  color_a: [0.025, 0.05, 0.14] as [number, number, number],
  color_b: [0.08, 0.92, 0.78] as [number, number, number],
  color_c: [0.94, 0.18, 0.78] as [number, number, number],
};
