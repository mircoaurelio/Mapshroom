import assert from 'node:assert/strict';
import test from 'node:test';
import { addShaderFolder, filterLibraryShaders, moveShaderToFolder, parseShaderImport, readLibraryOrganization, readShaderIds, type LibraryFilters } from '../src/lib/shaderLibrary.ts';
import type { SavedShader } from '../src/types';

const code = 'vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return vec4(1.0); }';
const shaders: SavedShader[] = [
  { id: 'a', name: 'Cyan Aurora', code, template: 'stage', templates: ['stage', 'sculpture'], group: 'Organic', audioReactiveBindings: { speed: { enabled: true, signal: 'bass', min: 0, max: 1 } } },
  { id: 'b', name: 'Écho', code, template: 'drawing', group: 'Geometry' },
  { id: 'mine', name: 'My Aurora', code, template: 'stage', group: 'Saved', versions: [{ id: 'v', code, name: 'My Aurora', prompt: 'Create', createdAt: '2026-09-15T00:00:00Z' }] },
  { id: 'draft', name: 'Timeline copy', code, isTemporary: true, sourceShaderId: 'a' },
];
const bundled = new Set(['a', 'b']);
const favorites = new Set(['a', 'mine', 'deleted']);
const organization = { folders: [{ id: 'f', name: 'Live set', shaderIds: ['a', 'mine'] }], recentIds: ['mine', 'a', 'deleted'] };
const defaults: LibraryFilters = { query: '', view: 'all', source: 'all', template: 'all', audioOnly: false, favoritesOnly: false, sort: 'name' };
const ids = (patch: Partial<LibraryFilters> = {}) => filterLibraryShaders(shaders, bundled, favorites, organization, { ...defaults, ...patch }).map(shader => shader.id);

test('the catalog excludes linked timeline copies and searches names, tags and templates', () => {
  assert.deepEqual(ids(), ['a', 'b', 'mine']);
  assert.deepEqual(ids({ query: 'ECHO' }), ['b']);
  assert.deepEqual(ids({ query: 'cyan sculpture organic' }), ['a']);
  assert.deepEqual(ids({ query: 'does not exist' }), []);
});
test('search, source, category, favorites and audio filters compose', () => {
  assert.deepEqual(ids({ query: 'aurora', source: 'library', template: 'sculpture', favoritesOnly: true, audioOnly: true }), ['a']);
  assert.deepEqual(ids({ source: 'mine', audioOnly: true }), []);
  assert.deepEqual(ids({ template: 'drawing', favoritesOnly: true }), []);
});
test('directory scopes only include their actual items', () => {
  assert.deepEqual(ids({ view: 'mine' }), ['mine']);
  assert.deepEqual(ids({ view: 'group', group: 'Geometry' }), ['b']);
  assert.deepEqual(ids({ view: 'folder', folderId: 'f' }), ['a', 'mine']);
  assert.deepEqual(ids({ view: 'folder', folderId: 'missing' }), []);
  assert.deepEqual(ids({ view: 'favorites' }), ['a', 'mine']);
  assert.deepEqual(ids({ view: 'recent' }), ['mine', 'a']);
  assert.deepEqual(ids({ sort: 'updated' }), ['mine', 'a', 'b']);
});
test('folder creation, moves, removal and serialization preserve unrelated folders', () => {
  const created = addShaderFolder(organization, 'new', '  Concert   2026  ');
  assert.equal(created.folders[1].name, 'Concert 2026');
  assert.throws(() => addShaderFolder(created, 'duplicate', 'concert 2026'), /already exists/);
  assert.throws(() => addShaderFolder(created, 'empty', ' '), /folder name/);
  const moved = moveShaderToFolder(created, 'a', 'new');
  assert.deepEqual(moved.folders.map(folder => folder.shaderIds), [['mine'], ['a']]);
  assert.deepEqual(organization.folders[0].shaderIds, ['a', 'mine']);
  assert.deepEqual(readLibraryOrganization(JSON.stringify(moved)), moved);
  assert.deepEqual(moveShaderToFolder(moved, 'a', '').folders[1].shaderIds, []);
  assert.equal(moveShaderToFolder(moved, 'a', 'missing'), moved);
});
test('corrupt storage and unknown favorites do not break the library', () => {
  for (const input of ['invalid', 'null', '[]', '{"folders":[null,1,{"id":"x"}]}']) assert.deepEqual(readLibraryOrganization(input), { folders: [], recentIds: [] });
  assert.deepEqual(readShaderIds('["a",null,1,"a"]'), ['a']);
  assert.deepEqual(readShaderIds('{}'), []);
});
test('imports Mapshroom GLSL and JSON while validating uniform values', () => {
  assert.deepEqual(parseShaderImport(code, 'custom.glsl'), { name: 'custom', code, uniformValues: {} });
  assert.deepEqual(parseShaderImport(JSON.stringify({ name: 'Preset', code, uniformValues: { speed: 2, enabled: true, tint: [1, 0, 1], invalid: 'hello', bad: [0, 1] } }), 'custom.json'), { name: 'Preset', code, uniformValues: { speed: 2, enabled: true, tint: [1, 0, 1] } });
  assert.throws(() => parseShaderImport('alert(1)', 'bad.glsl'), /expected GLSL/);
  assert.throws(() => parseShaderImport('{', 'bad.json'), /invalid JSON/);
  assert.throws(() => parseShaderImport('{}', 'bad.json'), /code field/);
});
