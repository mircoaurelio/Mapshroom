import type { ShaderPresetDefinition } from './types';
import {
  detectMinimumShaderTarget,
  normalizeOfficialShaderBody,
  OFFICIAL_SHADER_PROFILE,
} from '../../lib/shaderCompiler';
import {
  normalizeOfficialAudioBindings,
  normalizeOfficialUniformValues,
} from '../../lib/shaderProfile';
import { audioReactivePresetList as legacyAudioReactivePresetList } from './audioReactive';
import { projectionAtelierPresetList as legacyProjectionAtelierPresetList } from './atelier';
import { drawingPresetList as legacyDrawingPresetList } from './drawing';
import { importedShaderBundlePresetList as legacyImportedShaderBundlePresetList } from './importedShaderBundle';
import { sculpturePresetList as legacySculpturePresetList } from './sculpture';
import { stagePresetList as legacyStagePresetList } from './stage';
import { createStageReworkPresetList } from './stageReworks';
import { webgl2DepthLabPresetList as depthLabPresetSource } from './depthLab';

function normalizeOfficialPreset(preset: ShaderPresetDefinition): ShaderPresetDefinition {
  const code = normalizeOfficialShaderBody(preset.code);
  return {
    ...preset,
    code,
    sourceProfile: OFFICIAL_SHADER_PROFILE,
    minimumTarget: preset.minimumTarget ?? detectMinimumShaderTarget(code),
    uniformValues: normalizeOfficialUniformValues(preset.uniformValues),
    audioReactiveBindings: normalizeOfficialAudioBindings(preset.audioReactiveBindings),
  };
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
export const webgl2DepthLabPresetList = normalizeOfficialPresetList(depthLabPresetSource);

export type { ShaderPresetDefinition } from './types';

export const shaderPresetList: ShaderPresetDefinition[] = [
  ...webgl2DepthLabPresetList,
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
