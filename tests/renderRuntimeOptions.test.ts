import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalWorkspaceUrl, readRenderRuntimeOptions } from '../src/lib/renderRuntimeOptions.ts';

test('diagnostics survive canonical redirect before a lazy stage mounts', () => {
  const canonical = canonicalWorkspaceUrl('/', '/', '', '?performance=1&quality=adaptive&share=temporary');
  const url = new URL(canonical, 'https://mapshroom.dev');
  assert.equal(url.searchParams.has('share'), false);
  assert.deepEqual(readRenderRuntimeOptions(url), { diagnostics: true, experimentalQuality: true });
});

test('hash route diagnostic links work and route quality overrides the outer query', () => {
  const canonical = canonicalWorkspaceUrl('/', '/', '?performance=1&quality=default&project=saved', '?quality=adaptive');
  const url = new URL(canonical, 'https://mapshroom.dev');
  assert.ok(url.hash.includes('project=saved'));
  assert.deepEqual(readRenderRuntimeOptions(url), { diagnostics: true, experimentalQuality: false });
  assert.deepEqual(readRenderRuntimeOptions({ search: '', hash: '#/' }), { diagnostics: false, experimentalQuality: false });
});
