import fs from 'node:fs';

const project = JSON.parse(
  fs.readFileSync(
    '.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json',
    'utf8',
  ),
);

const steps = project.timeline?.stub?.shaderSequence?.steps ?? [];
const usedIds = new Set(
  [project.studio?.activeShaderId, ...steps.map((s) => s.shaderId)].filter(Boolean),
);
const byId = new Map((project.studio?.savedShaders ?? []).map((s) => [s.id, s]));

// Existing non-imported preset ids (base catalog).
function loadBasePresetIds() {
  const ids = new Set();
  const files = [
    'src/shaders/presets/sculpture/index.ts',
    'src/shaders/presets/stage/onlineRecovered.ts',
    'src/shaders/presets/stage/index.ts',
    'src/shaders/presets/drawing/index.ts',
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:^|[{\s,])["']?id["']?\s*:\s*["']([^"']+)["']/gm)) {
      ids.add(m[1]);
    }
  }
  return ids;
}

const baseIds = loadBasePresetIds();

function sanitizeUniforms(values) {
  const out = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    out[key] = value === null ? 0 : value;
  }
  return out;
}

function emitPreset(preset) {
  return `  {
    id: ${JSON.stringify(preset.id)},
    name: ${JSON.stringify(preset.name)},
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: ${JSON.stringify(preset.code)},
    uniformValues: ${JSON.stringify(preset.uniformValues, null, 6).replace(/^/gm, '    ').trimStart()}
  }`;
}

const presets = [];
for (const id of usedIds) {
  if (baseIds.has(id)) continue;
  const shader = byId.get(id);
  if (!shader?.code?.trim()) {
    console.warn('skip (no code, not in base catalog):', id);
    continue;
  }
  presets.push({
    id: shader.id,
    name: shader.name || 'Untitled Shader',
    code: shader.code,
    uniformValues: sanitizeUniforms(shader.uniformValues),
  });
}

presets.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

const out = `import type { ShaderPresetDefinition } from '../types';

/**
 * Mondadori Profile 1 Statue timeline shaders that were not already present
 * in the default preset catalogs. Exposed as sculpture presets.
 */
export const importedSculpturePresetList: ShaderPresetDefinition[] = [
${presets.map(emitPreset).join(',\n')}
];
`;

fs.writeFileSync('src/shaders/presets/sculpture/importedFromProjects.ts', out);

const catalog = [
  'src/shaders/presets/sculpture/importedFromProjects.ts',
  'src/shaders/presets/sculpture/index.ts',
  'src/shaders/presets/stage/onlineRecovered.ts',
  'src/shaders/presets/stage/index.ts',
  'src/shaders/presets/drawing/index.ts',
]
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const missing = [...usedIds].filter(
  (id) => !catalog.includes(JSON.stringify(id)) && !catalog.includes(`'${id}'`),
);

console.log('wrote importedFromProjects.ts');
console.log('mondadori used', usedIds.size);
console.log('imported (mondadori-only extras)', presets.length);
console.log('still missing', missing.length);
if (missing.length) console.log(missing);
