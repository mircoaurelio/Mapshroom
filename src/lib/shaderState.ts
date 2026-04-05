import type { SavedShader, ShaderUniformValueMap } from '../types';
import {
  buildFragmentShaderSource,
  parseUniforms,
  syncUniformValues,
  VERTEX_SHADER_SOURCE,
} from './shader';

const EMPTY_UNIFORM_VALUES: ShaderUniformValueMap = {};

function compileShaderRaw(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to allocate shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'Shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(error);
  }

  return shader;
}

export function hasShaderCompileError(shader: SavedShader | null | undefined): boolean {
  return Boolean(shader?.compileError?.trim());
}

export function getRenderableShaderCode(shader: SavedShader | null | undefined): string {
  if (!shader) {
    return '';
  }

  if (hasShaderCompileError(shader) && shader.lastValidCode?.trim()) {
    return shader.lastValidCode;
  }

  return shader.code;
}

export function getRenderableShaderUniformValues(
  shader: SavedShader | null | undefined,
): ShaderUniformValueMap {
  if (!shader) {
    return EMPTY_UNIFORM_VALUES;
  }

  const renderCode = getRenderableShaderCode(shader);
  const sourceValues = hasShaderCompileError(shader)
    ? {
        ...(shader.lastValidUniformValues ?? EMPTY_UNIFORM_VALUES),
        ...(shader.uniformValues ?? EMPTY_UNIFORM_VALUES),
      }
    : shader.uniformValues ?? EMPTY_UNIFORM_VALUES;

  return syncUniformValues(sourceValues, parseUniforms(renderCode));
}

export function validateShaderCodeCompilation(code: string): string | null {
  let gl: WebGLRenderingContext | null = null;

  try {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
  } catch (error) {
    console.warn('Unable to create a WebGL validation context.', error);
    return null;
  }

  if (!gl) {
    return null;
  }

  try {
    const vertexShader = compileShaderRaw(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShaderRaw(
      gl,
      gl.FRAGMENT_SHADER,
      buildFragmentShaderSource(code),
    );
    const program = gl.createProgram();

    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error('Unable to create the WebGL program.');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'GLSL link error.');
    }

    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  } catch (error) {
    return error instanceof Error ? `GLSL Error: ${error.message}` : 'GLSL Error: Unknown error.';
  } finally {
    const loseContextExtension = gl.getExtension('WEBGL_lose_context');
    loseContextExtension?.loseContext();
  }
}
