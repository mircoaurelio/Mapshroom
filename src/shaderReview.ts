import {
  buildFragmentShaderSource,
  parseUniforms,
  VERTEX_SHADER_SOURCE,
} from './lib/shader';
import { projectionAtelierCandidateList } from './shaders/presets/atelier';
import type {
  ShaderUniformDefinition,
  ShaderUniformValue,
} from './types';

const REVIEW_WIDTH = 960;
const REVIEW_HEIGHT = 540;
const REVIEW_TIMES = [0, 1.7, 4.1];

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
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

function fitSourceToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  background: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = REVIEW_WIDTH;
  canvas.height = REVIEW_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is unavailable.');
  }
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(
    source,
    (canvas.width - width) * 0.5,
    (canvas.height - height) * 0.5,
    width,
    height,
  );
  return canvas;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  return image;
}

function createLineDrawing(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = REVIEW_WIDTH;
  canvas.height = REVIEW_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is unavailable.');
  }

  context.fillStyle = '#f9f5e9';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#11151a';
  context.lineWidth = 2.2;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.save();
  context.translate(canvas.width * 0.5, canvas.height * 0.5);
  for (let ring = 0; ring < 18; ring += 1) {
    context.beginPath();
    const points = 240;
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const radius =
        34 +
        ring * 10.2 +
        Math.sin(angle * (5 + (ring % 4)) + ring * 0.43) * (5 + ring * 0.23);
      const x = Math.cos(angle) * radius * (1.1 + ring * 0.002);
      const y = Math.sin(angle) * radius * 0.76;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }

  for (let arm = 0; arm < 12; arm += 1) {
    context.save();
    context.rotate((arm / 12) * Math.PI * 2);
    context.beginPath();
    context.moveTo(42, 0);
    context.bezierCurveTo(116, -84, 194, 74, 312, -8);
    context.bezierCurveTo(232, 92, 124, 54, 42, 0);
    context.stroke();
    for (let hatch = 0; hatch < 13; hatch += 1) {
      context.beginPath();
      context.moveTo(96 + hatch * 10, -31 + Math.sin(hatch) * 8);
      context.lineTo(72 + hatch * 13, 42 + Math.cos(hatch * 0.8) * 7);
      context.stroke();
    }
    context.restore();
  }

  for (let gear = 0; gear < 7; gear += 1) {
    const angle = (gear / 7) * Math.PI * 2 + 0.2;
    const x = Math.cos(angle) * 238;
    const y = Math.sin(angle) * 156;
    context.beginPath();
    context.arc(x, y, 23 + (gear % 3) * 8, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  context.strokeStyle = 'rgba(120, 24, 32, 0.76)';
  context.lineWidth = 1.35;
  for (let sweep = 0; sweep < 11; sweep += 1) {
    context.beginPath();
    for (let x = 50; x <= canvas.width - 50; x += 4) {
      const y =
        canvas.height * 0.5 +
        Math.sin(x * 0.016 + sweep * 0.7) * (90 + sweep * 4) +
        (sweep - 5) * 8;
      if (x === 50) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }
  return canvas;
}

function createPainting(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = REVIEW_WIDTH;
  canvas.height = REVIEW_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is unavailable.');
  }

  context.fillStyle = '#fbf5e8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const palette = ['#143d8f', '#f03d26', '#f2ad18', '#632b9f', '#059e87', '#ea4f86'];
  context.globalCompositeOperation = 'multiply';
  for (let stroke = 0; stroke < 64; stroke += 1) {
    const seed = stroke * 13.173;
    const x = ((Math.sin(seed * 0.71) * 0.5 + 0.5) * 0.9 + 0.05) * canvas.width;
    const y = ((Math.cos(seed * 0.53) * 0.5 + 0.5) * 0.82 + 0.09) * canvas.height;
    const radiusX = 36 + (Math.sin(seed * 0.27) * 0.5 + 0.5) * 132;
    const radiusY = 12 + (Math.cos(seed * 0.39) * 0.5 + 0.5) * 58;
    context.save();
    context.translate(x, y);
    context.rotate(Math.sin(seed * 0.19) * 1.6);
    context.globalAlpha = 0.34 + (stroke % 5) * 0.075;
    context.fillStyle = palette[stroke % palette.length];
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
  context.strokeStyle = '#1a1420';
  context.lineWidth = 3;
  for (let line = 0; line < 22; line += 1) {
    context.beginPath();
    const startY = 30 + line * 23;
    context.moveTo(20, startY);
    context.bezierCurveTo(
      250,
      startY + Math.sin(line) * 100,
      710,
      startY - Math.cos(line * 0.7) * 110,
      940,
      startY + Math.sin(line * 0.4) * 40,
    );
    context.stroke();
  }
  return canvas;
}

function setUniform(
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation | null,
  definition: ShaderUniformDefinition,
  value: ShaderUniformValue,
) {
  if (!location) {
    return;
  }
  if (definition.type === 'vec3' && Array.isArray(value)) {
    gl.uniform3f(location, value[0], value[1], value[2]);
  } else if (definition.type === 'bool') {
    gl.uniform1i(location, value ? 1 : 0);
  } else if (definition.type === 'int' && typeof value === 'number') {
    gl.uniform1i(location, Math.round(value));
  } else if (typeof value === 'number') {
    gl.uniform1f(location, value);
  }
}

function renderShaderFrame(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  code: string,
  uniformValues: Record<string, ShaderUniformValue>,
  time: number,
) {
  canvas.width = REVIEW_WIDTH;
  canvas.height = REVIEW_HEIGHT;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    throw new Error('WebGL is unavailable.');
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    buildFragmentShaderSource(code),
  );
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Unable to allocate program.');
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Program link failed.');
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source,
  );
  gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
  gl.uniform2f(
    gl.getUniformLocation(program, 'u_resolution'),
    canvas.width,
    canvas.height,
  );

  const uniformDefinitions = parseUniforms(code);
  for (const [name, definition] of Object.entries(uniformDefinitions)) {
    setUniform(
      gl,
      gl.getUniformLocation(program, name),
      definition,
      uniformValues[name] ?? definition.default,
    );
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.finish();
}

async function runReview() {
  const root = document.getElementById('review');
  if (!root) {
    return;
  }
  const searchParams = new URLSearchParams(window.location.search);
  const requestedId = searchParams.get('id');
  const preset =
    projectionAtelierCandidateList.find((candidate) => candidate.id === requestedId) ??
    projectionAtelierCandidateList[0];
  if (!preset) {
    throw new Error('No Projection Atelier presets are available.');
  }

  const isDrawing = preset.template === 'drawing';
  const sources = isDrawing
    ? [
        { label: 'Line drawing', canvas: createLineDrawing() },
        { label: 'Painting', canvas: createPainting() },
      ]
    : await Promise.all(
        [
          { label: 'Base statue', url: '/assets/defaults-basestatue.png' },
          { label: 'Ornate stage', url: '/assets/defaults-palco.png' },
        ].map(async (item) => {
          const image = await loadImage(item.url);
          return {
            label: item.label,
            canvas: fitSourceToCanvas(image, image.naturalWidth, image.naturalHeight, '#000'),
          };
        }),
      );

  root.innerHTML = '';
  const header = document.createElement('header');
  const copy = document.createElement('div');
  copy.innerHTML = `
    <p class="eyebrow">${preset.group}</p>
    <h1>${preset.name}</h1>
    <p class="description">${preset.description}</p>
  `;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${isDrawing ? 'Drawing / painting' : 'Statue + stage'} · 3 fixed times · RGB review`;
  header.append(copy, meta);
  const main = document.createElement('main');

  for (const source of sources) {
    for (const time of REVIEW_TIMES) {
      const figure = document.createElement('figure');
      const canvas = document.createElement('canvas');
      renderShaderFrame(
        canvas,
        source.canvas,
        preset.code,
        preset.uniformValues ?? {},
        time,
      );
      const caption = document.createElement('figcaption');
      caption.innerHTML = `<span>${source.label}</span><span>t = ${time.toFixed(1)}s</span>`;
      figure.append(canvas, caption);
      main.append(figure);
    }
  }

  root.append(header, main);
  document.body.dataset.status = 'ok';
  document.title = `${preset.name} · Projection Atelier Review`;
}

runReview().catch((error) => {
  document.body.dataset.status = 'fail';
  const root = document.getElementById('review');
  if (root) {
    root.innerHTML = `<pre class="error">${error instanceof Error ? error.message : String(error)}</pre>`;
  }
});
