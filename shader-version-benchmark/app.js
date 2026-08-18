import { glsl100Shaders } from './shaders/glsl100.js';
import { glsl300Shaders } from './shaders/glsl300.js';
import { wgslShaders } from './shaders/wgsl.js';

const VERTEX_100 = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const VERTEX_300 = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const controls = { speed: 1, intensity: 0.7, scale: 1 };
let selectedRun = 0;
let playing = true;
let elapsed = 0;
let previousTimestamp = performance.now();
let overviewReady = false;
let overviewVisible = false;
let dialogSource = '';

function createInputTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071825');
  gradient.addColorStop(0.48, '#27323a');
  gradient.addColorStop(1, '#1c101e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#9fe7ed';
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const discs = [
    [210, 190, 118, '#16d9de'], [524, 304, 178, '#ef397e'], [810, 210, 100, '#ffb329'],
  ];
  for (const [x, y, radius, color] of discs) {
    const radial = ctx.createRadialGradient(x, y, 0, x, y, radius);
    radial.addColorStop(0, color);
    radial.addColorStop(0.18, `${color}cc`);
    radial.addColorStop(1, `${color}00`);
    ctx.fillStyle = radial;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.fillStyle = '#f4f7ef';
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAP / 01', canvas.width / 2, canvas.height / 2);
  ctx.font = '500 18px monospace';
  ctx.fillText('SHARED PROCEDURAL INPUT - 16:9', canvas.width / 2, canvas.height / 2 + 62);
  return canvas;
}

const sourceCanvas = createInputTexture();

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown shader compiler error';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Unknown program linker error';
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(2, Math.round(rect.width * ratio));
  const height = Math.max(2, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return true;
}

class ShaderRenderer {
  constructor(canvas, version, onState = null) {
    this.canvas = canvas;
    this.version = version;
    this.onState = onState;
    this.gl = canvas.getContext(version === 300 ? 'webgl2' : 'webgl', {
      alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance',
    });
    this.program = null;
    this.frameCount = 0;
    this.sampleStarted = performance.now();
    this.cpuTotal = 0;
    if (!this.gl) {
      this.onState?.({ ok: false, error: `WebGL ${version === 300 ? '2' : '1'} non disponibile in questo browser.` });
      return;
    }
    this.setupGeometry();
    this.setupTexture();
  }

  setupGeometry() {
    const gl = this.gl;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  }

  setupTexture() {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
  }

  setShader(record) {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    this.program = null;
    try {
      this.program = createProgram(gl, this.version === 300 ? VERTEX_300 : VERTEX_100, record.code);
      this.record = record;
      this.uniforms = Object.fromEntries(
        ['u_source','u_time','u_resolution','u_speed','u_intensity','u_scale'].map((name) => [name, gl.getUniformLocation(this.program, name)]),
      );
      this.onState?.({ ok: true, record });
    } catch (error) {
      this.onState?.({ ok: false, error: error instanceof Error ? error.message : String(error), record });
    }
  }

  render(time, params) {
    if (!this.gl || !this.program || !resizeCanvas(this.canvas)) return;
    const started = performance.now();
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const position = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.uniforms.u_source !== null) gl.uniform1i(this.uniforms.u_source, 0);
    if (this.uniforms.u_time !== null) gl.uniform1f(this.uniforms.u_time, time);
    if (this.uniforms.u_resolution !== null) gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    if (this.uniforms.u_speed !== null) gl.uniform1f(this.uniforms.u_speed, params.speed);
    if (this.uniforms.u_intensity !== null) gl.uniform1f(this.uniforms.u_intensity, params.intensity);
    if (this.uniforms.u_scale !== null) gl.uniform1f(this.uniforms.u_scale, params.scale);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.updateMetrics(performance.now() - started);
  }

  updateMetrics(cpuMs) {
    this.cpuTotal += cpuMs;
    this.frameCount += 1;
    const now = performance.now();
    if (this.frameCount < 30) return;
    const seconds = (now - this.sampleStarted) / 1000;
    this.onState?.({ ok: true, fps: this.frameCount / seconds, ms: this.cpuTotal / this.frameCount, record: this.record });
    this.frameCount = 0;
    this.cpuTotal = 0;
    this.sampleStarted = now;
  }
}

const GPU_USAGE = {
  texture: globalThis.GPUTextureUsage ?? { COPY_DST: 2, TEXTURE_BINDING: 4, RENDER_ATTACHMENT: 16 },
  buffer: globalThis.GPUBufferUsage ?? { COPY_DST: 8, UNIFORM: 64 },
};
let webGpuRuntimePromise;

