import type { ShaderPresetDefinition } from './types';
import { drawingPresetList } from './drawing';
import { sculpturePresetList } from './sculpture';
import { stagePresetList } from './stage';

export type { ShaderPresetDefinition } from './types';
export { drawingPresetList, sculpturePresetList, stagePresetList };

export const shaderPresetList: ShaderPresetDefinition[] = [
  ...stagePresetList,
  ...drawingPresetList,
  ...sculpturePresetList,
];

export const shaderPresets: Record<string, ShaderPresetDefinition> = Object.fromEntries(
  shaderPresetList.map((shader) => [shader.id, shader]),
);
