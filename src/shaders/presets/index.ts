import type { ShaderPresetDefinition } from './types';
import { audioReactivePresetList } from './audioReactive';
import { projectionAtelierPresetList } from './atelier';
import { drawingPresetList } from './drawing';
import { importedShaderBundlePresetList } from './importedShaderBundle';
import { sculpturePresetList } from './sculpture';
import { stagePresetList } from './stage';

export type { ShaderPresetDefinition } from './types';
export {
  audioReactivePresetList,
  drawingPresetList,
  projectionAtelierPresetList,
  sculpturePresetList,
  stagePresetList,
};

export const shaderPresetList: ShaderPresetDefinition[] = [
  ...projectionAtelierPresetList,
  ...sculpturePresetList,
  ...stagePresetList,
  ...drawingPresetList,
  ...audioReactivePresetList,
  ...importedShaderBundlePresetList,
];

export const shaderPresets: Record<string, ShaderPresetDefinition> = Object.fromEntries(
  shaderPresetList.map((shader) => [shader.id, shader]),
);
