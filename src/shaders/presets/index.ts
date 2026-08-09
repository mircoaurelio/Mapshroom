import type { ShaderPresetDefinition } from './types';
import { normalizeOfficialShaderBody } from '../../lib/shaderCompiler';
import { audioReactivePresetList as legacyAudioReactivePresetList } from './audioReactive';
import { projectionAtelierPresetList as legacyProjectionAtelierPresetList } from './atelier';
import { drawingPresetList as legacyDrawingPresetList } from './drawing';
import { importedShaderBundlePresetList as legacyImportedShaderBundlePresetList } from './importedShaderBundle';
import { sculpturePresetList as legacySculpturePresetList } from './sculpture';
import { stagePresetList as legacyStagePresetList } from './stage';
import { createStageReworkPresetList } from './stageReworks';

function normalizeOfficialPreset(preset: ShaderPresetDefinition): ShaderPresetDefinition {
  const code = normalizeOfficialShaderBody(preset.code);
  return code === preset.code ? preset : { ...preset, code };
}

function normalizeOfficialPresetList(
  presets: ShaderPresetDefinition[],
): ShaderPresetDefinition[] {
  return presets.map(normalizeOfficialPreset);
}

export const audioReactivePresetList = normalizeOfficialPresetList(legacyAudioReactivePresetList);
export const projectionAtelierPresetList = normalizeOfficialPresetList(
  legacyProjectionAtelierPresetList,
);
export const drawingPresetList = normalizeOfficialPresetList(legacyDrawingPresetList);
export const sculpturePresetList = normalizeOfficialPresetList(legacySculpturePresetList);
export const stagePresetList = normalizeOfficialPresetList(legacyStagePresetList);
export const stageReworkPresetList = normalizeOfficialPresetList(
  createStageReworkPresetList(legacyStagePresetList),
);
const importedShaderBundlePresetList = normalizeOfficialPresetList(
  legacyImportedShaderBundlePresetList,
);

export type { ShaderPresetDefinition } from './types';

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
