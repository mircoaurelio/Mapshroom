import { deduplicatePreviewCompile, waitForPreviewProgram } from './previewCompilation';
import { buildFragmentShaderSource, parseUniforms, VERTEX_SHADER_SOURCE } from './shader';
import type { AssetKind, ShaderUniformValueMap } from '../types';

import { THUMBNAIL_WIDTH as PREVIEW_WIDTH, THUMBNAIL_HEIGHT as PREVIEW_HEIGHT } from './shaderThumbnailKey';
const PREVIEW_SOURCE_MAX_EDGE = 256;
const PREVIEW_FALLBACK_BG = '#050506';
const PREVIEW_IMAGE_QUALITY = 0.68;
const MAX_PREVIEW_PROGRAMS = 24;

interface ShaderPreviewProgram {
  program: WebGLProgram;
  fragmentShader: WebGLShader;
  positionLocation: number;
}

export interface ShaderPreviewRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  quadBuffer: WebGLBuffer;
  texture: WebGLTexture;
  vertexShader: WebGLShader;
  programCache: Map<string, ShaderPreviewProgram>;
}

function createPreviewSourceFromDrawable(
  drawable: CanvasImageSource,
  width: number,
  height: number,
) {
  if (!width || !height) {
    return null;
  }

  const longestEdge = Math.max(width, height);
  const scale = Math.min(1, PREVIEW_SOURCE_MAX_EDGE / longestEdge);
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'low';
  context.drawImage(drawable, 0, 0, nextWidth, nextHeight);
  return canvas;
}

function loadImagePreviewSource(assetUrl: string) {
  return new Promise<HTMLCanvasElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () =>
      resolve(
        createPreviewSourceFromDrawable(
          image,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
        ),
      );
    image.onerror = () => resolve(null);
    image.src = assetUrl;
  });
}

function loadVideoPreviewSource(assetUrl: string) {
  return new Promise<HTMLCanvasElement | null>((resolve) => {
    const video = document.createElement('video');
    let settled = false;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      const preview = createPreviewSourceFromDrawable(
        video,
        video.videoWidth || PREVIEW_WIDTH,
        video.videoHeight || PREVIEW_HEIGHT,
      );
      cleanup();
      resolve(preview);
    };

    const fail = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(null);
    };

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.src = assetUrl;
    video.load();
  });
}

export function loadShaderPreviewSource(assetUrl: string, assetKind: AssetKind | null) {
  if (assetKind === 'video') {
    return loadVideoPreviewSource(assetUrl);
  }

  return loadImagePreviewSource(assetUrl);
}

export function createPreviewMessageDataUrl(message: string) {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  context.fillStyle = PREVIEW_FALLBACK_BG;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#71717a';
  context.font = "10px 'IBM Plex Mono', monospace";
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(message, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/webp', PREVIEW_IMAGE_QUALITY);
}

function createShaderPreviewRenderer(): ShaderPreviewRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    return null;
  }

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const quadBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!vertexShader || !quadBuffer || !texture) {
    if (texture) {
      gl.deleteTexture(texture);
    }
    if (quadBuffer) {
      gl.deleteBuffer(quadBuffer);
    }
    if (vertexShader) {
      gl.deleteShader(vertexShader);
    }
    return null;
  }

  gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    gl.deleteTexture(texture);
    gl.deleteBuffer(quadBuffer);
    gl.deleteShader(vertexShader);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return {
    canvas,
    gl,
    quadBuffer,
    texture,
    vertexShader,
    programCache: new Map(),
  };
}

export function destroyShaderPreviewRenderer(renderer: ShaderPreviewRenderer | null) {
  if (!renderer) {
    return;
  }

  for (const bundle of renderer.programCache.values()) {
    renderer.gl.deleteProgram(bundle.program);
    renderer.gl.deleteShader(bundle.fragmentShader);
  }
  renderer.programCache.clear();
  renderer.gl.deleteTexture(renderer.texture);
  renderer.gl.deleteBuffer(renderer.quadBuffer);
  renderer.gl.deleteShader(renderer.vertexShader);
  renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
}

function getShaderPreviewRenderer(rendererRef: { current: ShaderPreviewRenderer | null }) {
  if (!rendererRef.current) {
    rendererRef.current = createShaderPreviewRenderer();
  }

  return rendererRef.current;
}

function getShaderPreviewProgram(renderer: ShaderPreviewRenderer, shaderCode: string) {
  return deduplicatePreviewCompile(renderer, shaderCode, () => compileShaderPreviewProgram(renderer, shaderCode));
}

