import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error(
    'Usage: node scripts/import-shader-bundle-presets.mjs <mapshroom-shader-bundle.json>',
  );
}

const projectRoot = process.cwd();
const outputPath = path.join(
  projectRoot,
  'src/shaders/presets/importedShaderBundle.ts',
);
const summaryPath = path.join(
  projectRoot,
  '.tmp-shader-import/shadertoexport-import-summary.json',
);
const presetRoots = [
  'src/shaders/presets/sculpture',
  'src/shaders/presets/stage',
  'src/shaders/presets/drawing',
];
const SHADER_CODE_REPAIRS = new Map([
  [
    'timeline-27532534-48fb-45f5-b71b-5ec869c1e382',
    `// NAME: Hyperactive Brain Waves
uniform float trailSpeed; // @min 0.0 @max 10.0 @default 5.0
uniform float stripFrequency; // @min 0.1 @max 20.0 @default 10.0
uniform float scale; // @min 0.1 @max 5.0 @default 1.0
uniform float rotationSpeed; // @default 1.0 @min 0.0 @max 5.0
uniform float copies; // @min 1.0 @max 10.0 @default 1.0
uniform float activity; // @min 0.0 @max 5.0 @default 2.0

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float map(vec3 p, float time) {
    float t = time * rotationSpeed;
    p.xz = rot(t) * p.xz;
    p.yz = rot(sin(t * 0.5) * 0.5) * p.yz;
    p.y = -p.y;
    vec3 q = p;
    q.y /= mix(0.75, 0.4, smoothstep(0.0, -0.6, p.y));
    q.z /= 1.15;
    float d = length(q) - 1.0;
    d += smoothstep(0.15, 0.0, abs(p.x)) * 0.2;
    float folds = sin(p.x * 18.0 + sin(p.y * 10.0)) *
        sin(p.y * 19.0 + sin(p.z * 10.0)) *
        sin(p.z * 20.0 + sin(p.x * 10.0));
    return (d + folds * 0.035) * 0.5;
}

vec3 getCyberColor(float time, vec3 p) {
    vec3 c1 = vec3(0.1, 1.0, 0.2);
    vec3 c2 = vec3(1.0, 0.0, 0.9);
    vec3 c3 = vec3(0.0, 0.9, 1.0);
    float m1 = sin(time * 4.0 + length(p) * 5.0) * 0.5 + 0.5;
    float m2 = cos(time * 3.0 - p.y * 6.0 + p.x * 4.0) * 0.5 + 0.5;
    return mix(mix(c1, c2, m1), c3, m2);
}

vec4 renderBrain(vec2 pUv, float time) {
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(pUv, -1.5));
    float distanceToSurface = 0.0;
    float travel = 0.0;
    for (int i = 0; i < 40; i++) {
        vec3 pos = ro + rd * travel;
        distanceToSurface = map(pos, time);
        if (distanceToSurface < 0.001 || travel > 5.0) break;
        travel += distanceToSurface;
    }
    if (distanceToSurface < 0.001) {
        vec3 pos = ro + rd * travel;
        vec2 e = vec2(0.01, 0.0);
        vec3 normal = normalize(vec3(
            map(pos + e.xyy, time) - map(pos - e.xyy, time),
            map(pos + e.yxy, time) - map(pos - e.yxy, time),
            map(pos + e.yyx, time) - map(pos - e.yyx, time)
        ));
        vec3 light = normalize(vec3(1.0, 2.0, 1.0));
        float diffuse = max(dot(normal, light), 0.0);
        float fresnel = pow(1.0 - max(dot(normal, -rd), 0.0), 5.0);
        vec3 color = getCyberColor(time, pos) * diffuse + fresnel * vec3(1.0);
        float stripes = sin(pos.y * stripFrequency - time * trailSpeed) * 0.5 + 0.5;
        color += stripes * vec3(0.5, 1.0, 0.2) * diffuse;
        return vec4(color, 1.0);
    }
    return vec4(0.0);
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 tiledUv = fract(uv * max(copies, 1.0));
    vec2 p = (tiledUv - 0.5) * 2.0;
    p.x *= resolution.x / max(resolution.y, 1.0);
    p *= scale;
    vec4 brain = renderBrain(p, time);
    vec4 source = texture2D(tex, uv);
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float waves = sin(radius * 15.0 - time * trailSpeed) * 0.5 + 0.5;
    float rays = sin(angle * 10.0 + time * 5.0) * cos(angle * 6.0 - time * 7.0);
    float field = smoothstep(0.15, 1.0, waves * 0.7 + abs(rays) * 0.45);
    vec3 fieldColor = getCyberColor(time * 0.35, vec3(p, radius));
    vec3 generated = brain.rgb + fieldColor * field * activity * 0.18;
    float blend = clamp(brain.a + field * activity * 0.12, 0.0, 1.0);
    return vec4(mix(source.rgb, generated, blend), source.a);
}`,
  ],
  [
    'timeline-afe5e54f-e396-4a8d-b8f5-88f2d34ab85f',
    `// NAME: Psy 3D Extruded Warp
uniform float speed; // @min 0.1 @max 3.0 @default 1.0
uniform float distortion; // @min 0.0 @max 5.0 @default 1.5
uniform float psychedelic; // @min 0.0 @max 3.0 @default 1.5
uniform float scale; // @min 1.0 @max 10.0 @default 3.0
uniform float depth; // @min 0.1 @max 5.0 @default 2.0
uniform float shininess; // @min 5.0 @max 60.0 @default 30.0

vec3 hueShift(vec3 color, float angle) {
    vec3 axis = vec3(0.57735);
    float cosine = cos(angle);
    return color * cosine +
        cross(axis, color) * sin(angle) +
        axis * dot(axis, color) * (1.0 - cosine);
}

vec2 getWarpedUV(vec2 uv, float time, vec2 aspect, float scaleValue, float distortionValue) {
    vec2 centered = (uv - 0.5) * aspect;
    vec2 orbit = vec2(sin(time * 0.4), cos(time * 0.4));
    float noiseValue = node_noise(centered * scaleValue + orbit);
    float angle = atan(centered.y, centered.x) + noiseValue * distortionValue;
    float radius = length(centered) +
        sin(noiseValue * 6.28318 + time) * distortionValue * 0.1;
    vec2 warped = vec2(cos(angle), sin(angle)) * radius;
    return warped / aspect + 0.5;
}

float getHeight(
    sampler2D tex,
    vec2 uv,
    float time,
    vec2 aspect,
    float scaleValue,
    float distortionValue
) {
    vec2 warpedUv = getWarpedUV(uv, time, aspect, scaleValue, distortionValue);
    vec4 color = texture2D(tex, clamp(warpedUv, 0.0, 1.0));
    return dot(color.rgb, vec3(0.333333)) * color.a;
}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float localTime = time * speed;
    vec2 safeResolution = max(resolution, vec2(1.0));
    vec2 aspect = safeResolution / safeResolution.y;
    vec2 epsilon = vec2(2.0) / safeResolution;
    float height = getHeight(tex, uv, localTime, aspect, scale, distortion);
    float heightX = getHeight(
        tex,
        uv + vec2(epsilon.x, 0.0),
        localTime,
        aspect,
        scale,
        distortion
    );
    float heightY = getHeight(
        tex,
        uv + vec2(0.0, epsilon.y),
        localTime,
        aspect,
        scale,
        distortion
    );
    vec3 normal = normalize(vec3(
        (height - heightX) * depth,
        (height - heightY) * depth,
        max(epsilon.x + epsilon.y, 0.001)
    ));
    vec2 warpedUv = clamp(
        getWarpedUV(uv, localTime, aspect, scale, distortion),
        0.0,
        1.0
    );
    vec4 source = texture2D(tex, warpedUv);
    vec3 lightDirection = normalize(vec3(
        sin(localTime * 0.7),
        cos(localTime * 0.55),
        1.2
    ));
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(
        max(dot(normalize(lightDirection + viewDirection), normal), 0.0),
        max(shininess, 1.0)
    );
    float hueAngle = localTime * 0.45 + height * psychedelic * 6.28318;
    vec3 shifted = hueShift(source.rgb, hueAngle);
    vec3 relief = shifted * (0.28 + diffuse * 1.35) +
        specular * mix(vec3(1.0), shifted, 0.35);
    float subjectMask = smoothstep(0.002, 0.08, height);
    vec3 background = source.rgb * (0.3 + 0.2 * sin(localTime + uv.y * 8.0));
    return vec4(mix(background, relief, subjectMask), source.a);
}`,
  ],
]);
SHADER_CODE_REPAIRS.set(
  'timeline-c42e2cd3-3289-490d-846c-fc2eceeeb1d0',
  SHADER_CODE_REPAIRS.get('timeline-afe5e54f-e396-4a8d-b8f5-88f2d34ab85f'),
);

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeCode(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function sortSerializableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortSerializableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortSerializableValue(value[key])]),
    );
  }

  return value;
}

