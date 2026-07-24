import fs from 'node:fs';

function sanitizeUniforms(value) {
  if (value == null) return undefined;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((item) => sanitizeUniforms(item))
      .filter((item) => item !== undefined);
    return next.length ? next : undefined;
  }
  if (typeof value === 'object') {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeUniforms(entry);
      if (sanitized !== undefined && sanitized !== null) {
        next[key] = sanitized;
      }
    }
    return Object.keys(next).length ? next : undefined;
  }
  return undefined;
}

const file = 'src/shaders/presets/sculpture/importedFromProjects.ts';
let text = fs.readFileSync(file, 'utf8');

// Quick fix: remove `"key": null` entries inside uniformValues blocks.
text = text.replace(/^\s*"[^"]+": null,?\r?\n/gm, '');
// Clean trailing commas before closing braces that may result
text = text.replace(/,(\s*[}\]])/g, '$1');
fs.writeFileSync(file, text);
console.log('sanitized null uniform values');
