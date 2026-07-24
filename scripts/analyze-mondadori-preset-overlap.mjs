import fs from 'node:fs';

const project = JSON.parse(
  fs.readFileSync(
    '.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json',
    'utf8',
  ),
);
const steps = project.timeline.stub.shaderSequence.steps;
const used = new Set(steps.map((s) => s.shaderId));
used.add(project.studio.activeShaderId);

const importedPath = 'src/shaders/presets/sculpture/importedFromProjects.ts';
const src = fs.readFileSync(importedPath, 'utf8');

// Count preset ids in imported file
const idMatches = [...src.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
console.log('imported presets', idMatches.length);
console.log('mondadori used', used.size);
const unusedImported = idMatches.filter((id) => !used.has(id));
const usedImported = idMatches.filter((id) => used.has(id));
console.log('imported used by mondadori timeline', usedImported.length);
console.log('imported NOT in mondadori timeline', unusedImported.length);

// Also check how many mondadori ids are outside imported (in base catalog)
const catalog = [
  'src/shaders/presets/sculpture/index.ts',
  'src/shaders/presets/stage/onlineRecovered.ts',
  'src/shaders/presets/stage/index.ts',
  'src/shaders/presets/drawing/index.ts',
]
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const inBase = [...used].filter(
  (id) =>
    !idMatches.includes(id) &&
    (catalog.includes(JSON.stringify(id)) || catalog.includes(`'${id}'`)),
);
console.log('mondadori ids in base (non-imported) catalog', inBase.length);
