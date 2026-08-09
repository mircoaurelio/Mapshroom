import type {
  ProjectDocument,
  SavedShader,
  ShaderAudioReactiveBindingMap,
  ShaderUniformValueMap,
  ShaderVersion,
} from '../types';
import {
  detectMinimumShaderTarget,
  normalizeOfficialShaderBody,
  normalizeOfficialShaderIdentifier,
  OFFICIAL_SHADER_PROFILE,
} from './shaderCompiler.ts';

function normalizeNamedRecord<T>(record: Record<string, T> | undefined): Record<string, T> | undefined {
  if (!record) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(record).map(([name, value]) => [normalizeOfficialShaderIdentifier(name), value]),
  );
}

export function normalizeOfficialUniformValues(
  values: ShaderUniformValueMap | undefined,
): ShaderUniformValueMap | undefined {
  return normalizeNamedRecord(values);
}

export function normalizeOfficialAudioBindings(
  bindings: ShaderAudioReactiveBindingMap | undefined,
): ShaderAudioReactiveBindingMap | undefined {
  return normalizeNamedRecord(bindings);
}

export function normalizeOfficialShaderVersion(version: ShaderVersion): ShaderVersion {
  return {
    ...version,
    code: normalizeOfficialShaderBody(version.code),
    sourceProfile: OFFICIAL_SHADER_PROFILE,
  };
}

export function normalizeOfficialSavedShader(shader: SavedShader): SavedShader {
  const normalizedCode = normalizeOfficialShaderBody(shader.code);
  const detectedMinimumTarget = detectMinimumShaderTarget(normalizedCode);
  return {
    ...shader,
    code: normalizedCode,
    sourceProfile: OFFICIAL_SHADER_PROFILE,
    minimumTarget:
      shader.minimumTarget === 'webgl2' || detectedMinimumTarget === 'webgl2'
        ? 'webgl2'
        : 'webgl1',
    versions: shader.versions?.map(normalizeOfficialShaderVersion),
    lastValidCode: shader.lastValidCode
      ? normalizeOfficialShaderBody(shader.lastValidCode)
      : shader.lastValidCode,
    uniformValues: normalizeOfficialUniformValues(shader.uniformValues),
    lastValidUniformValues: normalizeOfficialUniformValues(shader.lastValidUniformValues),
    audioReactiveBindings: normalizeOfficialAudioBindings(shader.audioReactiveBindings),
  };
}

/**
 * Canonicalizes every persisted shader ingress. Missing profile metadata is
 * interpreted as a legacy GLSL ES 1.00 body and upgraded to the official
 * Mapshroom GLSL ES 3.00 body contract.
 */
export function normalizeProjectShaderSources(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    studio: {
      ...project.studio,
      activeShaderCode: normalizeOfficialShaderBody(project.studio.activeShaderCode),
      activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
      shaderVersions: project.studio.shaderVersions.map(normalizeOfficialShaderVersion),
      savedShaders: project.studio.savedShaders.map(normalizeOfficialSavedShader),
      uniformValues: normalizeOfficialUniformValues(project.studio.uniformValues) ?? {},
    },
  };
}
