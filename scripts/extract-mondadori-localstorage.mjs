import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const src = path.join(
  os.homedir(),
  'AppData/Local/Google/Chrome/User Data/Profile 1/Local Storage/leveldb',
);
const copyDir = path.join(process.cwd(), '.tmp-mondadori-ls', 'leveldb-copy');
const outDir = path.join(process.cwd(), '.tmp-mondadori-ls');
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(copyDir, { recursive: true, force: true });
fs.mkdirSync(copyDir, { recursive: true });

for (const f of fs.readdirSync(src)) {
  try {
    fs.copyFileSync(path.join(src, f), path.join(copyDir, f));
  } catch (err) {
    console.warn('copy skip', f, String(err.message || err));
  }
}

try {
  execSync('npm install classic-level --no-save --no-fund --no-audit', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (err) {
  console.error('classic-level install failed', err);
  process.exit(1);
}

const { ClassicLevel } = require('classic-level');

function decodeMaybeUtf16(value) {
  if (typeof value === 'string') return value;
  if (!Buffer.isBuffer(value)) return String(value);
  // Chromium often stores strings as UTF-16LE
  if (value.length >= 2 && value.length % 2 === 0) {
    const asUtf16 = value.toString('utf16le');
    if (!asUtf16.includes('\u0000') && /[\x20-\x7e]/.test(asUtf16.slice(0, 20))) {
      return asUtf16;
    }
  }
  return value.toString('utf8');
}

function keyToString(key) {
  if (typeof key === 'string') return key;
  if (!Buffer.isBuffer(key)) return String(key);
  // Strip Chromium localStorage prefix: META: / _origin\0\x01
  const utf8 = key.toString('utf8');
  if (utf8.includes('mapshroom')) return utf8;
  const utf16 = key.toString('utf16le');
  if (utf16.includes('mapshroom')) return utf16;
  return utf8;
}

const db = new ClassicLevel(copyDir, {
  keyEncoding: 'buffer',
  valueEncoding: 'buffer',
  createIfMissing: false,
  errorIfExists: false,
});

const entries = [];
for await (const [keyBuf, valueBuf] of db.iterator()) {
  const keyStr = keyToString(keyBuf);
  if (!keyStr.includes('mapshroom-v3')) continue;
  const valueStr = decodeMaybeUtf16(valueBuf);
  entries.push({
    keyRaw: keyBuf.toString('hex').slice(0, 80),
    key: keyStr,
    valuePreview: valueStr.slice(0, 120),
    value: valueStr,
  });
}
await db.close();

fs.writeFileSync(path.join(outDir, 'raw-entries.json'), JSON.stringify(
  entries.map((e) => ({ key: e.key, preview: e.valuePreview, length: e.value.length })),
  null,
  2,
));
console.log('mapshroom entries:', entries.length);
for (const e of entries) {
  console.log('-', e.key.replace(/[^\x20-\x7e]/g, '?'), 'len=', e.value.length);
}

function pickLatestJson(keySuffix) {
  const matches = entries.filter((e) => e.key.includes(keySuffix));
  const parsed = [];
  for (const m of matches) {
    try {
      parsed.push(JSON.parse(m.value));
    } catch {
      // try trimming chrome metadata prefix bytes that leaked into string
      const startObj = m.value.indexOf('{');
      const startArr = m.value.indexOf('[');
      const start =
        startObj >= 0 && startArr >= 0
          ? Math.min(startObj, startArr)
          : Math.max(startObj, startArr);
      if (start >= 0) {
        try {
          parsed.push(JSON.parse(m.value.slice(start)));
        } catch {
          // ignore
        }
      }
    }
  }
  return parsed;
}

const libraries = pickLatestJson('mapshroom-v3:projects').filter(Array.isArray);
fs.writeFileSync(path.join(outDir, 'projects-library.json'), JSON.stringify(libraries, null, 2));
console.log('\nlibraries:', libraries.length);
const sessionIds = new Set();
for (const lib of libraries) {
  for (const e of lib) {
    console.log(`  ${e.sessionId} | ${e.name} | ${e.updatedAt}`);
    sessionIds.add(e.sessionId);
  }
}
for (const e of entries) {
  const m = e.key.match(/mapshroom-v3:project:([0-9a-zA-Z_-]+)/);
  if (m) sessionIds.add(m[1]);
}

const summaries = [];
for (const sessionId of sessionIds) {
  const docs = pickLatestJson(`mapshroom-v3:project:${sessionId}`)
    .filter((d) => d && typeof d === 'object' && d.studio)
    .sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length);
  if (!docs.length) {
    console.log('no project doc', sessionId);
    continue;
  }
  const project = docs[0];
  const outPath = path.join(outDir, `project-${sessionId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(project, null, 2));
  const steps = project.timeline?.stub?.shaderSequence?.steps ?? [];
  const usedIds = [...new Set(
    [project.studio?.activeShaderId, ...steps.map((s) => s.shaderId)].filter(Boolean),
  )];
  const saved = project.studio?.savedShaders ?? [];
  const usedFromSaved = saved.filter((s) => usedIds.includes(s.id));
  const summary = {
    sessionId,
    name: project.name,
    activeShaderId: project.studio?.activeShaderId,
    timelineSteps: steps.length,
    savedCount: saved.length,
    usedIds,
    usedFromSaved: usedFromSaved.map((s) => ({
      id: s.id,
      name: s.name,
      codeLength: s.code?.length ?? 0,
    })),
    missingFromSaved: usedIds.filter((id) => !saved.some((s) => s.id === id)),
    file: outPath,
    bytes: fs.statSync(outPath).size,
  };
  summaries.push(summary);
  console.log(
    `\n${summary.name}: steps=${summary.timelineSteps} saved=${summary.savedCount} used=${summary.usedFromSaved.length} missing=${summary.missingFromSaved.length}`,
  );
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summaries, null, 2));
console.log('\nWrote', path.join(outDir, 'summary.json'));
