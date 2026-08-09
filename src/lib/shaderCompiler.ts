export type ShaderCompileTarget = 'webgl1' | 'webgl2';

export interface ShaderProgramSources {
  abiVersion: typeof SHADER_ABI_VERSION;
  target: ShaderCompileTarget;
  contextId: 'webgl' | 'webgl2';
  vertexSource: string;
  fragmentSource: string;
}

export const SHADER_ABI_VERSION = 1 as const;

const WEBGL1_FRAGMENT_HEADER = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_time;
uniform vec2 u_resolution;

float node_rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float node_noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
        mix(node_rand(ip), node_rand(ip + vec2(1.0, 0.0)), u.x),
        mix(node_rand(ip + vec2(0.0, 1.0)), node_rand(ip + vec2(1.0, 1.0)), u.x),
        u.y
    );
    return res * res;
}
`;

const WEBGL1_VERTEX_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const WEBGL2_VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const WEBGL2_FRAGMENT_HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 mapshroom_fragColor;
uniform sampler2D u_image;
uniform float u_time;
uniform vec2 u_resolution;

float node_rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float node_noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
        mix(node_rand(ip), node_rand(ip + vec2(1.0, 0.0)), u.x),
        mix(node_rand(ip + vec2(0.0, 1.0)), node_rand(ip + vec2(1.0, 1.0)), u.x),
        u.y
    );
    return res * res;
}
`;

const WEBGL1_FRAGMENT_FOOTER = `
void main() {
    gl_FragColor = processColor(u_image, v_uv, u_time, u_resolution);
}`;

const WEBGL2_FRAGMENT_FOOTER = `
void main() {
    mapshroom_fragColor = processColor(u_image, v_uv, u_time, u_resolution);
}`;

/**
 * Rewrites identifiers only while scanning GLSL code. Comments are deliberately
 * preserved so preset metadata and documentation stay byte-for-byte readable.
 */
function replaceCodeIdentifiers(source: string, replacements: Readonly<Record<string, string>>): string {
  let result = '';
  let index = 0;
  let state: 'code' | 'line-comment' | 'block-comment' = 'code';

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (state === 'line-comment') {
      result += current;
      index += 1;
      if (current === '\n') {
        state = 'code';
      }
      continue;
    }

    if (state === 'block-comment') {
      result += current;
      index += 1;
      if (current === '*' && next === '/') {
        result += next;
        index += 1;
        state = 'code';
      }
      continue;
    }

    if (current === '/' && next === '/') {
      result += '//';
      index += 2;
      state = 'line-comment';
      continue;
    }

    if (current === '/' && next === '*') {
      result += '/*';
      index += 2;
      state = 'block-comment';
      continue;
    }

    if (current && /[A-Za-z_]/.test(current)) {
      const tokenStart = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        index += 1;
      }
      const token = source.slice(tokenStart, index);
      result += replacements[token] ?? token;
      continue;
    }

    result += current;
    index += 1;
  }

  return result;
}

export function adaptShaderBodyForTarget(code: string, target: ShaderCompileTarget): string {
  if (target === 'webgl1') {
    return code;
  }

  return replaceCodeIdentifiers(code, {
    // `active` is legal in GLSL ES 1.00 but reserved in GLSL ES 3.00.
    // It exists as a local variable in the legacy catalog.
    active: 'mapshroom_legacy_active',
    texture2D: 'texture',
    texture2DProj: 'textureProj',
    textureCube: 'texture',
  });
}

export function buildVertexShaderSource(target: ShaderCompileTarget): string {
  return target === 'webgl2' ? WEBGL2_VERTEX_SOURCE : WEBGL1_VERTEX_SOURCE;
}

export function buildFragmentShaderHeader(target: ShaderCompileTarget): string {
  return target === 'webgl2' ? WEBGL2_FRAGMENT_HEADER : WEBGL1_FRAGMENT_HEADER;
}

export function buildFragmentShaderFooter(target: ShaderCompileTarget): string {
  return target === 'webgl2' ? WEBGL2_FRAGMENT_FOOTER : WEBGL1_FRAGMENT_FOOTER;
}

export function buildFragmentShaderSourceForTarget(
  code: string,
  target: ShaderCompileTarget,
): string {
  const adaptedCode = adaptShaderBodyForTarget(code, target);
  const header = buildFragmentShaderHeader(target);
  const footer = buildFragmentShaderFooter(target);
  return `${header}\n${adaptedCode}\n${footer}`;
}

export function buildShaderProgramSources(
  code: string,
  target: ShaderCompileTarget,
): ShaderProgramSources {
  return {
    abiVersion: SHADER_ABI_VERSION,
    target,
    contextId: target === 'webgl2' ? 'webgl2' : 'webgl',
    vertexSource: buildVertexShaderSource(target),
    fragmentSource: buildFragmentShaderSourceForTarget(code, target),
  };
}
