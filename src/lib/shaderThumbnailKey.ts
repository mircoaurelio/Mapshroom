import type { ShaderUniformValueMap } from '../types';

export const THUMBNAIL_VERSION = 1;
export const THUMBNAIL_WIDTH = 160;
export const THUMBNAIL_HEIGHT = 96;
export const THUMBNAIL_TIME = 1.6;

/** Content identity deliberately excludes asset URLs, shader names and IDs. */
export function shaderThumbnailKey(code: string, values: ShaderUniformValueMap = {}): string {
  const content = JSON.stringify([THUMBNAIL_VERSION, code.replaceAll('\r\n', '\n').trim(),
    Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)]);
  let a = 2166136261, b = 3339675911;
  for (let i = 0; i < content.length; i++) {
    a = Math.imul(a ^ content.charCodeAt(i), 16777619);
    b = Math.imul(b ^ content.charCodeAt(i), 2246822519);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
