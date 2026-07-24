import fs from 'node:fs';

const src = fs.readFileSync('src/lib/bundledProjects.ts', 'utf8');
const disabledTrue = (src.match(/"disabled": true/g) || []).length;
const disabledFalse = (src.match(/"disabled": false/g) || []).length;
const imported = fs.readFileSync(
  'src/shaders/presets/sculpture/importedFromProjects.ts',
  'utf8',
);
const importedIds = (imported.match(/\bid:\s*"/g) || []).length;
console.log({ disabledTrue, disabledFalse, importedIds });
