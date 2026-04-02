import { buildFragmentShaderSource, VERTEX_SHADER_SOURCE } from './lib/shader';
import { shaderPresetList } from './shaders/presets';

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to allocate shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function runShaderSmokeTest() {
  const resultElement = document.getElementById('result');
  if (!resultElement) {
    return;
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    document.body.dataset.status = 'fail';
    resultElement.textContent = 'FAIL\nWebGL is not available in this browser.';
    return;
  }

  const failures: string[] = [];

  for (const preset of shaderPresetList) {
    try {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentShaderSource(preset.code));
      const program = gl.createProgram();

      if (!program) {
        throw new Error('Unable to allocate WebGL program.');
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link failed.');
      }

      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shader error.';
      failures.push(`${preset.name}: ${message}`);
    }
  }

  if (failures.length > 0) {
    document.body.dataset.status = 'fail';
    resultElement.textContent = `FAIL\n${failures.join('\n')}`;
    return;
  }

  document.body.dataset.status = 'ok';
  resultElement.textContent = `OK\n${shaderPresetList.length} shaders compiled successfully.`;
}

runShaderSmokeTest();
