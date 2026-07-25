import { mkdir, readdir, rename, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distDirectory = resolve(projectRoot, 'dist');
const clientDirectory = resolve(distDirectory, 'client');
const serverDirectory = resolve(distDirectory, 'server');
const workerSource = resolve(projectRoot, 'sites', 'static-worker.js');
const workerOutput = resolve(serverDirectory, 'index.js');

await mkdir(clientDirectory, { recursive: true });

const distEntries = await readdir(distDirectory, { withFileTypes: true });
for (const entry of distEntries) {
  if (entry.name === 'client' || entry.name === 'server') {
    continue;
  }

  await rename(
    resolve(distDirectory, entry.name),
    resolve(clientDirectory, entry.name),
  );
}

await mkdir(serverDirectory, { recursive: true });
await copyFile(workerSource, workerOutput);
