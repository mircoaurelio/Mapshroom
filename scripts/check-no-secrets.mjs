import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-ssr',
  '_scaffold',
  'coverage',
]);

const SCANNED_EXTENSIONS = new Set([
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ps1',
  '.scss',
  '.sh',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const SECRET_PATTERNS = [
  {
    label: 'OpenAI-style secret',
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: 'Google-style API key',
    regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  },
];

function shouldScanFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return SCANNED_EXTENSIONS.has(extension) || path.basename(filePath).startsWith('.env');
}

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && shouldScanFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function getLineNumber(source, matchIndex) {
  return source.slice(0, matchIndex).split('\n').length;
}

async function findSecrets() {
  const findings = [];
  const files = await collectFiles(ROOT);

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8').catch(() => '');
    if (!source || source.includes('\u0000')) {
      continue;
    }

    for (const { label, regex } of SECRET_PATTERNS) {
      regex.lastIndex = 0;
      let match = regex.exec(source);
      while (match) {
        findings.push({
          label,
          filePath: path.relative(ROOT, filePath),
          line: getLineNumber(source, match.index),
          preview: match[0].slice(0, 8) + '...',
        });
        match = regex.exec(source);
      }
    }
  }

  return findings;
}

const findings = await findSecrets();

if (findings.length > 0) {
  console.error('Secret scan failed. Potential credentials were found:\n');
  for (const finding of findings) {
    console.error(
      `- ${finding.label} in ${finding.filePath}:${finding.line} (${finding.preview})`,
    );
  }
  process.exit(1);
}

console.log('Secret scan passed.');
