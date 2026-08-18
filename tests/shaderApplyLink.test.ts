import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractShaderApplyLinkFromText,
  parseShaderApplyLink,
} from '../src/lib/shaderApplyLink.ts';

const SHADER_CODE = `// NAME: Imported depth shader
uniform float depthRelief; // @min 0.0 @max 4.0 @default 1.0
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv);
}`;

function createApplyUrl(assetId?: string): URL {
  const url = new URL('https://mapshroom.dev/');
  url.searchParams.set('applyShader', '1');
  url.searchParams.set('session', 'session-123');
  url.searchParams.set('shader', 'shader-456');
  url.searchParams.set('request', 'request-789');
  if (assetId !== undefined) {
    url.searchParams.set('asset', assetId);
  }
  url.searchParams.set('code', SHADER_CODE);
  return url;
}

test('shader apply links preserve the selected depth asset', () => {
  assert.deepEqual(parseShaderApplyLink(createApplyUrl('bundled-basestatue-depth')), {
    sessionId: 'session-123',
    targetShaderId: 'shader-456',
    requestId: 'request-789',
    assetId: 'bundled-basestatue-depth',
    code: SHADER_CODE,
  });
});

test('legacy shader apply links without an asset remain valid', () => {
  assert.equal(parseShaderApplyLink(createApplyUrl())?.assetId, null);
});

test('hash-based shader apply links preserve the selected asset', () => {
  const sourceUrl = createApplyUrl('depth-map-001');
  const hashUrl = new URL('https://mapshroom.dev/#/');
  hashUrl.hash = `#/?${sourceUrl.searchParams.toString()}`;

  assert.equal(parseShaderApplyLink(hashUrl)?.assetId, 'depth-map-001');
});

test('shader apply links reject malformed asset identifiers', () => {
  assert.throws(
    () => parseShaderApplyLink(createApplyUrl('depth-map\u0001')),
    /invalid asset/,
  );
});

test('text extraction skips an incomplete link and keeps the later valid asset link', () => {
  const validUrl = createApplyUrl('depth-map-002').toString();
  const payload = extractShaderApplyLinkFromText(
    `Ignore https://mapshroom.dev/?applyShader=1 and use ${validUrl}.`,
  );

  assert.equal(payload?.assetId, 'depth-map-002');
  assert.equal(payload?.code, SHADER_CODE);
});
