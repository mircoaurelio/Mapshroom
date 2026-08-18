import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 4600 + Math.floor(Math.random() * 200);
const HOST = '127.0.0.1';
const TEST_URL = `http://${HOST}:${PORT}/shader-smoke-test.html`;
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const VITE_CLI = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const BROWSER_TIMEOUT_MS = 120_000;
const PROCESS_STOP_TIMEOUT_MS = 2_000;
const FORCE_KILL_TIMEOUT_MS = 5_000;
const BROWSER_PATHS = [
  process.env.CHROME_BIN,
  process.env.CHROMIUM_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

function resolveBrowserPath() {
  return BROWSER_PATHS.find((path) => path && existsSync(path)) ?? null;
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
  const { timeoutMs = 0, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...spawnOptions,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const timeoutId = timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          void stopProcess(child, false);
        }, timeoutMs)
      : null;

    const settle = (callback) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      callback();
    };

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      settle(() => {
        reject(
          timedOut
            ? new Error(`Process timed out after ${timeoutMs} ms: ${command}`)
            : error,
        );
      });
    });
    child.on('close', (code) => {
      settle(() => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(
          timedOut
            ? new Error(`Process timed out after ${timeoutMs} ms: ${command}`)
            : new Error(stderr || stdout || `Process exited with code ${code}.`),
        );
      });
    });
  });
}

function forceKillWindowsProcessTree(pid) {
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    });
    let settled = false;
    const timeoutId = setTimeout(() => {
      killer.kill('SIGKILL');
      finish();
    }, FORCE_KILL_TIMEOUT_MS);
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };
    killer.once('error', finish);
    killer.once('close', finish);
  });
}

function waitForProcessClose(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const onClose = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    const timeoutId = setTimeout(() => {
      child.off('close', onClose);
      resolve(false);
    }, timeoutMs);
    child.once('close', onClose);
  });
}

async function stopProcess(child, graceful = true) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  if (graceful) {
    child.kill('SIGTERM');
    if (await waitForProcessClose(child, PROCESS_STOP_TIMEOUT_MS)) return;
  }

  if (process.platform === 'win32' && child.pid) {
    await forceKillWindowsProcessTree(child.pid);
  } else {
    child.kill('SIGKILL');
  }

  if (!(await waitForProcessClose(child, PROCESS_STOP_TIMEOUT_MS))) {
    child.kill('SIGKILL');
  }
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

    const { stdout } = await runProcess(
      browserPath,
      [
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
      ],
      { timeoutMs: BROWSER_TIMEOUT_MS },
    );

    if (!stdout.includes('data-status="ok"')) {
      throw new Error(stdout);
    }

    console.log('Shader smoke test passed for WebGL 2 and the eligible WebGL 1 fallback set.');
  } finally {
    await stopProcess(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
