import assert from 'node:assert/strict';
import test from 'node:test';
import { getShaderChatResults } from '../src/lib/shaderChatResults.ts';
import type { ShaderChatTurn, ShaderVersion } from '../src/types.ts';

const base: ShaderVersion = { id: 'base', name: 'Original', code: 'void main() {}', prompt: 'Base Node Source', createdAt: '2026-09-14T10:00:00Z' };
const result: ShaderVersion = { ...base, id: 'result', name: 'Warm shader', code: 'void main() { gl_FragColor = vec4(1.0); }', prompt: 'Use warmer colors' };
const conversation: ShaderChatTurn[] = [
  { role: 'user', text: 'Use warmer colors' },
  { role: 'model', text: `\`\`\`glsl\n${result.code}\n\`\`\`` },
];

test('opening a shader or waiting on the first request shows no saved result', () => {
  assert.deepEqual(getShaderChatResults([base, result], []), []);
  assert.deepEqual(getShaderChatResults([base, result], conversation.slice(0, 1)), []);
  assert.deepEqual(getShaderChatResults([base, result], conversation.slice(1)), []);
});

test('first completed chat shows its result and excludes unrelated saved revisions', () => {
  const pasted = { ...result, id: 'paste', code: 'unrelated pasted code' };
  assert.deepEqual(getShaderChatResults([base, result, pasted], conversation), [result]);
});

test('a baseline is not presented as a chat response even if its code is returned', () => {
  const unchanged = { ...base, id: 'unchanged', prompt: 'Keep this shader as it is' };
  const turns: ShaderChatTurn[] = [{ role: 'user', text: unchanged.prompt }, { role: 'model', text: base.code }];
  assert.deepEqual(getShaderChatResults([base, unchanged], turns), [unchanged]);
});

test('Windows line endings and code fences match the saved response', () => {
  const multiline = { ...result, code: 'void main() {\n  gl_FragColor = vec4(1.0);\n}' };
  const turns: ShaderChatTurn[] = [conversation[0], { role: 'model', text: `\`\`\`glsl\r\n${multiline.code.replaceAll('\n', '\r\n')}\r\n\`\`\`` }];
  assert.deepEqual(getShaderChatResults([base, multiline], turns), [multiline]);
});

test('a new conversation hides older results without altering saved history', () => {
  const versions = [base, result];
  assert.deepEqual(getShaderChatResults(versions, conversation), [result]);
  assert.deepEqual(getShaderChatResults(versions, []), []);
  assert.deepEqual(versions, [base, result]);
});
