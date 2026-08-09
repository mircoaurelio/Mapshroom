import type { ShaderPresetDefinition } from '../types';

export const WEBGL2_DEPTH_LAB_GROUP = 'WebGL2 Depth Lab';

export const webgl2DepthLabPresetList: ShaderPresetDefinition[] = [
  {
    id: 'depth2_contour_atlas',
    name: 'Depth Contour Atlas',
    description: 'Pixel-accurate animated contour bands extracted from a grayscale depth map.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      contourGlow: { enabled: true, signal: 'high', min: 0.65, max: 2.4 },
    },
    uniformValues: { bands: 24, speed: 0.22, contourGlow: 1.35, depthGamma: 1 },
    code: `// NAME: Depth Contour Atlas
uniform int bands; // @min 4 @max 64 @default 24
uniform float speed; // @min -2.0 @max 2.0 @default 0.22
uniform float contourGlow; // @min 0.0 @max 3.0 @default 1.35
uniform float depthGamma; // @min 0.25 @max 3.0 @default 1.0

float depthAtlasFetch(sampler2D tex, ivec2 pixel) {
    ivec2 size = textureSize(tex, 0);
    return texelFetch(tex, clamp(pixel, ivec2(0), size - ivec2(1)), 0).r;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    ivec2 pixel = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    float depth = pow(clamp(depthAtlasFetch(tex, pixel), 0.0, 1.0), depthGamma);
    float phase = depth * float(max(bands, 1)) - time * speed;
    float line = 1.0 - smoothstep(0.035, 0.19, abs(fract(phase) - 0.5));
    vec3 nearColor = vec3(0.06, 0.18, 0.34);
    vec3 farColor = vec3(0.94, 0.23, 0.72);
    vec3 color = mix(nearColor, farColor, depth) + line * contourGlow * vec3(0.38, 1.0, 0.82);
    return vec4(color, 1.0);
}`,
  },
  {
    id: 'depth2_sobel_relight',
    name: 'Depth Sobel Relight',
    description: 'A 3x3 integer Sobel normal field with a moving projection light.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      lightPower: { enabled: true, signal: 'level', min: 0.8, max: 3.2 },
    },
    uniformValues: { relief: 8, lightPower: 1.6, orbitSpeed: 0.45, ambient: 0.12 },
    code: `// NAME: Depth Sobel Relight
uniform float relief; // @min 0.5 @max 20.0 @default 8.0
uniform float lightPower; // @min 0.0 @max 4.0 @default 1.6
uniform float orbitSpeed; // @min -3.0 @max 3.0 @default 0.45
uniform float ambient; // @min 0.0 @max 1.0 @default 0.12

float depthSobelFetch(sampler2D tex, ivec2 p, ivec2 size) {
    return texelFetch(tex, clamp(p, ivec2(0), size - ivec2(1)), 0).r;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    ivec2 p = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    float tl = depthSobelFetch(tex, p + ivec2(-1, 1), size);
    float tc = depthSobelFetch(tex, p + ivec2(0, 1), size);
    float tr = depthSobelFetch(tex, p + ivec2(1, 1), size);
    float ml = depthSobelFetch(tex, p + ivec2(-1, 0), size);
    float mr = depthSobelFetch(tex, p + ivec2(1, 0), size);
    float bl = depthSobelFetch(tex, p + ivec2(-1, -1), size);
    float bc = depthSobelFetch(tex, p + ivec2(0, -1), size);
    float br = depthSobelFetch(tex, p + ivec2(1, -1), size);
    vec2 gradient = vec2((tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl),
                         (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br));
    vec3 normal = normalize(vec3(-gradient * relief, 1.0));
    vec3 lightDir = normalize(vec3(cos(time * orbitSpeed), sin(time * orbitSpeed), 0.72));
    float diffuse = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(normal.z, 0.0), 2.0);
    float depth = depthSobelFetch(tex, p, size);
    vec3 base = mix(vec3(0.015, 0.02, 0.05), vec3(0.18, 0.66, 1.0), depth);
    return vec4(base * (ambient + diffuse * lightPower) + rim * vec3(1.0, 0.25, 0.58), 1.0);
}`,
  },
  {
    id: 'depth2_parallax_slices',
    name: 'Depth Parallax Slices',
    description: 'Eight depth-gated parallax samples produce a volumetric lenticular drift.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      spread: { enabled: true, signal: 'bass', min: 0.006, max: 0.055 },
    },
    uniformValues: { spread: 0.028, speed: 0.55, sliceContrast: 1.4, tint: [0.25, 0.85, 1] },
    code: `// NAME: Depth Parallax Slices
uniform float spread; // @min 0.0 @max 0.08 @default 0.028
uniform float speed; // @min -3.0 @max 3.0 @default 0.55
uniform float sliceContrast; // @min 0.2 @max 4.0 @default 1.4
uniform vec3 tint; // @default 0.25,0.85,1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 sourceSize = textureSize(tex, 0);
    vec2 pixel = 1.0 / vec2(sourceSize);
    float centerDepth = texture(tex, uv).r;
    vec2 direction = vec2(cos(time * speed), sin(time * speed * 0.73));
    vec3 accumulation = vec3(0.0);
    float weightSum = 0.0;
    for (int layer = 0; layer < 8; ++layer) {
        float layerDepth = (float(layer) + 0.5) / 8.0;
        vec2 shiftedUv = clamp(uv + direction * (centerDepth - layerDepth) * spread,
                               pixel * 0.5, vec2(1.0) - pixel * 0.5);
        float sampledDepth = texture(tex, shiftedUv).r;
        float gate = exp(-abs(sampledDepth - layerDepth) * 18.0);
        vec3 layerColor = mix(vec3(0.04, 0.01, 0.12), tint, layerDepth);
        accumulation += layerColor * gate;
        weightSum += gate;
    }
    vec3 color = accumulation / max(weightSum, 0.001);
    color = (color - 0.5) * sliceContrast + 0.5;
    return vec4(color, 1.0);
}`,
  },
  {
    id: 'depth2_voxel_quantizer',
    name: 'Depth Voxel Quantizer',
    description: 'Integer texel addressing turns depth into stable animated voxel plates.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      edgeGlow: { enabled: true, signal: 'beat', min: 0.4, max: 2.5 },
    },
    uniformValues: { cellSize: 9, levels: 12, edgeGlow: 1.2, pulse: 0.6 },
    code: `// NAME: Depth Voxel Quantizer
uniform int cellSize; // @min 2 @max 32 @default 9
uniform int levels; // @min 2 @max 32 @default 12
uniform float edgeGlow; // @min 0.0 @max 3.0 @default 1.2
uniform float pulse; // @min 0.0 @max 2.0 @default 0.6

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    int cell = max(cellSize, 1);
    ivec2 pixel = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    ivec2 cellOrigin = (pixel / cell) * cell;
    ivec2 center = clamp(cellOrigin + ivec2(cell / 2), ivec2(0), size - ivec2(1));
    float depth = texelFetch(tex, center, 0).r;
    float quantized = floor(depth * float(max(levels, 2))) / float(max(levels - 1, 1));
    vec2 local = fract(vec2(pixel) / float(cell));
    float border = 1.0 - smoothstep(0.02, 0.12, min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y)));
    float wave = 0.78 + pulse * 0.22 * sin(time * 2.0 + quantized * 18.0);
    vec3 color = mix(vec3(0.025, 0.018, 0.07), vec3(0.95, 0.38, 0.12), quantized) * wave;
    color += border * edgeGlow * mix(vec3(0.1, 0.75, 1.0), vec3(1.0, 0.1, 0.72), quantized);
    return vec4(color, 1.0);
}`,
  },
  {
    id: 'depth2_hologram_derivatives',
    name: 'Depth Hologram Derivatives',
    description: 'Core derivatives stabilize depth scanlines and silhouette Fresnel glow.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      scanGlow: { enabled: true, signal: 'high', min: 0.7, max: 3 },
    },
    uniformValues: { scanDensity: 180, scanSpeed: 0.35, scanGlow: 1.5, edgePower: 2.2 },
    code: `// NAME: Depth Hologram Derivatives
uniform float scanDensity; // @min 20.0 @max 420.0 @default 180.0
uniform float scanSpeed; // @min -4.0 @max 4.0 @default 0.35
uniform float scanGlow; // @min 0.0 @max 4.0 @default 1.5
uniform float edgePower; // @min 0.2 @max 6.0 @default 2.2

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float depth = texture(tex, uv).r;
    vec2 gradient = vec2(dFdx(depth), dFdy(depth));
    float silhouette = pow(clamp(length(gradient) / max(fwidth(depth), 0.00001), 0.0, 1.0), edgePower);
    float phase = uv.y * scanDensity + depth * 34.0 - time * scanSpeed * 30.0;
    float scan = 1.0 - smoothstep(0.08, 0.24, abs(fract(phase) - 0.5));
    vec3 hologram = mix(vec3(0.01, 0.04, 0.09), vec3(0.05, 0.72, 0.95), depth);
    hologram += scan * scanGlow * vec3(0.16, 0.95, 0.82);
    hologram += silhouette * vec3(0.82, 0.2, 1.0);
    hologram *= 0.82 + 0.18 * sin(time * 3.0 + uv.y * 60.0);
    return vec4(hologram, 1.0);
}`,
  },
  {
    id: 'depth2_bitfield_cells',
    name: 'Depth Bitfield Cells',
    description: 'Unsigned integer hashing scatters deterministic cells through depth strata.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      burst: { enabled: true, signal: 'beat', min: 0.15, max: 1 },
    },
    uniformValues: { grid: 72, depthSteps: 16, burst: 0.7, speed: 0.8 },
    code: `// NAME: Depth Bitfield Cells
uniform int grid; // @min 12 @max 180 @default 72
uniform int depthSteps; // @min 2 @max 32 @default 16
uniform float burst; // @min 0.0 @max 1.0 @default 0.7
uniform float speed; // @min -4.0 @max 4.0 @default 0.8

uint depthCellHash(uvec3 value) {
    value = ((value >> 8u) ^ value.yzx) * 1103515245u;
    value = ((value >> 8u) ^ value.yzx) * 1103515245u;
    return value.x ^ value.y ^ value.z;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    ivec2 pixel = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    float depth = texelFetch(tex, pixel, 0).r;
    ivec2 cell = ivec2(floor(uv * float(max(grid, 1))));
    uint layer = uint(clamp(int(depth * float(max(depthSteps, 2))), 0, max(depthSteps - 1, 1)));
    uint bits = depthCellHash(uvec3(uint(max(cell.x, 0)), uint(max(cell.y, 0)), layer));
    float randomValue = float(bits & 1023u) / 1023.0;
    vec2 local = fract(uv * float(max(grid, 1))) - 0.5;
    float radius = mix(0.08, 0.46, burst * (0.35 + 0.65 * sin(time * speed + randomValue * 6.28318) * 0.5 + 0.5));
    float dotMask = 1.0 - smoothstep(radius, radius + 0.055, length(local));
    vec3 color = mix(vec3(0.015, 0.01, 0.04), vec3(1.0, 0.2, 0.52), randomValue);
    color = mix(color, vec3(0.16, 0.9, 1.0), depth) * dotMask;
    return vec4(color, 1.0);
}`,
  },
  {
    id: 'depth2_normal_spectrum',
    name: 'Depth Normal Spectrum',
    description: 'Exact neighboring texels become a chromatic surface-normal visualization.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      normalStrength: { enabled: true, signal: 'mid', min: 2, max: 18 },
    },
    uniformValues: { normalStrength: 9, colorShift: 0.2, specular: 1.4, speed: 0.4 },
    code: `// NAME: Depth Normal Spectrum
uniform float normalStrength; // @min 0.5 @max 24.0 @default 9.0
uniform float colorShift; // @min 0.0 @max 1.0 @default 0.2
uniform float specular; // @min 0.0 @max 4.0 @default 1.4
uniform float speed; // @min -3.0 @max 3.0 @default 0.4

float normalSpectrumDepth(sampler2D tex, ivec2 p, ivec2 size) {
    return texelFetch(tex, clamp(p, ivec2(0), size - ivec2(1)), 0).r;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    ivec2 p = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    float left = normalSpectrumDepth(tex, p - ivec2(1, 0), size);
    float right = normalSpectrumDepth(tex, p + ivec2(1, 0), size);
    float down = normalSpectrumDepth(tex, p - ivec2(0, 1), size);
    float up = normalSpectrumDepth(tex, p + ivec2(0, 1), size);
    float depth = normalSpectrumDepth(tex, p, size);
    vec3 normal = normalize(vec3((left - right) * normalStrength, (down - up) * normalStrength, 1.0));
    vec3 spectrum = normal * 0.5 + 0.5;
    spectrum = spectrum.gbr * colorShift + spectrum * (1.0 - colorShift);
    vec3 lightDir = normalize(vec3(sin(time * speed), cos(time * speed), 0.8));
    float highlight = pow(max(dot(normal, lightDir), 0.0), 24.0) * specular;
    return vec4(spectrum * (0.35 + depth * 0.85) + highlight, 1.0);
}`,
  },
  {
    id: 'depth2_temporal_echo',
    name: 'Depth Temporal Echo',
    description: 'A fixed eight-tap depth-aware echo with animated chromatic separation.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      echoSpread: { enabled: true, signal: 'bass', min: 0.002, max: 0.045 },
    },
    uniformValues: { echoSpread: 0.022, echoDecay: 0.72, speed: 0.65, chroma: 0.8 },
    code: `// NAME: Depth Temporal Echo
uniform float echoSpread; // @min 0.0 @max 0.06 @default 0.022
uniform float echoDecay; // @min 0.1 @max 0.95 @default 0.72
uniform float speed; // @min -3.0 @max 3.0 @default 0.65
uniform float chroma; // @min 0.0 @max 2.0 @default 0.8

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 sourceSize = vec2(textureSize(tex, 0));
    vec2 safePixel = 0.5 / sourceSize;
    float centerDepth = texture(tex, uv).r;
    vec3 color = vec3(0.0);
    float total = 0.0;
    float weight = 1.0;
    for (int tap = 0; tap < 8; ++tap) {
        float fi = float(tap);
        float angle = time * speed + fi * 2.399963;
        vec2 direction = vec2(cos(angle), sin(angle));
        vec2 echoUv = clamp(uv + direction * echoSpread * fi * (0.2 + centerDepth), safePixel, vec2(1.0) - safePixel);
        float depth = texture(tex, echoUv).r;
        vec3 echoColor = vec3(depth);
        echoColor *= 0.65 + 0.35 * cos(vec3(0.0, 2.1, 4.2) + fi * chroma + centerDepth * 6.0);
        color += echoColor * weight;
        total += weight;
        weight *= echoDecay;
    }
    return vec4(color / max(total, 0.001), 1.0);
}`,
  },
  {
    id: 'depth2_ridge_flow',
    name: 'Depth Ridge Flow',
    description: 'A five-texel Laplacian isolates curvature ridges and sends light along them.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      ridgeGain: { enabled: true, signal: 'mid', min: 1, max: 8 },
    },
    uniformValues: { ridgeGain: 4.2, flowSpeed: 0.8, density: 42, baseMix: 0.18 },
    code: `// NAME: Depth Ridge Flow
uniform float ridgeGain; // @min 0.2 @max 10.0 @default 4.2
uniform float flowSpeed; // @min -4.0 @max 4.0 @default 0.8
uniform float density; // @min 4.0 @max 120.0 @default 42.0
uniform float baseMix; // @min 0.0 @max 1.0 @default 0.18

float ridgeDepth(sampler2D tex, ivec2 p, ivec2 size) {
    return texelFetch(tex, clamp(p, ivec2(0), size - ivec2(1)), 0).r;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    ivec2 p = clamp(ivec2(uv * vec2(size)), ivec2(0), size - ivec2(1));
    float center = ridgeDepth(tex, p, size);
    float laplacian = ridgeDepth(tex, p + ivec2(1, 0), size)
                    + ridgeDepth(tex, p - ivec2(1, 0), size)
                    + ridgeDepth(tex, p + ivec2(0, 1), size)
                    + ridgeDepth(tex, p - ivec2(0, 1), size) - 4.0 * center;
    float ridge = smoothstep(0.002, 0.035, abs(laplacian) * ridgeGain);
    float flow = 0.5 + 0.5 * sin(center * density - time * flowSpeed * 5.0 + atan(dFdy(center), dFdx(center)));
    vec3 ridgeColor = mix(vec3(0.05, 0.55, 1.0), vec3(1.0, 0.12, 0.45), flow);
    vec3 base = mix(vec3(0.005, 0.008, 0.02), vec3(center), baseMix);
    return vec4(base + ridgeColor * ridge, 1.0);
}`,
  },
  {
    id: 'depth2_point_cloud_scan',
    name: 'Depth Point Cloud Scan',
    description: 'Integer-cell depth sampling reconstructs a pulsing point-cloud projection.',
    template: 'sculpture',
    templates: ['sculpture', 'stage'],
    group: WEBGL2_DEPTH_LAB_GROUP,
    minimumTarget: 'webgl2',
    audioReactiveBindings: {
      pointSize: { enabled: true, signal: 'beat', min: 0.12, max: 0.48 },
    },
    uniformValues: { columns: 120, pointSize: 0.28, scanSpeed: 0.32, trail: 0.18 },
    code: `// NAME: Depth Point Cloud Scan
uniform int columns; // @min 24 @max 240 @default 120
uniform float pointSize; // @min 0.05 @max 0.5 @default 0.28
uniform float scanSpeed; // @min -3.0 @max 3.0 @default 0.32
uniform float trail; // @min 0.01 @max 0.5 @default 0.18

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    ivec2 size = textureSize(tex, 0);
    int columnCount = max(columns, 1);
    float aspect = float(size.x) / max(float(size.y), 1.0);
    ivec2 gridSize = ivec2(columnCount, max(1, int(float(columnCount) / aspect)));
    ivec2 cell = clamp(ivec2(uv * vec2(gridSize)), ivec2(0), gridSize - ivec2(1));
    vec2 centerUv = (vec2(cell) + 0.5) / vec2(gridSize);
    ivec2 sourcePixel = clamp(ivec2(centerUv * vec2(size)), ivec2(0), size - ivec2(1));
    float depth = texelFetch(tex, sourcePixel, 0).r;
    vec2 local = fract(uv * vec2(gridSize)) - 0.5;
    float radius = pointSize * (0.35 + depth * 0.65);
    float pointMask = 1.0 - smoothstep(radius, radius + 0.045, length(local));
    float scanner = fract(time * scanSpeed);
    float scanDistance = abs(centerUv.y - scanner);
    scanDistance = min(scanDistance, 1.0 - scanDistance);
    float scan = 1.0 - smoothstep(trail * 0.25, trail, scanDistance);
    vec3 color = mix(vec3(0.08, 0.2, 0.55), vec3(0.22, 1.0, 0.72), depth);
    color += scan * vec3(1.0, 0.22, 0.62);
    return vec4(color * pointMask * (0.35 + scan * 1.8), 1.0);
}`,
  },
];
