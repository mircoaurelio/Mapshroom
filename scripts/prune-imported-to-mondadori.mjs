import fs from 'node:fs';

const project = JSON.parse(
  fs.readFileSync(
    '.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json',
    'utf8',
  ),
);
const used = new Set(
  project.timeline.stub.shaderSequence.steps.map((s) => s.shaderId),
);
used.add(project.studio.activeShaderId);

const path = 'src/shaders/presets/sculpture/importedFromProjects.ts';
const src = fs.readFileSync(path, 'utf8');

// Parse the array of preset objects by matching top-level object blocks with id fields.
// importedFromProjects.ts exports: export const importedSculpturePresetList: SavedShader[] = [ ... ];
const start = src.indexOf('[');
const end = src.lastIndexOf(']');
if (start < 0 || end < 0) {
  throw new Error('Could not find preset array brackets');
}

const header = src.slice(0, start + 1);
const footer = src.slice(end);
const body = src.slice(start + 1, end);

// Split on objects that look like preset entries (start with optional whitespace + {)
const objects = [];
let depth = 0;
let current = '';
let inString = false;
let escape = false;

for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (inString) {
    current += ch;
    if (escape) {
      escape = false;
    } else if (ch === '\\') {
      escape = true;
    } else if (ch === '"') {
      inString = false;
    }
    continue;
  }
  if (ch === '"') {
    inString = true;
    current += ch;
    continue;
  }
  if (ch === '{') {
    if (depth === 0) current = '';
    depth += 1;
    current += ch;
    continue;
  }
  if (ch === '}') {
    current += ch;
    depth -= 1;
    if (depth === 0) {
      objects.push(current);
      current = '';
    }
    continue;
  }
  if (depth > 0) current += ch;
}

const kept = [];
const dropped = [];
for (const obj of objects) {
  const idMatch = obj.match(/\bid:\s*"([^"]+)"/);
  const id = idMatch?.[1];
  if (id && used.has(id)) {
    kept.push(obj);
  } else if (id) {
    dropped.push(id);
  }
}

const out =
  header +
  '\n' +
  kept.map((obj) => obj).join(',\n') +
  (kept.length ? '\n' : '') +
  footer;

fs.writeFileSync(path, out);
console.log('kept', kept.length, 'dropped', dropped.length);
console.log('dropped sample', dropped.slice(0, 10));

// Verify all used ids still resolve somewhere
const catalog = [
  path,
  'src/shaders/presets/sculpture/index.ts',
  'src/shaders/presets/stage/onlineRecovered.ts',
  'src/shaders/presets/stage/index.ts',
  'src/shaders/presets/drawing/index.ts',
]
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const missing = [...used].filter(
  (id) => !catalog.includes(JSON.stringify(id)) && !catalog.includes(`'${id}'`),
);
console.log('mondadori ids still missing after prune', missing.length);
if (missing.length) console.log(missing);
