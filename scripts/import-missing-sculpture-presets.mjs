import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { ClassicLevel } = require('classic-level');

const outDir = path.join(process.cwd(), '.tmp-shader-import');
fs.mkdirSync(outDir, { recursive: true });

function parseShaderName(code) {
  const match = /^\/\/\s*NAME:\s*(.+)$/im.exec(code || '');
  return match?.[1]?.trim() || 'Untitled Shader';
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const paddingLength = (4 - (padded.length % 4 || 4)) % 4;
  return Buffer.from(`${padded}${'='.repeat(paddingLength)}`, 'base64');
}

function loadExistingPresetIds() {
  const ids = new Set();
  const roots = [
    'src/shaders/presets/sculpture',
    'src/shaders/presets/stage',
    'src/shaders/presets/drawing',
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const file of fs.readdirSync(root)) {
      if (!file.endsWith('.ts')) continue;
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      for (const m of text.matchAll(/(?:^|[{\s,])["']?id["']?\s*:\s*["']([^"']+)["']/gm)) {
        ids.add(m[1]);
      }
    }
  }
  return ids;
}

function collectFromProject(project, source) {
  const steps = project.timeline?.stub?.shaderSequence?.steps ?? [];
  const usedIds = new Set(
    [project.studio?.activeShaderId, ...steps.map((s) => s.shaderId)].filter(Boolean),
  );
  const byId = new Map((project.studio?.savedShaders ?? []).map((s) => [s.id, s]));
  const collected = [];
  for (const id of usedIds) {
    const shader = byId.get(id);
    if (!shader?.code?.trim()) continue;
    collected.push({
      id: shader.id,
      name: shader.name || parseShaderName(shader.code),
      code: shader.code,
      uniformValues: shader.uniformValues ?? {},
      source,
    });
  }
  // also keep non-temporary library shaders with code
  for (const shader of project.studio?.savedShaders ?? []) {
    if (!shader?.code?.trim()) continue;
    if (shader.isTemporary && !usedIds.has(shader.id)) continue;
    if (collected.some((c) => c.id === shader.id)) continue;
    collected.push({
      id: shader.id,
      name: shader.name || parseShaderName(shader.code),
      code: shader.code,
      uniformValues: shader.uniformValues ?? {},
      source: `${source}:library`,
    });
  }
  return { project, usedIds: [...usedIds], collected, steps };
}

function decodeUtf16ChromeValue(buf) {
  // Values may start with a padding null before UTF-16LE JSON.
  let offset = 0;
  if (buf.length >= 3 && buf[0] === 0 && buf[1] === 0x7b && buf[2] === 0) {
    offset = 1;
  } else if (buf.length >= 2 && buf[0] === 1) {
    // classic prefix 0x01 then utf16 or utf8
    offset = 1;
    if (buf[1] === 0 && buf[2] === 0x7b) offset = 2;
  }
  let text = buf.subarray(offset).toString('utf16le');
  if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
    text = buf.subarray(buf[0] === 1 ? 1 : 0).toString('utf8');
  }
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  const start =
    startObj >= 0 && startArr >= 0
      ? Math.min(startObj, startArr)
      : Math.max(startObj, startArr);
  if (start < 0) throw new Error('No JSON start');
  return JSON.parse(text.slice(start));
}

async function loadGmailLargeProject() {
  const db = new ClassicLevel('.tmp-gmail-ls/leveldb-copy', {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer',
    createIfMissing: false,
  });
  try {
    for await (const [k, v] of db.iterator()) {
      const key = k.toString('utf8');
      if (!key.includes('project:902e74dc')) continue;
      if (key.includes('midi-output') || key.includes('shader-sliders')) continue;
      const doc = decodeUtf16ChromeValue(v);
      fs.writeFileSync(
        path.join(outDir, 'gmail-902e74dc.json'),
        JSON.stringify(doc),
      );
      return doc;
    }
  } finally {
    await db.close();
  }
  return null;
}

function loadShareFromTranscript() {
  const transcript = path.join(
    process.env.USERPROFILE,
    '.cursor/projects/c-Progetti-personal-mapshroom-MapshroomV3/agent-transcripts/071dde61-513c-4e65-8e02-32bf8ebad45d/071dde61-513c-4e65-8e02-32bf8ebad45d.jsonl',
  );
  const lines = fs.readFileSync(transcript, 'utf8').split(/\n/).filter(Boolean);
  for (const line of lines.reverse()) {
    if (!line.includes('share=H4sI')) continue;
    const obj = JSON.parse(line);
    const text = obj?.message?.content?.map((c) => c.text).join('\n') ?? '';
    const m = /share=([A-Za-z0-9\-_]+)/.exec(text);
    const sha = /sha=([a-f0-9]+)/.exec(text);
    if (!m) continue;
    const bytes = base64UrlToBytes(m[1]);
    const jsonBytes = zlib.gunzipSync(bytes);
    if (sha) {
      const actual = createHash('sha256').update(jsonBytes).digest('hex');
      if (actual !== sha[1]) {
        throw new Error(`Share SHA mismatch: ${actual} != ${sha[1]}`);
      }
    }
    const payload = JSON.parse(jsonBytes.toString('utf8'));
    fs.writeFileSync(path.join(outDir, 'share-payload.json'), JSON.stringify(payload));
    return payload;
  }
  throw new Error('Share payload not found in transcript');
}

function shadersFromShare(payload) {
  return (payload.h ?? []).map((item) => ({
    id: item.i,
    name: parseShaderName(item.c),
    code: item.c,
    uniformValues: item.u ?? {},
    source: 'share',
  }));
}

function escapeTsString(value) {
  return JSON.stringify(value);
}

function toPresetTs(shader) {
  const name = shader.name || parseShaderName(shader.code);
  const description = `Imported from shared/user project as a sculpture preset.`;
  const uniforms = sanitizeUniformValues(shader.uniformValues);
  const uniformsBlock =
    uniforms && Object.keys(uniforms).length
      ? `,\n    uniformValues: ${JSON.stringify(uniforms, null, 6).replace(/\n/g, '\n    ')}`
      : '';
  return `  {
    id: ${escapeTsString(shader.id)},
    name: ${escapeTsString(name)},
    template: "sculpture",
    group: "Imported",
    description: ${escapeTsString(description)},
    code: ${escapeTsString(shader.code)}${uniformsBlock},
  }`;
}

function sanitizeUniformValues(value) {
  if (value == null) return undefined;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((item) => sanitizeUniformValues(item))
      .filter((item) => item !== undefined && item !== null);
    return next.length ? next : undefined;
  }
  if (typeof value === 'object') {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeUniformValues(entry);
      if (sanitized !== undefined && sanitized !== null) next[key] = sanitized;
    }
    return Object.keys(next).length ? next : undefined;
  }
  return undefined;
}

