import { spawn } from 'node:child_process';

const [, , ...argv] = process.argv;
const envAssignments = [];
const commandParts = [];

for (const part of argv) {
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(part) && commandParts.length === 0) {
    envAssignments.push(part);
  } else {
    commandParts.push(part);
  }
}

if (commandParts.length === 0) {
  console.error('Usage: node ./scripts/run-with-env.mjs KEY=value [KEY=value...] <command> [...args]');
  process.exit(1);
}

const env = { ...process.env };
for (const assignment of envAssignments) {
  const separator = assignment.indexOf('=');
  const key = assignment.slice(0, separator);
  const value = assignment.slice(separator + 1);
  env[key] = value;
}

const [command, ...args] = commandParts;
const child = spawn(command, args, {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
