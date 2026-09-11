import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const release = join(root, 'src-tauri', 'target', 'release');
const output = join(root, 'release-artifacts');
const files = [
  ['mapshroom.exe', join(release, 'mapshroom.exe')],
  [`Mapshroom_${version}_x64-setup.exe`, join(release, 'bundle', 'nsis', `Mapshroom_${version}_x64-setup.exe`)],
  [`Mapshroom_${version}_x64_en-US.msi`, join(release, 'bundle', 'msi', `Mapshroom_${version}_x64_en-US.msi`)],
];

// Require the complete release; never emit a manifest for stale/partial output.
for (const [, path] of files) {
  if (!(await stat(path)).isFile()) throw new Error(`Missing installer: ${path}`);
}
await mkdir(output, { recursive: true });
const lines = [];
for (const [name, path] of files) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const line = `${hash.digest('hex')}  ${name}`;
  lines.push(line);
  await copyFile(path, join(output, name));
  console.log(line);
}
await writeFile(join(output, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
console.log('Wrote release-artifacts/SHA256SUMS.txt. Checksums do not verify code signing.');