function mergeUnique(shaders) {
  const byId = new Map();
  for (const shader of shaders) {
    if (!shader?.id || !shader?.code?.trim()) continue;
    const prev = byId.get(shader.id);
    if (!prev || (shader.code.length > prev.code.length)) {
      byId.set(shader.id, shader);
    }
  }
  return [...byId.values()];
}

const existingIds = loadExistingPresetIds();
console.log('existing presets', existingIds.size);

const share = loadShareFromTranscript();
console.log('share shaders', share.h?.length, 'steps', share.t?.s?.length, 'name', share.n);

const all = [];
all.push(...shadersFromShare(share));

const mondadoriPath =
  '.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json';
if (fs.existsSync(mondadoriPath)) {
  const project = JSON.parse(fs.readFileSync(mondadoriPath, 'utf8'));
  const { collected } = collectFromProject(project, 'mondadori-mapshroom.dev');
  all.push(...collected);
  console.log('mondadori collected', collected.length);
}

for (const file of [
  '.tmp-gmail-ls/project-27a1a424-8f8f-45b2-b2d6-9cf1d4beeb16.json',
  '.tmp-gmail-ls/project-7cdf0070-2372-4b6e-b8ea-60f806c2644a.json',
  '.tmp-gmail-ls/project-bundled-statue-project.json',
]) {
  if (!fs.existsSync(file)) continue;
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { collected } = collectFromProject(project, `gmail:${path.basename(file)}`);
  all.push(...collected);
  console.log(file, 'collected', collected.length);
}

const gmailLarge = await loadGmailLargeProject();
if (gmailLarge) {
  const { collected } = collectFromProject(gmailLarge, 'gmail:902e74dc');
  all.push(...collected);
  console.log('gmail large collected', collected.length, 'steps', gmailLarge.timeline?.stub?.shaderSequence?.steps?.length);
}

const merged = mergeUnique(all);
const missing = merged.filter((s) => !existingIds.has(s.id));
const already = merged.filter((s) => existingIds.has(s.id));

console.log('merged unique with code', merged.length);
console.log('already in presets', already.length);
console.log('missing to add as sculpture', missing.length);

fs.writeFileSync(
  path.join(outDir, 'missing-summary.json'),
  JSON.stringify(
    missing.map((s) => ({ id: s.id, name: s.name, codeLen: s.code.length, source: s.source })),
    null,
    2,
  ),
);

const generatedPath = path.join(
  process.cwd(),
  'src/shaders/presets/sculpture/importedFromProjects.ts',
);
const fileBody = `import type { ShaderPresetDefinition } from '../types';

/**
 * Shaders recovered from share links / browser profiles that were not already
 * present in the default preset catalogs. Exposed as sculpture presets.
 */
export const importedSculpturePresetList: ShaderPresetDefinition[] = [
${missing.map(toPresetTs).join(',\n')}
];
`;
fs.writeFileSync(generatedPath, fileBody);
console.log('wrote', generatedPath, 'bytes', fs.statSync(generatedPath).size);

// Share timeline snapshot for bundled project update
fs.writeFileSync(
  path.join(outDir, 'share-timeline.json'),
  JSON.stringify(
    {
      name: share.n ?? 'Shared Project',
      activeShaderId: share.a,
      durationSeconds: share.t?.d,
      mode: share.t?.m,
      editorView: share.t?.ev,
      stagePreviewMode: share.t?.pv,
      focusedStepId: share.t?.f,
      pinnedStepId: share.t?.p,
      singleStepLoopEnabled: Boolean(share.t?.l),
      randomChoiceEnabled: Boolean(share.t?.r),
      sharedTransitionEnabled: Boolean(share.t?.z),
      sharedTransitionEffect: share.t?.se,
      sharedTransitionDurationSeconds: share.t?.sd,
      sharedSectionDurationSeconds: share.t?.ss,
      steps: share.t?.s ?? [],
      shaderIds: (share.h ?? []).map((h) => h.i),
    },
    null,
    2,
  ),
);

console.log('done');
