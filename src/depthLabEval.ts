import { buildShaderProgramSources } from './lib/shaderCompiler';
import { parseUniforms } from './lib/shader';
import { getBundledAssetUrl, BUNDLED_STATUE_DEPTH_ASSET_ID } from './lib/bundledAssets';
import { webgl2DepthLabPresetList } from './shaders/presets';
import type { ShaderPresetDefinition } from './shaders/presets';

interface DepthLabEvalReport {
  status: 'ok' | 'fail';
  passed: number;
  total: number;
  failures: Array<{ id: string; message: string }>;
}

declare global {
  interface Window {
    __MAPSHROOM_DEPTH_LAB_EVAL__?: DepthLabEvalReport;
  }
}

interface RenderEntry {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  canvas: HTMLCanvasElement;
  preset: ShaderPresetDefinition;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Impossibile creare lo shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Compilazione fallita.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, preset: ShaderPresetDefinition): WebGLProgram {
  const sources = buildShaderProgramSources(preset.code, 'webgl2');
  const vertex = compile(gl, gl.VERTEX_SHADER, sources.vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, sources.fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Impossibile creare il programma WebGL2.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Link del programma fallito.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Depth map non caricata: ${url}`));
    image.src = url;
  });
}

function bindGeometry(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const location = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

function bindTexture(gl: WebGL2RenderingContext, program: WebGLProgram, image: HTMLImageElement): void {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
}

function bindPresetUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  preset: ShaderPresetDefinition,
): void {
  const definitions = parseUniforms(preset.code);
  for (const [name, definition] of Object.entries(definitions)) {
    const value = preset.uniformValues?.[name] ?? definition.default;
    const location = gl.getUniformLocation(program, name);
    if (!location) continue;
    if (definition.type === 'vec3' && Array.isArray(value)) {
      gl.uniform3f(location, value[0], value[1], value[2]);
    } else if (definition.type === 'int') {
      gl.uniform1i(location, Math.round(Number(value)));
    } else if (definition.type === 'bool') {
      gl.uniform1i(location, value ? 1 : 0);
    } else {
      gl.uniform1f(location, Number(value));
    }
  }
}

function createCard(preset: ShaderPresetDefinition): { article: HTMLElement; canvas: HTMLCanvasElement } {
  const article = document.createElement('article');
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const copy = document.createElement('div');
  copy.className = 'copy';
  const title = document.createElement('h2');
  title.textContent = preset.name;
  const description = document.createElement('p');
  description.textContent = preset.description;
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = 'WEBGL2 · GLSL 300';
  copy.append(title, description, badge);
  article.append(canvas, copy);
  return { article, canvas };
}

async function run(): Promise<void> {
  const grid = document.getElementById('grid');
  const status = document.getElementById('status');
  if (!grid || !status) return;

  const sourceUrl = getBundledAssetUrl(BUNDLED_STATUE_DEPTH_ASSET_ID);
  if (!sourceUrl) throw new Error('URL della depth map bundled non disponibile.');
  const image = await loadImage(sourceUrl);
  const failures: DepthLabEvalReport['failures'] = [];
  const entries: RenderEntry[] = [];

  for (const preset of webgl2DepthLabPresetList) {
    const { article, canvas } = createCard(preset);
    grid.append(article);
    try {
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
      if (!gl) throw new Error('WebGL2 non disponibile.');
      const program = createProgram(gl, preset);
      gl.useProgram(program);
      bindGeometry(gl, program);
      bindTexture(gl, program, image);
      bindPresetUniforms(gl, program, preset);
      entries.push({ gl, program, canvas, preset });
    } catch (error) {
      article.classList.add('failed');
      const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
      failures.push({ id: preset.id, message });
      const badge = article.querySelector('.badge');
      if (badge) badge.textContent = `FAIL · ${message}`;
    }
  }

  const startedAt = performance.now();
  const render = (now: number) => {
    const time = (now - startedAt) / 1000;
    for (const { gl, program, canvas } of entries) {
      gl.useProgram(program);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  const report: DepthLabEvalReport = {
    status: failures.length ? 'fail' : 'ok',
    passed: entries.length,
    total: webgl2DepthLabPresetList.length,
    failures,
  };
  window.__MAPSHROOM_DEPTH_LAB_EVAL__ = report;
  document.body.dataset.status = report.status;
  status.className = report.status;
  status.textContent = report.status === 'ok'
    ? `${report.passed}/${report.total} shader compilati e renderizzati sulla statua depth.`
    : `${report.passed}/${report.total} shader riusciti · ${failures.length} errori.`;
}

void run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Eval non avviato.';
  const report: DepthLabEvalReport = { status: 'fail', passed: 0, total: 10, failures: [{ id: 'setup', message }] };
  window.__MAPSHROOM_DEPTH_LAB_EVAL__ = report;
  document.body.dataset.status = 'fail';
  const status = document.getElementById('status');
  if (status) {
    status.className = 'fail';
    status.textContent = message;
  }
});
