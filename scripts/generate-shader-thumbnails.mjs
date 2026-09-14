import { rolldown } from 'rolldown';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, mkdtemp, readdir, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'public/assets/shader-thumbnails');
const temp = await mkdtemp(join(tmpdir(), 'mapshroom-thumbnails-'));
await mkdir(output, { recursive: true });
const build = await rolldown({ input: join(root, 'scripts/render-shader-thumbnails.ts') });
await build.write({ file: join(temp, 'generate.js'), format: 'esm' });
await build.close();
const manifest = {};
let completed;
const done = new Promise((resolve, reject) => { completed = { resolve, reject }; });
const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET') {
      response.setHeader('Content-Type', request.url === '/generate.js' ? 'text/javascript' : 'text/html');
      response.end(request.url === '/generate.js' ? await readFile(join(temp, 'generate.js')) : '<!doctype html><html><body>Generating shader thumbnails<script type="module" src="/generate.js"></script></body></html>');
      return;
    }
    let text = ''; for await (const part of request) text += part;
    const data = JSON.parse(text);
    if (request.url === '/thumbnail') {
      if (!/^[a-f0-9]{16}$/.test(data.key) || !data.dataUrl?.startsWith('data:image/webp;base64,')) throw new Error('Invalid thumbnail');
      const file = `${data.key}.webp`;
      await writeFile(join(output, file), Buffer.from(data.dataUrl.split(',')[1], 'base64'));
      manifest[data.key] = { file, time: data.time };
    } else if (request.url === '/complete') {
      const errors = data.results.filter(result => result.error);
      if (errors.length) throw new Error(`Thumbnail generation failed: ${JSON.stringify(errors)}`);
      await writeFile(join(root, 'src/lib/shaderThumbnailManifest.json'), JSON.stringify(manifest, null, 2) + '\n');
      await writeFile(join(output, 'catalog.json'), JSON.stringify(data.results, null, 2) + '\n');
      // Remove obsolete generated files only after the complete replacement catalogue succeeds.
      for (const file of await readdir(output)) {
        if (/^[a-f0-9]{16}\.webp$/.test(file) && !manifest[file.slice(0, -5)]) await unlink(join(output, file));
      }
      console.log(JSON.stringify({ presets: data.results.length, images: Object.keys(manifest).length, errors }, null, 2));
      completed.resolve(errors.length);
    } else if (request.url === '/error') completed.reject(new Error(data.error));
    else console.log(JSON.stringify(data));
    response.end('ok');
  } catch (error) { response.statusCode = 500; response.end(String(error)); completed.reject(error); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browserPath = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && existsSync(path));
if (!browserPath) throw new Error('Chrome/Chromium is required to generate the catalog');
const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--user-data-dir=${join(temp, 'browser')}`, `http://127.0.0.1:${server.address().port}/`], { windowsHide: true, stdio: 'ignore' });
const deadline = setTimeout(() => completed.reject(new Error('Thumbnail generation timed out')), 15 * 60_000);
browser.once('error', completed.reject);
try {
  const failures = await done;
  if (failures) process.exitCode = 1;
} finally { clearTimeout(deadline); browser.kill(); server.close(); }
