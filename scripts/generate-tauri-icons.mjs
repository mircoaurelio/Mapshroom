import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceIcon = resolve(root, 'public/assets/icons/mapshroom-icon-transparent-512.png');
const iconsDir = resolve(root, 'src-tauri/icons');
const appIcon = resolve(iconsDir, 'app-icon.png');

await mkdir(iconsDir, { recursive: true });
await copyFile(sourceIcon, appIcon);

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tauri', 'icon', appIcon],
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  },
);

if (result.status !== 0) {
  console.warn(
    'tauri icon generation failed; ensuring fallback PNG/ICO placeholders exist for local development.',
  );
  await copyFile(sourceIcon, resolve(iconsDir, '32x32.png'));
  await copyFile(sourceIcon, resolve(iconsDir, '128x128.png'));
  await copyFile(sourceIcon, resolve(iconsDir, '128x128@2x.png'));
  await copyFile(sourceIcon, resolve(iconsDir, 'icon.png'));
  // Minimal valid ICO is not generated here; packaging CI should run `npm run icons:tauri`
  // once the Tauri CLI is available.
}

console.log('Desktop icons prepared in src-tauri/icons');
