import type { ShaderPresetDefinition } from './types';
import { audioReactivePresetList } from './audioReactive';
import { drawingPresetList } from './drawing';
import { importedShaderBundlePresetList } from './importedShaderBundle';
import { sculpturePresetList } from './sculpture';
import { stagePresetList } from './stage';

export type { ShaderPresetDefinition } from './types';
export {
  audioReactivePresetList,
  drawingPresetList,
  sculpturePresetList,
  stagePresetList,
};

export const shaderPresetList: ShaderPresetDefinition[] = [
  ...sculpturePresetList,
  ...stagePresetList,
  ...drawingPresetList,
  ...audioReactivePresetList,
  ...importedShaderBundlePresetList,
];

export const shaderPresets: Record<string, ShaderPresetDefinition> = Object.fromEntries(
  shaderPresetList.map((shader) => [shader.id, shader]),
);
