import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const serviceWorkerPath = resolve('dist/sw.js');
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
const entries = [...serviceWorker.matchAll(/\{url:"([^"]+)",revision:(null|"[^"]+")\}/g)].map(
  (match) => ({
    url: match[1],
    revision: match[2],
  }),
);

if (entries.length === 0) {
  throw new Error('No Workbox precache entries were found in dist/sw.js.');
}

const entriesByUrl = new Map();
for (const entry of entries) {
  const existing = entriesByUrl.get(entry.url) ?? [];
  existing.push(entry.revision);
  entriesByUrl.set(entry.url, existing);
}

const duplicateEntries = [...entriesByUrl.entries()].filter(
  ([_url, revisions]) => revisions.length > 1,
);

if (duplicateEntries.length > 0) {
  const details = duplicateEntries
    .map(([url, revisions]) => `${url} (${revisions.join(', ')})`)
    .join('\n');
  throw new Error(`Conflicting or duplicate PWA precache entries found:\n${details}`);
}

const precachedUrls = new Set(entries.map((entry) => entry.url));
const requiredExactUrls = [
  'index.html',
  'manifest.webmanifest',
  'offline-ready.json',
];
const missingExactUrls = requiredExactUrls.filter((url) => !precachedUrls.has(url));

const requiredPatterns = [
  ['main application script', /^assets\/main-.*\.js$/],
  ['workspace route', /^assets\/WorkspaceRoute-.*\.js$/],
  ['WASM runtime', /\.wasm$/],
  ['OBJ tool asset', /\.obj$/],
  ['tutorial video', /\.mp4$/],
  ['onboarding image', /\.webp$/],
];
const missingPatterns = requiredPatterns
  .filter(([_label, pattern]) => !entries.some((entry) => pattern.test(entry.url)))
  .map(([label]) => label);

if (missingExactUrls.length > 0 || missingPatterns.length > 0) {
  throw new Error(
    [
      missingExactUrls.length > 0
        ? `Missing required URLs: ${missingExactUrls.join(', ')}`
        : '',
      missingPatterns.length > 0
        ? `Missing required asset groups: ${missingPatterns.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

if (!serviceWorker.includes('createHandlerBoundToURL("index.html")')) {
  throw new Error('The service worker does not provide the index.html navigation fallback.');
}

console.log(`PWA precache verified: ${entries.length} unique entries.`);