async function compileShaderPreviewProgram(
  renderer: ShaderPreviewRenderer,
  shaderCode: string,
): Promise<ShaderPreviewProgram | null> {
  const cachedProgram = renderer.programCache.get(shaderCode);
  if (cachedProgram) {
    // Refresh insertion order so the cache behaves like an LRU.
    renderer.programCache.delete(shaderCode);
    renderer.programCache.set(shaderCode, cachedProgram);
    return cachedProgram;
  }

  const { gl, vertexShader } = renderer;
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragmentShader) {
    return null;
  }

  gl.shaderSource(fragmentShader, buildFragmentShaderSource(shaderCode));
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const linked = await waitForPreviewProgram(gl, program);
  const positionLocation = linked ? gl.getAttribLocation(program, 'a_position') : -1;
  if (!linked || positionLocation === -1) {
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    return null;
  }

  const bundle = { program, fragmentShader, positionLocation };
  renderer.programCache.set(shaderCode, bundle);
  while (renderer.programCache.size > MAX_PREVIEW_PROGRAMS) {
    const oldestKey = renderer.programCache.keys().next().value;
    if (typeof oldestKey !== 'string') {
      break;
    }
    const oldestBundle = renderer.programCache.get(oldestKey);
    if (oldestBundle) {
      gl.deleteProgram(oldestBundle.program);
      gl.deleteShader(oldestBundle.fragmentShader);
    }
    renderer.programCache.delete(oldestKey);
  }

  return bundle;
}

interface ShaderPreviewOptions {
  timeSeconds?: number;
  isActive?: () => boolean;
  strict?: boolean;
  preserveSourceAspectRatio?: boolean;
  maxEdge?: number;
}

export async function renderShaderPreviewFrame(
  shaderCode: string,
  uniformValues: ShaderUniformValueMap | undefined,
  image: HTMLCanvasElement,
  rendererRef: { current: ShaderPreviewRenderer | null },
  options: ShaderPreviewOptions = {},
) {
  const renderer = getShaderPreviewRenderer(rendererRef);
  if (!renderer) {
    if (options.strict) throw new Error('Preview unavailable');
    return null;
  }

  const { gl, canvas: renderCanvas, quadBuffer, texture } = renderer;
  const previewProgram = await getShaderPreviewProgram(renderer, shaderCode);
  if (options.isActive && !options.isActive()) return null;
  if (!previewProgram) {
    if (options.strict) throw new Error('Shader preview failed to compile');
    return null;
  }
  const { program, positionLocation: posLoc } = previewProgram;

  const maxEdge = Math.max(1, Math.min(PREVIEW_SOURCE_MAX_EDGE, options.maxEdge ?? PREVIEW_SOURCE_MAX_EDGE));
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = options.preserveSourceAspectRatio ? Math.max(1, Math.round(image.width * scale)) : PREVIEW_WIDTH;
  const height = options.preserveSourceAspectRatio ? Math.max(1, Math.round(image.height * scale)) : PREVIEW_HEIGHT;
  if (renderCanvas.width !== width || renderCanvas.height !== height) {
    renderCanvas.width = width;
    renderCanvas.height = height;
  }
  gl.viewport(0, 0, renderCanvas.width, renderCanvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const imageLoc = gl.getUniformLocation(program, 'u_image');
  if (imageLoc !== null) {
    gl.uniform1i(imageLoc, 0);
  }

  const timeLoc = gl.getUniformLocation(program, 'u_time');
  if (timeLoc !== null) {
    gl.uniform1f(timeLoc, options.timeSeconds ?? 1.6);
  }

  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  if (resolutionLoc !== null) {
    gl.uniform2f(resolutionLoc, renderCanvas.width, renderCanvas.height);
  }

  const uniforms = parseUniforms(shaderCode);
  for (const [name, definition] of Object.entries(uniforms)) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
      continue;
    }

    const value = uniformValues?.[name] ?? definition.default;

    if (definition.type === 'float') {
      gl.uniform1f(location, Number(value));
    } else if (definition.type === 'int') {
      gl.uniform1i(location, Math.round(Number(value)));
    } else if (definition.type === 'bool') {
      gl.uniform1i(location, value ? 1 : 0);
    } else if (definition.type === 'vec3' && Array.isArray(value)) {
      gl.uniform3fv(location, value);
    }
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.disableVertexAttribArray(posLoc);
  return renderCanvas;
}

export async function renderShaderPreviewToDataUrl(
  shaderCode: string,
  uniformValues: ShaderUniformValueMap | undefined,
  image: HTMLCanvasElement,
  overlayImage: HTMLCanvasElement | null,
  rendererRef: { current: ShaderPreviewRenderer | null },
  options: ShaderPreviewOptions = {},
) {
  const renderCanvas = await renderShaderPreviewFrame(shaderCode, uniformValues, image, rendererRef, options);
  if (options.isActive && !options.isActive()) return null;
  if (!renderCanvas) return createPreviewMessageDataUrl('Preview unavailable');

  let previewSrc = renderCanvas.toDataURL('image/webp', PREVIEW_IMAGE_QUALITY);

  if (overlayImage) {
    const composedCanvas = document.createElement('canvas');
    composedCanvas.width = PREVIEW_WIDTH;
    composedCanvas.height = PREVIEW_HEIGHT;

    const composedContext = composedCanvas.getContext('2d');
    if (composedContext) {
      composedContext.fillStyle = PREVIEW_FALLBACK_BG;
      composedContext.fillRect(0, 0, composedCanvas.width, composedCanvas.height);
      composedContext.drawImage(renderCanvas, 0, 0, composedCanvas.width, composedCanvas.height);
      composedContext.globalAlpha = 0.5;
      composedContext.drawImage(overlayImage, 0, 0, composedCanvas.width, composedCanvas.height);
      composedContext.globalAlpha = 1;
      previewSrc = composedCanvas.toDataURL('image/webp', PREVIEW_IMAGE_QUALITY);
    }
  }

  return previewSrc;
}
