import fs from 'node:fs';

const text = fs.readFileSync('src/shaders/presets/stage/onlineRecovered.ts', 'utf8');
const ids = [...text.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((m) => m[1]);
console.log('onlineRecovered ids', ids.length);

const missing = JSON.parse(fs.readFileSync('.tmp-shader-import/missing-summary.json', 'utf8'));
const overlap = missing.filter((m) => ids.includes(m.id));
console.log('missing that ARE in onlineRecovered', overlap.length);

const share = JSON.parse(fs.readFileSync('.tmp-shader-import/share-payload.json', 'utf8'));
const shareIds = share.h.map((h) => h.i);
console.log('share in onlineRecovered', shareIds.filter((id) => ids.includes(id)).length, '/', shareIds.length);

// Why did loader miss them?
const loaderText = fs.readFileSync('scripts/import-missing-sculpture-presets.mjs', 'utf8');
const roots = ['src/shaders/presets/sculpture', 'src/shaders/presets/stage', 'src/shaders/presets/drawing'];
const all = new Set();
for (const root of roots) {
  for (const file of fs.readdirSync(root)) {
    if (!file.endsWith('.ts')) continue;
    const t = fs.readFileSync(`${root}/${file}`, 'utf8');
    for (const m of t.matchAll(/\bid:\s*["']([^"']+)["']/g)) all.add(m[1]);
    console.log(root + '/' + file, [...t.matchAll(/\bid:\s*["']([^"']+)["']/g)].length);
  }
}
console.log('total scanned', all.size);
