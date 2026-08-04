import type { ShaderPresetDefinition } from './types';
import { audioReactivePresetList } from './audioReactive';
import { projectionAtelierPresetList } from './atelier';
import { drawingPresetList } from './drawing';
import { importedShaderBundlePresetList } from './importedShaderBundle';
import { sculpturePresetList } from './sculpture';
import { stagePresetList } from './stage';
import { createStageReworkPresetList } from './stageReworks';

const stageReworkPresetList = createStageReworkPresetList(stagePresetList);

export type { ShaderPresetDefinition } from './types';
export {
  audioReactivePresetList,
  drawingPresetList,
  projectionAtelierPresetList,
  sculpturePresetList,
  stagePresetList,
  stageReworkPresetList,
};

export const shaderPresetList: ShaderPresetDefinition[] = [
  ...projectionAtelierPresetList,
  ...stageReworkPresetList,
  ...sculpturePresetList,
  ...stagePresetList,
  ...drawingPresetList,
  ...audioReactivePresetList,
  ...importedShaderBundlePresetList,
];

export const shaderPresets: Record<string, ShaderPresetDefinition> = Object.fromEntries(
  shaderPresetList.map((shader) => [shader.id, shader]),
);
