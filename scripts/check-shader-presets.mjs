import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = 4600 + Math.floor(Math.random() * 200);
const HOST = '127.0.0.1';
const URL = `http://${HOST}:${PORT}/shader-smoke-test.html`;
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

  const serverCommand =
    process.platform === 'win32'
      ? ['cmd.exe', ['/c', `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`]]
      : ['npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT), '--strictPort']];

  const server = spawn(
    serverCommand[0],
    serverCommand[1],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    },
  );

  server.stdout?.on('data', (chunk) => {
    process.stdout.write(String(chunk));
  });

  server.stderr?.on('data', (chunk) => {
    process.stderr.write(String(chunk));
  });

  try {
    await waitForServer(URL);

    const { stdout } = await runProcess(browserPath, [
      '--headless=new',
      '--disable-gpu',
      '--virtual-time-budget=5000',
      '--dump-dom',
      URL,
    ]);

    if (!stdout.includes('data-status="ok"')) {
      throw new Error(stdout);
    }

    console.log('Shader smoke test passed.');
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
