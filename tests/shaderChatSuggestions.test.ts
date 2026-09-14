import assert from 'node:assert/strict';
import test from 'node:test';
import { getShaderChatSuggestions, pickShaderChatSuggestions, SHADER_CHAT_SUGGESTIONS } from '../src/lib/shaderChatSuggestions.ts';

test('each opening has five distinct suggestions and excludes the previous opening', () => {
  const previous = pickShaderChatSuggestions([], () => 0.5);
  const next = pickShaderChatSuggestions(previous, () => 0.5);
  assert.equal(previous.length, 5);
  assert.equal(next.length, 5);
  assert.equal(new Set(next).size, 5);
  assert.ok(next.every(text => !previous.includes(text)));
});

test('an outdated stored catalog cannot leave the welcome empty', () => {
  const next = pickShaderChatSuggestions(SHADER_CHAT_SUGGESTIONS, () => 0);
  assert.equal(next.length, 5);
  assert.equal(new Set(next).size, 5);
});

test('suggestions stay stable across remounts even when browser storage is unavailable', () => {
  const first = getShaderChatSuggestions();
  assert.equal(first.length, 5);
  assert.strictEqual(getShaderChatSuggestions(), first);
});
