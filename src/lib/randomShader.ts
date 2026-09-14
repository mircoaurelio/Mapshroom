import type { SavedShader } from '../types';

export function chooseRandomShaderReplacement(
  shaders: SavedShader[],
  current: SavedShader | undefined,
  random: () => number = Math.random,
): SavedShader | undefined {
  const currentSourceId = current?.sourceShaderId ?? current?.id;
  const candidates = shaders.filter((shader) =>
    !shader.isTemporary &&
    !shader.compileError?.trim() &&
    Boolean(shader.code.trim()) &&
    shader.id !== current?.id &&
    (shader.sourceShaderId ?? shader.id) !== currentSourceId &&
    shader.code.trim() !== current?.code.trim(),
  );

  return candidates[Math.floor(random() * candidates.length)];
}