async function getWebGpuRuntime() {
  if (!navigator.gpu) throw new Error('WebGPU non disponibile. Usa un browser Chromium aggiornato con accelerazione hardware attiva.');
  if (!webGpuRuntimePromise) {
    webGpuRuntimePromise = (async () => {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) throw new Error('Nessun adattatore WebGPU disponibile. Verifica driver e accelerazione hardware.');
      const device = await adapter.requestDevice();
      const sourceTexture = device.createTexture({
        label: 'shared-source-texture',
        size: [sourceCanvas.width, sourceCanvas.height, 1],
        format: 'rgba8unorm',
        usage: GPU_USAGE.texture.COPY_DST | GPU_USAGE.texture.TEXTURE_BINDING,
      });
      device.queue.copyExternalImageToTexture(
        { source: sourceCanvas },
        { texture: sourceTexture },
        [sourceCanvas.width, sourceCanvas.height],
      );
      const sampler = device.createSampler({
        magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
      });
      return { device, sourceTexture, sampler };
    })();
  }
  return webGpuRuntimePromise;
}

async function compileWgslPipeline(device, format, record) {
  const module = device.createShaderModule({ label: record.id, code: record.code });
  const compilation = await module.getCompilationInfo();
  const errors = compilation.messages.filter((message) => message.type === 'error');
  if (errors.length) {
    throw new Error(errors.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));
  }
  const pipeline = await device.createRenderPipelineAsync({
    label: `${record.id}-pipeline`,
    layout: 'auto',
    vertex: { module, entryPoint: 'vertex_main' },
    fragment: { module, entryPoint: 'fragment_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  return { module, pipeline, warnings: compilation.messages.filter((message) => message.type === 'warning') };
}

class WebGpuRenderer {
  constructor(canvas, onState = null) {
    this.canvas = canvas;
    this.onState = onState;
    this.frameCount = 0;
    this.sampleStarted = performance.now();
    this.cpuTotal = 0;
    this.shaderRevision = 0;
    this.initialize();
  }

  async initialize() {
    try {
      const runtime = await getWebGpuRuntime();
      this.device = runtime.device;
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) throw new Error('Il canvas WebGPU non è disponibile in questo browser.');
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });
      this.uniformBuffer = this.device.createBuffer({
        label: 'shared-uniforms',
        size: 32,
        usage: GPU_USAGE.buffer.UNIFORM | GPU_USAGE.buffer.COPY_DST,
      });
      this.sourceTexture = runtime.sourceTexture;
      this.sampler = runtime.sampler;
      this.ready = true;
      this.device.lost.then((info) => this.onState?.({ ok: false, error: `WebGPU device lost: ${info.message || info.reason}` }));
      if (this.record) this.setShader(this.record);
    } catch (error) {
      this.onState?.({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async setShader(record) {
    this.record = record;
    const revision = ++this.shaderRevision;
    if (!this.ready) return;
    this.pipeline = null;
    try {
      const { pipeline, warnings } = await compileWgslPipeline(this.device, this.format, record);
      if (revision !== this.shaderRevision) return;
      this.pipeline = pipeline;
      this.bindGroup = this.device.createBindGroup({
        label: `${record.id}-bindings`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler },
          { binding: 1, resource: this.sourceTexture.createView() },
          { binding: 2, resource: { buffer: this.uniformBuffer } },
        ],
      });
      this.onState?.({ ok: true, record, warnings });
    } catch (error) {
      if (revision !== this.shaderRevision) return;
      this.onState?.({ ok: false, error: error instanceof Error ? error.message : String(error), record });
    }
  }

  render(time, params) {
    if (!this.ready || !this.pipeline || !resizeCanvas(this.canvas)) return;
    const started = performance.now();
    const uniformData = new Float32Array([
      this.canvas.width, this.canvas.height, time, params.speed, params.intensity, params.scale, 0, 0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    const encoder = this.device.createCommandEncoder({ label: 'shader-benchmark-frame' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    this.updateMetrics(performance.now() - started);
  }

  updateMetrics(cpuMs) {
    this.cpuTotal += cpuMs;
    this.frameCount += 1;
    const now = performance.now();
    if (this.frameCount < 30) return;
    const seconds = (now - this.sampleStarted) / 1000;
    this.onState?.({ ok: true, fps: this.frameCount / seconds, ms: this.cpuTotal / this.frameCount, record: this.record });
    this.frameCount = 0;
    this.cpuTotal = 0;
    this.sampleStarted = now;
  }
}

function updateMainState(side, state) {
  const suffix = { v1: 'V1', v3: 'V3', gpu: 'Gpu' }[side];
  const status = document.querySelector(`#status${suffix}`);
  const error = document.querySelector(`#error${suffix}`);
  if (!state.ok) {
    status.classList.add('error');
    status.lastChild.textContent = side === 'gpu' && !navigator.gpu ? ' UNAVAILABLE' : ' COMPILE ERROR';
    error.hidden = false;
    error.textContent = state.error;
    return;
  }
  status.classList.remove('error');
  status.lastChild.textContent = ' COMPILED';
  error.hidden = true;
  if (state.fps) document.querySelector(`#fps${suffix}`).textContent = `${state.fps.toFixed(1)} FPS`;
  if (state.ms) document.querySelector(`#ms${suffix}`).textContent = `${state.ms.toFixed(2)} MS CPU`;
}

const mainV1 = new ShaderRenderer(document.querySelector('#canvasV1'), 100, (state) => updateMainState('v1', state));
const mainV3 = new ShaderRenderer(document.querySelector('#canvasV3'), 300, (state) => updateMainState('v3', state));
const mainGpu = new WebGpuRenderer(document.querySelector('#canvasGpu'), (state) => updateMainState('gpu', state));
const overviewRenderers = [];

function selectRun(index) {
  selectedRun = index;
  document.querySelectorAll('.run-button').forEach((button) => button.classList.toggle('active', Number(button.dataset.run) === index));
  mainV1.setShader(glsl100Shaders[index]);
  mainV3.setShader(glsl300Shaders[index]);
  mainGpu.setShader(wgslShaders[index]);
  document.querySelector('#noteV1').textContent = `RUN ${String(index + 1).padStart(2,'0')} - ${glsl100Shaders[index].title}`;
  document.querySelector('#noteV3').textContent = `RUN ${String(index + 1).padStart(2,'0')} - ${glsl300Shaders[index].title}`;
  document.querySelector('#noteGpu').textContent = `RUN ${String(index + 1).padStart(2,'0')} - ${wgslShaders[index].title}`;
}

function createOverviewColumn(container, records, backend) {
  records.forEach((record, index) => {
    const item = document.createElement('article');
    item.className = 'overview-item';
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'mini-canvas checkerboard';
    const canvas = document.createElement('canvas');
    canvasWrap.append(canvas);
    const label = document.createElement('div');
    label.className = 'overview-label';
    const title = document.createElement('span');
    title.textContent = `${String(index + 1).padStart(2,'0')} - ${record.title}`;
    const source = document.createElement('button');
    source.textContent = 'SOURCE';
    source.addEventListener('click', () => showSource(backend, index));
    label.append(title, source);
    item.append(canvasWrap, label);
    container.append(item);
    const onState = (state) => {
      item.classList.toggle('compile-error', !state.ok);
      if (!state.ok) title.textContent = `${String(index + 1).padStart(2,'0')} - ${backend === 'gpu' && !navigator.gpu ? 'WEBGPU UNAVAILABLE' : 'COMPILE ERROR'}`;
    };
    const renderer = backend === 'gpu'
      ? new WebGpuRenderer(canvas, onState)
      : new ShaderRenderer(canvas, backend === 'v3' ? 300 : 100, onState);
    renderer.setShader(record);
    overviewRenderers.push(renderer);
  });
}

function initOverview() {
  if (overviewReady) return;
  createOverviewColumn(document.querySelector('#overviewV1'), glsl100Shaders, 'v1');
  createOverviewColumn(document.querySelector('#overviewV3'), glsl300Shaders, 'v3');
  createOverviewColumn(document.querySelector('#overviewGpu'), wgslShaders, 'gpu');
  overviewReady = true;
}

function showSource(side, index = selectedRun) {
  const variants = {
    v1: { records: glsl100Shaders, label: 'GLSL ES 1.00 / WEBGL 1' },
    v3: { records: glsl300Shaders, label: 'GLSL ES 3.00 / WEBGL 2' },
    gpu: { records: wgslShaders, label: 'WGSL / WEBGPU' },
  };
  const variant = variants[side];
  const record = variant.records[index];
  dialogSource = record.code;
  document.querySelector('#sourceKicker').textContent = `${variant.label} - ${record.id}`;
  document.querySelector('#sourceTitle').textContent = record.title;
  document.querySelector('#sourceCode').textContent = record.code;
  document.querySelector('#sourceDialog').showModal();
}

document.querySelectorAll('.run-button').forEach((button) => button.addEventListener('click', () => selectRun(Number(button.dataset.run))));
document.querySelectorAll('.source-button').forEach((button) => button.addEventListener('click', () => showSource(button.dataset.sourceSide)));
document.querySelector('#closeDialog').addEventListener('click', () => document.querySelector('#sourceDialog').close());
document.querySelector('#sourceDialog').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector('#copySource').addEventListener('click', async (event) => {
  await navigator.clipboard.writeText(dialogSource);
  event.currentTarget.textContent = 'COPIED';
  setTimeout(() => { event.currentTarget.textContent = 'COPY'; }, 1200);
});
document.querySelector('#playToggle').addEventListener('click', (event) => {
  playing = !playing;
  event.currentTarget.textContent = playing ? 'II' : 'PLAY';
  event.currentTarget.setAttribute('aria-label', playing ? 'Metti in pausa' : 'Riprendi');
});
document.querySelector('#resetTime').addEventListener('click', () => { elapsed = 0; });
document.querySelector('#viewToggle').addEventListener('click', (event) => {
  overviewVisible = !overviewVisible;
  if (overviewVisible) initOverview();
  event.currentTarget.setAttribute('aria-pressed', String(overviewVisible));
  event.currentTarget.innerHTML = overviewVisible ? '<span class="grid-icon">x</span> COMPARE' : '<span class="grid-icon">+</span> OVERVIEW 15';
  document.querySelector('#compareView').hidden = overviewVisible;
  document.querySelector('#overviewView').hidden = !overviewVisible;
});

for (const name of ['speed','intensity','scale']) {
  const input = document.querySelector(`#${name}`);
  const output = document.querySelector(`#${name}Out`);
  input.addEventListener('input', () => {
    controls[name] = Number(input.value);
    output.textContent = controls[name].toFixed(2);
  });
}

function validateSet(records, version) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext(version === 300 ? 'webgl2' : 'webgl');
  if (!gl) return records.map((record) => ({ id: record.id, ok: false, error: `WebGL ${version === 300 ? '2' : '1'} unavailable` }));
  const results = records.map((record) => {
    try {
      const program = createProgram(gl, version === 300 ? VERTEX_300 : VERTEX_100, record.code);
      gl.deleteProgram(program);
      return { id: record.id, title: record.title, ok: true };
    } catch (error) {
      return { id: record.id, title: record.title, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return results;
}

async function validateWgslSet(records) {
  try {
    const { device } = await getWebGpuRuntime();
    const format = navigator.gpu.getPreferredCanvasFormat();
    const results = [];
    for (const record of records) {
      try {
        await compileWgslPipeline(device, format, record);
        results.push({ id: record.id, title: record.title, ok: true });
      } catch (error) {
        results.push({ id: record.id, title: record.title, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return results;
  } catch (error) {
    return records.map((record) => ({ id: record.id, title: record.title, ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}

window.__shaderBenchmarkSmoke = {
  glsl100: validateSet(glsl100Shaders, 100),
  glsl300: validateSet(glsl300Shaders, 300),
  wgsl: [],
};
document.documentElement.dataset.shaderSmoke = 'running';
window.__shaderBenchmarkSmoke.ready = (async () => {
  window.__shaderBenchmarkSmoke.wgsl = await validateWgslSet(wgslShaders);
  const results = [
    ...window.__shaderBenchmarkSmoke.glsl100,
    ...window.__shaderBenchmarkSmoke.glsl300,
    ...window.__shaderBenchmarkSmoke.wgsl,
  ];
  document.documentElement.dataset.shaderSmoke = results.every((result) => result.ok) ? 'passed' : 'failed';
  return window.__shaderBenchmarkSmoke;
})();

function animate(timestamp) {
  const delta = Math.min((timestamp - previousTimestamp) / 1000, 0.1);
  previousTimestamp = timestamp;
  if (playing) elapsed += delta;
  document.querySelector('#timeReadout').textContent = `T+ ${elapsed.toFixed(2).padStart(5,'0')}`;
  if (overviewVisible) overviewRenderers.forEach((renderer) => renderer.render(elapsed, controls));
  else {
    mainV1.render(elapsed, controls);
    mainV3.render(elapsed, controls);
    mainGpu.render(elapsed, controls);
  }
  requestAnimationFrame(animate);
}

selectRun(0);
requestAnimationFrame(animate);
