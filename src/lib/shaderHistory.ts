import type { ShaderVersion } from '../types';

/** Keep the live editor state recoverable even if it was never explicitly saved. */
export function preserveShaderVersion(
  versions: ShaderVersion[],
  current: ShaderVersion,
): ShaderVersion[] {
  return versions.some(version => version.code === current.code && version.name === current.name)
    ? [...versions]
    : [...versions, current];
}
