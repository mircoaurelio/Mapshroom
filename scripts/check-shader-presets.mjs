import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 4600 + Math.floor(Math.random() * 200);
const HOST = '127.0.0.1';
const TEST_URL = `http://${HOST}:${PORT}/shader-smoke-test.html`;
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const VITE_CLI = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function resolveBrowserPath() {
  return CHROME_PATHS.find((path) => existsSync(path)) ?? null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep retrying until the dev server is ready
    }

    await delay(500);
  }

  throw new Error('Timed out waiting for the shader smoke test page.');
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Process exited with code ${code}.`));
    });
  });
}

async function main() {
  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    throw new Error('Unable to find Chrome or Edge for the shader smoke test.');
  }

  const server = spawn(
    process.execPath,
    [
      VITE_CLI,
      '--config',
      'vite.shader-test.config.ts',
      '--host',
      HOST,
      '--port',
      String(PORT),
      '--strictPort',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      cwd: REPO_ROOT,
    },
  );

  server.stdout?.on('data', (chunk) => {
    process.stdout.write(String(chunk));
  });

  server.stderr?.on('data', (chunk) => {
    process.stderr.write(String(chunk));
  });

  try {
    await waitForServer(TEST_URL);

    const { stdout } = await runProcess(browserPath, [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
      // The runner only loads the isolated localhost smoke page. This avoids a
      // Windows headless GPU-process deadlock seen with Chrome's sandbox.
      '--no-sandbox',
      '--virtual-time-budget=30000',
      '--dump-dom',
      TEST_URL,
    ]);

    if (!stdout.includes('data-status="ok"')) {
      throw new Error(stdout);
    }

    console.log('Shader smoke test passed for WebGL 2 and the eligible WebGL 1 fallback set.');
  } finally {
    if (!server.killed) {
      if (process.platform === 'win32' && server.pid) {
        await runProcess('taskkill', ['/pid', String(server.pid), '/T', '/F']).catch(() => {});
      } else {
        server.kill('SIGTERM');
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