function stableSerialize(value) {
  return JSON.stringify(sortSerializableValue(value));
}

function sanitizeUniformValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) && value.length === 3) {
    const tuple = value.map(Number);
    return tuple.every(Number.isFinite) ? tuple : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (/^(?:true|false)$/i.test(normalized)) {
      return normalized.toLowerCase() === 'true';
    }

    const tuple = normalized
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (tuple.length === 3 && tuple.every(Number.isFinite)) {
      return tuple;
    }

    const number = Number(normalized);
    return normalized && Number.isFinite(number) ? number : undefined;
  }

  return undefined;
}

function sanitizeUniformValues(shader) {
  const source = shader.uniformValues ?? shader.sliderValues ?? {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, value]) => [key, sanitizeUniformValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function getPresetSignature(shader) {
  return [
    normalizeName(shader.name),
    normalizeCode(shader.code),
    stableSerialize(sanitizeUniformValues(shader)),
  ].join('\u0000');
}

function loadExistingPresetIds() {
  const ids = new Set();
  for (const relativeRoot of presetRoots) {
    const root = path.join(projectRoot, relativeRoot);
    if (!fs.existsSync(root)) {
      continue;
    }

    for (const filename of fs.readdirSync(root)) {
      if (!filename.endsWith('.ts')) {
        continue;
      }

      const source = fs.readFileSync(path.join(root, filename), 'utf8');
      for (const match of source.matchAll(
        /(?:^|[{\s,])["']?id["']?\s*:\s*["']([^"']+)["']/gm,
      )) {
        ids.add(match[1]);
      }
    }
  }

  return ids;
}

const SCULPTURE_KEYWORDS = [
  'statue',
  'sculpt',
  'depth',
  'surface',
  'relief',
  'emboss',
  'bump',
  'light',
  'shadow',
  'eye',
  'creature',
  'entity',
  'alien',
  'demon',
  'devil',
  'horn',
  'face',
  'skin',
  'leopard',
  'plant',
  'vine',
  'tentacle',
  'organic',
  'liquid',
  'fluid',
  'water',
  'mercury',
  'metallic',
  'reflective',
  'morph',
];
const STAGE_KEYWORDS = [
  'grid',
  'dot',
  'stripe',
  'tunnel',
  'hall',
  'room',
  'wave',
  'disco',
  'truchet',
  'clone',
  'fractal',
  'psy',
  'psychedelic',
  'psytrance',
  'strobe',
  'hex',
  'triangle',
  'square',
  'mandala',
  'kaleido',
  'radial',
  'zoom',
  'ray',
  'automata',
  'voronoi',
  'maze',
  'line',
  'band',
];
const DRAWING_KEYWORDS = [
  'drawing',
  'ink',
  'paper',
  'crosshatch',
  'pencil',
  'sketch',
  'crayon',
];

function keywordScore(text, keywords) {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function classifyTemplates(shader) {
  const text = `${shader.name ?? ''} ${parseShaderName(shader.code)}`.toLowerCase();
  const sculptureScore = keywordScore(text, SCULPTURE_KEYWORDS);
  const stageScore = keywordScore(text, STAGE_KEYWORDS);
  const drawingScore = keywordScore(text, DRAWING_KEYWORDS);

  if (drawingScore >= 2 && sculptureScore === 0) {
    return stageScore > 0 ? ['drawing', 'stage'] : ['drawing'];
  }
  if (sculptureScore >= 3 && stageScore === 0) {
    return ['sculpture'];
  }
  if (stageScore >= 3 && sculptureScore === 0) {
    return ['stage'];
  }
  if (sculptureScore > 0 && stageScore > 0) {
    return ['sculpture', 'stage'];
  }
  if (sculptureScore > stageScore) {
    return ['sculpture'];
  }
  if (stageScore > sculptureScore) {
    return ['stage'];
  }

  return ['sculpture', 'stage'];
}

function classifyGroup(shader) {
  const text = `${shader.name ?? ''} ${parseShaderName(shader.code)}`.toLowerCase();
  if (/\b(?:eyes?|entity|alien|creature|demon|devil|horns?|face)\b/.test(text)) {
    return 'Eyes & Entities';
  }
  if (/\b(?:dots?|grid|automata|truchet|hex(?:agon)?s?|pixels?|stripes?|bands?)\b/.test(text)) {
    return 'Dots & Grids';
  }
  if (/\b(?:fractal|julia|dmt|psy|psychedelic|psytrance)\b/.test(text)) {
    return 'Fractals';
  }
  if (/\b(?:liquid|fluid|morph(?:ed|ing)?|vines?|plants?|water|lava|organic|tentacles?)\b/.test(text)) {
    return 'Organic Motion';
  }
  if (/\b(?:lights?|lighting|glow(?:ing)?|illuminated|neon|metallic|reflective|chrome|disco)\b/.test(text)) {
    return 'Lights';
  }
  if (/\b(?:triangles?|squares?|tunnel|room|hall|rays?|clones?|mandala|radial|zoom(?:ing)?)\b/.test(text)) {
    return 'Geometry';
  }
  if (/\b(?:masked?|depth|shadows?|threshold|negative|difference|contrast(?:ed)?)\b/.test(text)) {
    return 'Masks & Contrast';
  }
  return 'Experimental';
}

function parseShaderName(code) {
  const match = /^\/\/\s*NAME:\s*(.+)$/im.exec(code ?? '');
  return match?.[1]?.trim() || 'Untitled Shader';
}

function emitPreset(preset) {
  const uniformValues = sanitizeUniformValues(preset);
  const uniformBlock = Object.keys(uniformValues).length
    ? `,\n    uniformValues: ${JSON.stringify(uniformValues, null, 2).replace(/\n/g, '\n    ')}`
    : '';

  return `  {
    id: ${JSON.stringify(preset.id)},
    name: ${JSON.stringify(preset.displayName)},
    template: ${JSON.stringify(preset.templates[0])},
    templates: ${JSON.stringify(preset.templates)},
    group: ${JSON.stringify(preset.group)},
    description: ${JSON.stringify(preset.description)},
    code: ${JSON.stringify(normalizeCode(preset.code))}${uniformBlock},
  }`;
}

const bundle = JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8'));
if (bundle.format !== 'mapshroom-shader-bundle' || !Array.isArray(bundle.shaders)) {
  throw new Error('The input is not a Mapshroom shader bundle.');
}
bundle.shaders = bundle.shaders.map((shader) => ({
  ...shader,
  code: SHADER_CODE_REPAIRS.get(shader.id) ?? shader.code,
}));

const existingIds = loadExistingPresetIds();
const existingBundleShaders = bundle.shaders.filter((shader) => existingIds.has(shader.id));
const existingSignatures = new Set(existingBundleShaders.map(getPresetSignature));
const missingById = bundle.shaders.filter(
  (shader) => shader?.id && shader?.code?.trim() && !existingIds.has(shader.id),
);
const missingDistinctPresets = missingById.filter(
  (shader) => !existingSignatures.has(getPresetSignature(shader)),
);
const uniqueMissingPresets = [
  ...missingDistinctPresets
    .reduce((presets, shader) => {
      const signature = getPresetSignature(shader);
      if (!presets.has(signature)) {
        presets.set(signature, shader);
      }
      return presets;
    }, new Map())
    .values(),
];

const existingNameCounts = existingBundleShaders.reduce((counts, shader) => {
  const name = normalizeName(shader.name || parseShaderName(shader.code));
  counts.set(name, (counts.get(name) ?? 0) + 1);
  return counts;
}, new Map());
const missingNameCounts = uniqueMissingPresets.reduce((counts, shader) => {
  const name = normalizeName(shader.name || parseShaderName(shader.code));
  counts.set(name, (counts.get(name) ?? 0) + 1);
  return counts;
}, new Map());
const emittedNameCounts = new Map();

const importedPresets = uniqueMissingPresets.map((shader) => {
  const sourceName = shader.name?.trim() || parseShaderName(shader.code);
  const normalizedName = normalizeName(sourceName);
  const existingNameCount = existingNameCounts.get(normalizedName) ?? 0;
  const missingNameCount = missingNameCounts.get(normalizedName) ?? 1;
  const emittedIndex = (emittedNameCounts.get(normalizedName) ?? 0) + 1;
  emittedNameCounts.set(normalizedName, emittedIndex);
  const variantNumber = (existingNameCount > 0 ? 1 : 0) + emittedIndex;
  const displayName =
    existingNameCount === 0 && missingNameCount === 1
      ? sourceName
      : existingNameCount === 0 && emittedIndex === 1
        ? sourceName
        : `${sourceName} (Export Variant ${variantNumber})`;
  const templates = classifyTemplates(shader);

  return {
    ...shader,
    displayName,
    templates,
    group: classifyGroup(shader),
    description: `Imported from ${bundle.project?.name?.trim() || 'shader bundle'} for ${templates
      .map((template) => template[0].toUpperCase() + template.slice(1))
      .join(' and ')} use.`,
  };
});

const generatedSource = `import type { ShaderPresetDefinition } from './types';

/**
 * Distinct presets imported from the "${bundle.project?.name?.trim() || 'shader bundle'}"
 * shader bundle. A preset can opt into multiple library tabs through \`templates\`.
 *
 * Generated by scripts/import-shader-bundle-presets.mjs.
 */
export const importedShaderBundlePresetList: ShaderPresetDefinition[] = [
${importedPresets.map(emitPreset).join(',\n')}
];
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generatedSource);

const placementCounts = importedPresets.reduce(
  (counts, preset) => {
    for (const template of preset.templates) {
      counts[template] += 1;
    }
    if (preset.templates.length > 1) {
      counts.multiTemplate += 1;
    }
    return counts;
  },
  { sculpture: 0, stage: 0, drawing: 0, multiTemplate: 0 },
);
const summary = {
  source: path.resolve(sourcePath),
  bundleShaders: bundle.shaders.length,
  existingPresetIds: existingIds.size,
  missingIds: missingById.length,
  importedDistinctPresets: importedPresets.length,
  skippedExactPresetDuplicates: missingById.length - missingDistinctPresets.length,
  skippedRepeatedMissingPresets: missingDistinctPresets.length - importedPresets.length,
  placementCounts,
  presets: importedPresets.map((preset) => ({
    id: preset.id,
    name: preset.displayName,
    sourceName: preset.name,
    templates: preset.templates,
    group: preset.group,
  })),
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ...summary,
      presets: `${summary.presets.length} entries written to ${summaryPath}`,
    },
    null,
    2,
  ),
);
