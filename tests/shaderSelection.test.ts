import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentShaderEdit, resolveEditingShaderSync } from '../src/lib/shaderSelection.ts';
import type { ProjectDocument, SavedShader } from '../src/types';

const shaders = ['A', 'B', 'C'].map(id => ({ id, name: id, code: `// NAME: ${id}`, uniformValues: { speed: 1 } } as SavedShader));
function select(id: string): ProjectDocument {
  const shader = shaders.find(item => item.id === id)!;
  return {
    sessionId: 'selection-test',
    studio: { activeShaderId: id, activeShaderName: id, activeShaderCode: shader.code, uniformValues: shader.uniformValues, savedShaders: shaders },
    timeline: { stub: { shaderSequence: { focusedStepId: `step-${id}`, steps: shaders.map(item => ({ id: `step-${item.id}`, shaderId: item.id })) } } },
  } as ProjectDocument;
}

test('a delayed timeline update cannot reselect A after the user has clicked B', () => {
  const observed = select('A');
  // A timeline relink was scheduled before the next click.
  observed.studio.activeShaderId = 'old-draft-A';
  const current = select('B');
  assert.equal(resolveEditingShaderSync(current, observed, 'step-A'), null);
  assert.equal(current.studio.activeShaderName, 'B');
});

test('an old editing-step reference cannot override the current focused step', () => {
  const current = select('B');
  assert.equal(resolveEditingShaderSync(current, current, 'step-A'), null);
});

test('relinking the still-selected timeline step continues to synchronize its shader', () => {
  const current = select('A');
  current.studio.activeShaderId = 'old-draft-A';
  assert.equal(resolveEditingShaderSync(current, current, 'step-A'), shaders[0]);
  assert.equal(resolveEditingShaderSync(select('A'), select('A'), 'step-A'), null);
  assert.equal(resolveEditingShaderSync(current, current, 'deleted-step'), null);
});

test('rapid A/B/C selections discard delayed names, uniforms, drafts and compiler feedback', () => {
  const a = select('A');
  const b = select('B');
  const c = select('C');
  for (const observed of [a, b]) {
    assert.equal(isCurrentShaderEdit(c, observed), false);
    assert.equal(resolveEditingShaderSync(c, observed, `step-${observed.studio.activeShaderId}`), null);
  }
  assert.equal(isCurrentShaderEdit(c, c), true);
  assert.equal(c.studio.activeShaderName, 'C');
});

test('new code, slider edits, a different project or timeline step invalidate old editor work', () => {
  const original = select('A');
  for (const changed of [
    { ...original, sessionId: 'another-project' },
    { ...original, studio: { ...original.studio, activeShaderCode: '// NAME: A edited' } },
    { ...original, studio: { ...original.studio, uniformValues: { speed: 2 } } },
    { ...original, timeline: { stub: { ...original.timeline.stub, shaderSequence: { ...original.timeline.stub.shaderSequence, focusedStepId: 'another-step-with-A' } } } },
  ]) assert.equal(isCurrentShaderEdit(changed, original), false);
});

test('unrelated project changes do not discard a valid shader update', () => {
  const original = select('A');
  const renamed = { ...original, name: 'Renamed project' };
  assert.equal(isCurrentShaderEdit(renamed, original), true);
});
