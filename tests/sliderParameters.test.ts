import assert from 'node:assert/strict';
import test from 'node:test';
import { renameShader } from '../src/lib/renameShader.ts';
import { randomizeUniformValues } from '../src/lib/uniformRandomization.ts';
import type { ProjectDocument, ShaderUniformMap } from '../src/types.ts';

function projectFixture(): ProjectDocument {
  return {
    sessionId: 'test',
    studio: {
      activeShaderId: 'a', activeShaderName: 'Original',
      activeShaderCode: '// NAME: Original\nvoid main() { /* unsaved edit */ }',
      uniformValues: { speed: 1 }, shaderVersions: [],
      savedShaders: [
        { id: 'a', name: 'Original', code: '// NAME: Original\nvoid main() {}',
          lastValidCode: '// NAME: Original\nvoid main() {}',
          uniformValues: { speed: 1 },
          versions: [{ id: 'old', name: 'Original', code: '// NAME: Original\nvoid main() {}' }] },
        { id: 'b', name: 'Other', code: 'void main() {}', uniformValues: { speed: 2 } },
      ],
    },
    timeline: { stub: { shaderSequence: { steps: [{ id: 'step-a', shaderId: 'a' }] } } },
  } as unknown as ProjectDocument;
}

test('renaming persists metadata while preserving code edits, uniforms, history and timeline links', () => {
  const project = projectFixture();
  const renamed = renameShader(project, 'a', '  My $& shader  ');
  const saved = renamed.studio.savedShaders[0];
  assert.equal(renamed.studio.activeShaderName, 'My $& shader');
  assert.equal(saved.name, 'My $& shader');
  assert.equal(renamed.studio.activeShaderCode, '// NAME: My $& shader\nvoid main() { /* unsaved edit */ }');
  assert.equal(saved.lastValidCode, '// NAME: My $& shader\nvoid main() {}');
  assert.equal(saved.versions, project.studio.savedShaders[0].versions);
  assert.equal(renamed.studio.uniformValues, project.studio.uniformValues);
  assert.equal(renamed.timeline, project.timeline);
  assert.equal(renamed.studio.savedShaders[1], project.studio.savedShaders[1]);
  assert.equal(JSON.parse(JSON.stringify(renamed)).studio.savedShaders[0].name, 'My $& shader');
  assert.equal(project.studio.activeShaderName, 'Original');
});

test('a rename targets its original shader even after selection changes, and empty names are ignored', () => {
  const project = projectFixture();
  const renamed = renameShader(project, 'b', 'Other\n renamed');
  assert.equal(renamed.studio.activeShaderCode, project.studio.activeShaderCode);
  assert.equal(renamed.studio.activeShaderName, 'Original');
  assert.equal(renamed.studio.savedShaders[1].code, '// NAME: Other renamed\nvoid main() {}');
  assert.equal(renameShader(project, 'a', '  '), project);
  assert.equal(renameShader(project, 'missing', 'Name'), project);
});

const definitions: ShaderUniformMap = {
  tint: { type: 'vec3', min: 0, max: 1, default: [0, 0, 0] },
  bgColor: { type: 'vec3', min: 0, max: 1, default: [1, 1, 1] },
  speed: { type: 'float', min: -2, max: 2, default: 0 },
  count: { type: 'int', min: 1, max: 4, default: 1 },
  enabled: { type: 'bool', min: 0, max: 1, default: true },
};

test('randomization includes independent RGB channels and numeric values while respecting color locks', () => {
  const samples = [0.1, 0.5, 0.9, 0.75, 0.99];
  const changes = randomizeUniformValues(definitions, new Set(['bgColor']), () => samples.shift()!);
  assert.deepEqual(changes, { tint: [0.1, 0.5, 0.9], speed: 1, count: 4 });
  assert.deepEqual(definitions.tint.default, [0, 0, 0]);
  assert.deepEqual(randomizeUniformValues(definitions, new Set(Object.keys(definitions))), {});
});

test('a shader containing only a color can be randomized', () => {
  assert.deepEqual(randomizeUniformValues({ tint: definitions.tint }, new Set(), () => 0.4), { tint: [0.4, 0.4, 0.4] });
});
