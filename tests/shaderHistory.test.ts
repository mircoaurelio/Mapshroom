import assert from 'node:assert/strict';
import test from 'node:test';
import { preserveShaderVersion } from '../src/lib/shaderHistory.ts';
import type { ShaderVersion } from '../src/types.ts';

function version(id: string, code = id, name = id): ShaderVersion {
  return { id, code, name, prompt: id, createdAt: '2026-09-13T12:00:00.000Z' };
}

test('pasting preserves unsaved edits and all earlier shader versions', () => {
  const original = version('original');
  const aiEdit = version('ai');
  const history = [original, aiEdit];
  const draft = version('unsaved');
  const paste = version('paste');
  const result = [...preserveShaderVersion(history, draft), paste];
  assert.deepEqual(result, [original, aiEdit, draft, paste]);
  assert.deepEqual(history, [original, aiEdit], 'previous shader history is not mutated');
});

test('repeated paste and restore keep both pasted revisions recoverable', () => {
  const original = version('original');
  const first = version('paste-1');
  const second = version('paste-2');
  let history = [...preserveShaderVersion([original], original), first];
  history = [...preserveShaderVersion(history, first), second];
  history = preserveShaderVersion(history, second); // Restore original.
  history = preserveShaderVersion(history, original); // Restore the second paste.
  assert.deepEqual(history, [original, first, second]);
});

test('renamed code remains recoverable under its original version name', () => {
  const original = version('original', 'same code', 'Original name');
  const renamed = version('renamed', 'same code', 'Renamed shader');
  assert.deepEqual(preserveShaderVersion([original], renamed), [original, renamed]);
});

test('restore preserves edits made after the last saved revision', () => {
  const saved = version('saved');
  const draft = version('before-restore');
  assert.deepEqual(preserveShaderVersion([saved], draft), [saved, draft]);
  assert.deepEqual(preserveShaderVersion([], draft), [draft]);
});
