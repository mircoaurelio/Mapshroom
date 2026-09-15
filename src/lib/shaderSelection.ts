import type { ProjectDocument, SavedShader } from '../types';

/** A deferred editor update belongs to the shader state that scheduled it. */
export function isCurrentShaderEdit(current: ProjectDocument, observed: ProjectDocument): boolean {
  return current.sessionId === observed.sessionId &&
    current.studio.activeShaderId === observed.studio.activeShaderId &&
    current.studio.activeShaderCode === observed.studio.activeShaderCode &&
    current.studio.uniformValues === observed.studio.uniformValues &&
    current.timeline.stub.shaderSequence.focusedStepId === observed.timeline.stub.shaderSequence.focusedStepId;
}

export function resolveEditingShaderSync(
  current: ProjectDocument,
  observed: ProjectDocument,
  editingStepId: string,
): SavedShader | null {
  if (!isCurrentShaderEdit(current, observed) ||
    current.timeline.stub.shaderSequence.focusedStepId !== editingStepId) return null;
  const step = current.timeline.stub.shaderSequence.steps.find(item => item.id === editingStepId);
  const shader = step ? current.studio.savedShaders.find(item => item.id === step.shaderId) : null;
  return shader && current.studio.activeShaderId !== shader.id ? shader : null;
}
