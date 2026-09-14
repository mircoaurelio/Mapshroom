import assert from 'node:assert/strict';
import test from 'node:test';
import { containsShaderReply, pasteExternalShader } from '../src/lib/pasteExternalShader.ts';

const shader = `// NAME: Clipboard shader
uniform float amount; // @min 0 @max 1 @default 0.5
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * amount;
}`;

test('raw shader code and a fenced LLM reply apply directly without manual input', async () => {
  for (const text of [shader, `Here is your shader:\n\`\`\`glsl\n${shader}\n\`\`\``]) {
    const applied: string[] = [];
    assert.deepEqual(await pasteExternalShader(async () => text, async code => { applied.push(code); }), { applied: true });
    assert.deepEqual(applied, [text]);
  }
});

test('empty, unrelated, and outgoing prompt clipboard content opens an empty manual editor', async () => {
  const outgoing = `You are a strict GLSL ES 3.00 shader generator for WebGL 2.\nCURRENT GLSL TO REPLACE:\n\`\`\`glsl\n${shader}\n\`\`\`\nREQUIRED SHADER STRUCTURE:`;
  for (const text of ['', 'Un’aurora boreale dai movimenti lenti', '// vec4 processColor(tex, uv, time, resolution)', outgoing]) {
    assert.deepEqual(await pasteExternalShader(async () => text, async () => { assert.fail('must not apply'); }), { applied: false, code: '' });
  }
});

test('blocked clipboard access falls back to manual input', async () => {
  assert.deepEqual(await pasteExternalShader(async () => { throw new Error('NotAllowedError'); }, async () => { assert.fail('must not apply'); }), { applied: false, code: '' });
});

test('closing the handoff while clipboard permission is pending does not apply a stale reply', async () => {
  const controller = new AbortController();
  const result = await pasteExternalShader(async () => {
    controller.abort();
    return shader;
  }, async () => { assert.fail('must not apply after cancellation'); }, controller.signal);
  assert.deepEqual(result, { applied: false, code: '' });
});

test('shader validation failure retains the reply and error for correction', async () => {
  const error = 'Missing slider metadata';
  assert.deepEqual(await pasteExternalShader(async () => shader, async () => { throw new Error(error); }), { applied: false, code: shader, error });
});

test('apply links preserve their project and request information for existing validation', async () => {
  const params = new URLSearchParams({ applyShader: '1', session: 'session-1', shader: 'shader-1', request: 'request-1', code: shader });
  const text = `https://mapshroom.dev/?${params}`;
  assert.equal(containsShaderReply(text), true);
  assert.deepEqual(await pasteExternalShader(async () => text, async code => { assert.equal(code, text); }), { applied: true });
});
