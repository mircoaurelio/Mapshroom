import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AssetKind,
  AssetRecord,
  PlaybackTransport,
  ShaderUniformMap,
  ShaderUniformValueMap,
  StageTransform,
  TimelineAssetQuality,
} from '../types';
import {
  buildFragmentShaderSource,
  VERTEX_SHADER_SOURCE,
} from '../lib/shader';
import { getTransportTimeSeconds } from '../lib/clock';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

interface StageRendererProps {
  asset: AssetRecord | null;
  assetUrl: string | null;
  assetUrlStatus?: AssetObjectUrlStatus;
  shaderCode: string;
  shaderCompileNonce?: number;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  renderLayers?: StageRenderLayer[];
  preloadLayers?: StageRenderLayer[];
  warmupSources?: StageRenderInputSource[];
  stageTransform: StageTransform;
  transport: PlaybackTransport;
  isOutputOnly?: boolean;
  personalPreviewActive?: boolean;
  showPinnedIndicator?: boolean;
  pinnedIndicatorLabel?: string | null;
  onPinnedIndicatorClick?: () => void;
  onStageDoubleClick?: () => void;
  stageDoubleClickTitle?: string | null;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onRenderStateChange?: (state: StageRendererState) => void;
  onCompilerError?: (message: string) => void;
  onCompiledShaderCodesChange?: (compiledShaderCodes: ReadonlySet<string>) => void;
  onFrameRendered?: (frame: StageFrameInfo) => void;
}

export interface StageFrameInfo {
  /** True when every requested render layer was drawn with its own compiled program. */
  layersInSync: boolean;
  /** True when every visible and preload layer program is compiled and cached. */
  allProgramsReady: boolean;
  /** Transport time used for the drawn frame. */
  timeSeconds: number;
}

export interface StageRenderInputSource {
  sourceKey: string;
  assetId: string;
  assetName: string;
  kind: AssetKind;
  url: string | null;
  status: AssetObjectUrlStatus;
  clipStartSeconds?: number;
  clipDurationSeconds?: number | null;
  quality?: TimelineAssetQuality;
}

export interface StageRenderLayer {
  shaderCode: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  opacity?: number;
  inputSource?: StageRenderInputSource | null;
  overlaySource?: StageRenderInputSource | null;
  transitionInputSources?: {
    from: StageRenderInputSource | null;
    to: StageRenderInputSource | null;
  } | null;
  transitionOverlaySources?: {
    from: StageRenderInputSource | null;
    to: StageRenderInputSource | null;
  } | null;
  compositeMode?: 'blend' | 'stackOnTop';
  requiresCompositeBase?: boolean;
}

interface ProgramLocations {
  position: number;
  time: WebGLUniformLocation | null;
  image: WebGLUniformLocation | null;
  overlayImage: WebGLUniformLocation | null;
  overlayAspectRatio: WebGLUniformLocation | null;
  transitionFromImage: WebGLUniformLocation | null;
  transitionToImage: WebGLUniformLocation | null;
  transitionFromOverlayImage: WebGLUniformLocation | null;
  transitionToOverlayImage: WebGLUniformLocation | null;
  transitionFromOverlayAspectRatio: WebGLUniformLocation | null;
  transitionToOverlayAspectRatio: WebGLUniformLocation | null;
  baseImage: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  custom: Record<string, WebGLUniformLocation | null>;
}

interface CachedProgram {
  program: WebGLProgram;
  locations: ProgramLocations;
  lastUsedAt: number;
}

interface CompiledRenderLayer extends StageRenderLayer {
  opacity: number;
  key: string;
  program: WebGLProgram;
  locations: ProgramLocations;
}

interface ParallelShaderCompileExtension {
  COMPLETION_STATUS_KHR: number;
}

interface PendingProgramBundle {
  program: WebGLProgram;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  shaderCode: string;
  uniformDefinitions: ShaderUniformMap;
  parallelCompileExtension: ParallelShaderCompileExtension | null;
}

interface StageTextureSourceState {
  source: StageRenderInputSource;
  texture: WebGLTexture | null;
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
  textureUploadPending: boolean;
  lastVideoTextureTime: number | null;
  videoFrameCallbackId: number | null;
  supportsVideoFrameCallback: boolean;
  aspectRatio: number | null;
  status: 'loading' | 'ready' | 'error';
}

export interface StageRendererState {
  renderStatus: string;
  hasBufferedMedia: boolean;
  hasRequiredInputSource: boolean;
  hasLoadingInputSource: boolean;
  hasMissingOnlyInputSources: boolean;
  showEmptyState: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

const MIN_VIDEO_PLAYBACK_RATE = 0.25;
const MAX_VIDEO_PLAYBACK_RATE = 4;
const VIDEO_DRIFT_CORRECTION_THRESHOLD_SECONDS = 0.05;
const VIDEO_HARD_SEEK_THRESHOLD_SECONDS = 0.45;
const VIDEO_DRIFT_PLAYBACK_RATE_GAIN = 0.35;
const MIN_STAGE_SCALE = 0.05;
const MAX_RETAINED_PROGRAMS = 96;

interface StageRenderTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

function ensureStageRenderTarget(
  gl: WebGLRenderingContext,
  currentTarget: StageRenderTarget | null,
  width: number,
  height: number,
): StageRenderTarget {
  if (
    currentTarget &&
    currentTarget.width === width &&
    currentTarget.height === height
  ) {
    return currentTarget;
  }

  if (currentTarget) {
    gl.deleteFramebuffer(currentTarget.framebuffer);
    gl.deleteTexture(currentTarget.texture);
  }

  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    throw new Error('Unable to create the stage render target.');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    framebuffer,
    texture,
    width,
    height,
  };
}
const DEFAULT_WHITE_IMAGE_SOURCE: StageRenderInputSource = {
  sourceKey: 'default:white-16-9',
  assetId: 'default:white-16-9',
  assetName: 'Default white 16:9 image',
  kind: 'image',
  url:
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1600 900%22%3E%3Crect width=%221600%22 height=%22900%22 fill=%22white%22/%3E%3C/svg%3E',
  status: 'ready',
  quality: 'high',
};

function clampVideoPlaybackRate(playbackRate: number) {
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
    return 1;
  }

  return Math.min(MAX_VIDEO_PLAYBACK_RATE, Math.max(MIN_VIDEO_PLAYBACK_RATE, playbackRate));
}

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

function compileShaderUnchecked(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to allocate shader.');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function createProgramBundle(
  gl: WebGLRenderingContext,
  shaderCode: string,
  uniformDefinitions: ShaderUniformMap,
) {
  const vertexShader = compileShaderRaw(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShaderRaw(
    gl,
    gl.FRAGMENT_SHADER,
    buildFragmentShaderSource(shaderCode),
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
    const error = gl.getProgramInfoLog(program) || 'GLSL link error.';
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(error);
  }

  const bundle = {
    program,
    locations: {
      position: gl.getAttribLocation(program, 'a_position'),
      time: gl.getUniformLocation(program, 'u_time'),
      image: gl.getUniformLocation(program, 'u_image'),
      overlayImage: gl.getUniformLocation(program, 'u_timeline_overlay_image'),
      overlayAspectRatio: gl.getUniformLocation(program, 'u_timeline_overlay_aspect_ratio'),
      transitionFromImage: gl.getUniformLocation(program, 'u_timeline_from_image'),
      transitionToImage: gl.getUniformLocation(program, 'u_timeline_to_image'),
      transitionFromOverlayImage: gl.getUniformLocation(program, 'u_timeline_from_overlay_image'),
      transitionToOverlayImage: gl.getUniformLocation(program, 'u_timeline_to_overlay_image'),
      transitionFromOverlayAspectRatio: gl.getUniformLocation(
        program,
        'u_timeline_from_overlay_aspect_ratio',
      ),
      transitionToOverlayAspectRatio: gl.getUniformLocation(
        program,
        'u_timeline_to_overlay_aspect_ratio',
      ),
      baseImage: gl.getUniformLocation(program, 'u_timeline_base_image'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      custom: Object.fromEntries(
        Object.keys(uniformDefinitions).map((name) => [name, gl.getUniformLocation(program, name)]),
      ),
    },
  };

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return bundle;
}

function createPendingProgramBundle(
  gl: WebGLRenderingContext,
  shaderCode: string,
  uniformDefinitions: ShaderUniformMap,
  parallelCompileExtension: ParallelShaderCompileExtension | null,
): PendingProgramBundle {
  const vertexShader = compileShaderUnchecked(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShaderUnchecked(
    gl,
    gl.FRAGMENT_SHADER,
    buildFragmentShaderSource(shaderCode),
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

  return {
    program,
    vertexShader,
    fragmentShader,
    shaderCode,
    uniformDefinitions,
    parallelCompileExtension,
  };
}

function resolvePendingProgramBundle(
  gl: WebGLRenderingContext,
  pendingBundle: PendingProgramBundle,
) {
  if (
    pendingBundle.parallelCompileExtension &&
    !gl.getProgramParameter(
      pendingBundle.program,
      pendingBundle.parallelCompileExtension.COMPLETION_STATUS_KHR,
    )
  ) {
    return null;
  }

  const vertexCompiled = gl.getShaderParameter(
    pendingBundle.vertexShader,
    gl.COMPILE_STATUS,
  );
  const fragmentCompiled = gl.getShaderParameter(
    pendingBundle.fragmentShader,
    gl.COMPILE_STATUS,
  );

  if (!vertexCompiled || !fragmentCompiled) {
    const error =
      gl.getShaderInfoLog(pendingBundle.fragmentShader) ||
      gl.getShaderInfoLog(pendingBundle.vertexShader) ||
      'Shader compilation failed.';
    gl.deleteProgram(pendingBundle.program);
    gl.deleteShader(pendingBundle.vertexShader);
    gl.deleteShader(pendingBundle.fragmentShader);
    throw new Error(error);
  }

  if (!gl.getProgramParameter(pendingBundle.program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(pendingBundle.program) || 'GLSL link error.';
    gl.deleteProgram(pendingBundle.program);
    gl.deleteShader(pendingBundle.vertexShader);
    gl.deleteShader(pendingBundle.fragmentShader);
    throw new Error(error);
  }

  const bundle = {
    program: pendingBundle.program,
    locations: {
      position: gl.getAttribLocation(pendingBundle.program, 'a_position'),
      time: gl.getUniformLocation(pendingBundle.program, 'u_time'),
      image: gl.getUniformLocation(pendingBundle.program, 'u_image'),
      overlayImage: gl.getUniformLocation(pendingBundle.program, 'u_timeline_overlay_image'),
      overlayAspectRatio: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_overlay_aspect_ratio',
      ),
      transitionFromImage: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_from_image',
      ),
      transitionToImage: gl.getUniformLocation(pendingBundle.program, 'u_timeline_to_image'),
      transitionFromOverlayImage: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_from_overlay_image',
      ),
      transitionToOverlayImage: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_to_overlay_image',
      ),
      transitionFromOverlayAspectRatio: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_from_overlay_aspect_ratio',
      ),
      transitionToOverlayAspectRatio: gl.getUniformLocation(
        pendingBundle.program,
        'u_timeline_to_overlay_aspect_ratio',
      ),
      baseImage: gl.getUniformLocation(pendingBundle.program, 'u_timeline_base_image'),
      resolution: gl.getUniformLocation(pendingBundle.program, 'u_resolution'),
      custom: Object.fromEntries(
        Object.keys(pendingBundle.uniformDefinitions).map((name) => [
          name,
          gl.getUniformLocation(pendingBundle.program, name),
        ]),
      ),
    },
  };

  gl.deleteShader(pendingBundle.vertexShader);
  gl.deleteShader(pendingBundle.fragmentShader);
  return bundle;
}

function disposePendingProgramBundle(
  gl: WebGLRenderingContext,
  pendingBundle: PendingProgramBundle,
) {
  gl.deleteProgram(pendingBundle.program);
  gl.deleteShader(pendingBundle.vertexShader);
  gl.deleteShader(pendingBundle.fragmentShader);
}

function initializeTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );
}

function applyTextureSamplingQuality(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  quality: TimelineAssetQuality | undefined,
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const filter = quality === 'draft' ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
}

function disposeVideoElement(video: HTMLVideoElement | null | undefined) {
  if (!video) {
    return;
  }

  video.pause();
  video.removeAttribute('src');
  video.src = '';
  video.load();
}

function getClippedVideoWindow(
  source: StageRenderInputSource,
  durationSeconds: number,
): {
  startSeconds: number;
  visibleDurationSeconds: number;
} {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return {
      startSeconds: 0,
      visibleDurationSeconds: 0.001,
    };
  }

  const maxStartSeconds = Math.max(0, durationSeconds - 0.001);
  const startSeconds = Math.max(
    0,
    Math.min(maxStartSeconds, Number(source.clipStartSeconds ?? 0)),
  );
  const availableDurationSeconds = Math.max(0.001, durationSeconds - startSeconds);
  const visibleDurationSeconds =
    Number.isFinite(source.clipDurationSeconds) && (source.clipDurationSeconds ?? 0) > 0
      ? Math.max(
          0.001,
          Math.min(availableDurationSeconds, Number(source.clipDurationSeconds)),
        )
      : availableDurationSeconds;

  return {
    startSeconds,
    visibleDurationSeconds,
  };
}

function getClippedVideoTime(
  source: StageRenderInputSource,
  transportTimeSeconds: number,
  durationSeconds: number,
  loop: boolean,
): number {
  const { startSeconds, visibleDurationSeconds } = getClippedVideoWindow(source, durationSeconds);
  const normalizedTimeSeconds = loop
    ? transportTimeSeconds % visibleDurationSeconds
    : Math.min(transportTimeSeconds, visibleDurationSeconds);

  return Math.max(
    startSeconds,
    Math.min(durationSeconds, startSeconds + Math.max(0, normalizedTimeSeconds)),
  );
}

function syncVideoToTransport(
  video: HTMLVideoElement,
  source: StageRenderInputSource,
  transport: PlaybackTransport,
  nowMs = performance.now(),
  forceSeek = false,
): boolean {
  video.loop = transport.loop;
  const basePlaybackRate = clampVideoPlaybackRate(transport.playbackRate);
  let videoTimeChanged = false;

  if (video.duration > 0) {
    const absoluteTime = getTransportTimeSeconds(transport, nowMs);
    const targetTime = getClippedVideoTime(source, absoluteTime, video.duration, transport.loop);
    const driftSeconds = targetTime - video.currentTime;

    if (forceSeek || Math.abs(driftSeconds) > VIDEO_HARD_SEEK_THRESHOLD_SECONDS) {
      video.currentTime = targetTime;
      videoTimeChanged = true;
    } else if (transport.isPlaying && Math.abs(driftSeconds) > VIDEO_DRIFT_CORRECTION_THRESHOLD_SECONDS) {
      const correctedPlaybackRate = clampVideoPlaybackRate(
        basePlaybackRate + driftSeconds * VIDEO_DRIFT_PLAYBACK_RATE_GAIN,
      );
      if (Math.abs(video.playbackRate - correctedPlaybackRate) > 0.01) {
        video.playbackRate = correctedPlaybackRate;
      }
    } else if (Math.abs(video.playbackRate - basePlaybackRate) > 0.01) {
      video.playbackRate = basePlaybackRate;
    }
  } else if (Math.abs(video.playbackRate - basePlaybackRate) > 0.01) {
    video.playbackRate = basePlaybackRate;
  }

  if (transport.isPlaying) {
    if (video.paused) {
      void video.play().catch(() => {});
    }
    return videoTimeChanged;
  }

  if (!video.paused) {
    video.pause();
  }

  return videoTimeChanged;
}

function cancelVideoFrameCallback(state: StageTextureSourceState) {
  if (
    !state.video ||
    state.videoFrameCallbackId === null ||
    !state.supportsVideoFrameCallback ||
    typeof state.video.cancelVideoFrameCallback !== 'function'
  ) {
    return;
  }

  state.video.cancelVideoFrameCallback(state.videoFrameCallbackId);
  state.videoFrameCallbackId = null;
}

function requestNextVideoFrame(state: StageTextureSourceState) {
  if (
    !state.video ||
    state.videoFrameCallbackId !== null ||
    !state.supportsVideoFrameCallback ||
    typeof state.video.requestVideoFrameCallback !== 'function'
  ) {
    return;
  }

  state.videoFrameCallbackId = state.video.requestVideoFrameCallback((_now, metadata) => {
    state.videoFrameCallbackId = null;
    state.textureUploadPending = true;
    state.lastVideoTextureTime = metadata.mediaTime;
    requestNextVideoFrame(state);
  });
}

function disposeTextureSourceState(
  gl: WebGLRenderingContext | null,
  state: StageTextureSourceState | null | undefined,
) {
  if (!state) {
    return;
  }

  cancelVideoFrameCallback(state);
  if (state.video) {
    disposeVideoElement(state.video);
  }
  if (state.image) {
    state.image.onload = null;
    state.image.onerror = null;
  }
  if (gl && state.texture) {
    gl.deleteTexture(state.texture);
  }
}

function createTextureSourceState(
  gl: WebGLRenderingContext,
  source: StageRenderInputSource,
  transport: PlaybackTransport,
  onReady: (sourceKey: string, aspectRatio: number | null, renderStatus: string) => void,
  onError: (sourceKey: string, renderStatus: string) => void,
): StageTextureSourceState | null {
  const texture = gl.createTexture();
  if (!texture) {
    return null;
  }

  initializeTexture(gl, texture);
  applyTextureSamplingQuality(gl, texture, source.quality);

  const state: StageTextureSourceState = {
    source,
    texture,
    image: null,
    video: null,
    textureUploadPending: true,
    lastVideoTextureTime: null,
    videoFrameCallbackId: null,
    supportsVideoFrameCallback: false,
    aspectRatio: null,
    status: 'loading',
  };

  if (!source.url) {
    state.status = source.status === 'missing' ? 'error' : 'loading';
    return state;
  }

  if (source.kind === 'image') {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      state.image = image;
      state.video = null;
      state.textureUploadPending = true;
      state.lastVideoTextureTime = null;
      state.aspectRatio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : null;
      state.status = 'ready';
      onReady(state.source.sourceKey, state.aspectRatio, source.assetName || 'Image asset');
    };
    image.onerror = () => {
      state.image = null;
      state.status = 'error';
      onError(state.source.sourceKey, 'Unable to load image asset');
    };
    image.src = source.url;
    state.image = image;
    return state;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  state.supportsVideoFrameCallback = typeof video.requestVideoFrameCallback === 'function';
  video.onloadeddata = () => {
    state.image = null;
    state.video = video;
    state.textureUploadPending = true;
    state.lastVideoTextureTime = null;
    state.aspectRatio =
      video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : null;
    state.status = 'ready';
    const targetTime = getTransportTimeSeconds(transport);
    if (Number.isFinite(targetTime) && video.duration > 0) {
      video.currentTime = getClippedVideoTime(source, targetTime, video.duration, transport.loop);
    }
    if (transport.isPlaying) {
      void video.play().catch(() => {});
    }
    requestNextVideoFrame(state);
    onReady(state.source.sourceKey, state.aspectRatio, source.assetName || 'Video asset');
  };
  video.onseeked = () => {
    state.textureUploadPending = true;
    requestNextVideoFrame(state);
  };
  video.onerror = () => {
    cancelVideoFrameCallback(state);
    state.video = null;
    state.status = 'error';
    onError(state.source.sourceKey, 'Unable to load video asset');
  };
  video.src = source.url;
  state.video = video;
  return state;
}

function updateTextureSourceStateTransport(
  state: StageTextureSourceState,
  transport: PlaybackTransport,
) {
  if (state.source.kind !== 'video' || !state.video || state.status !== 'ready') {
    return;
  }

  state.textureUploadPending =
    syncVideoToTransport(state.video, state.source, transport, performance.now(), true) ||
    state.textureUploadPending;
  requestNextVideoFrame(state);
}

function bindTextureSourceState(
  gl: WebGLRenderingContext,
  state: StageTextureSourceState | null | undefined,
  textureUnit: number,
  transport: PlaybackTransport,
  transportTime: number,
) {
  if (!state?.texture) {
    return false;
  }

  gl.activeTexture(textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, state.texture);

  if (state.source.kind === 'video' && state.video && state.video.readyState >= 2) {
    if (transport.isPlaying && state.video.duration > 0) {
      const targetTime = getClippedVideoTime(
        state.source,
        transportTime,
        state.video.duration,
        transport.loop,
      );
      const driftSeconds = targetTime - state.video.currentTime;
      const basePlaybackRate = clampVideoPlaybackRate(transport.playbackRate);
      if (Math.abs(driftSeconds) > VIDEO_HARD_SEEK_THRESHOLD_SECONDS) {
        state.video.currentTime = targetTime;
        state.textureUploadPending = true;
      } else if (Math.abs(driftSeconds) > VIDEO_DRIFT_CORRECTION_THRESHOLD_SECONDS) {
        const correctedPlaybackRate = clampVideoPlaybackRate(
          basePlaybackRate + driftSeconds * VIDEO_DRIFT_PLAYBACK_RATE_GAIN,
        );
        if (Math.abs(state.video.playbackRate - correctedPlaybackRate) > 0.01) {
          state.video.playbackRate = correctedPlaybackRate;
        }
      } else if (Math.abs(state.video.playbackRate - basePlaybackRate) > 0.01) {
        state.video.playbackRate = basePlaybackRate;
      }
    }

    const shouldUploadVideoFrame =
      state.textureUploadPending ||
      (!state.supportsVideoFrameCallback &&
        (state.lastVideoTextureTime === null ||
          Math.abs(state.video.currentTime - state.lastVideoTextureTime) > 0.001));

    if (shouldUploadVideoFrame) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.video);
      state.textureUploadPending = false;
      state.lastVideoTextureTime = state.video.currentTime;
    }

    return true;
  }

  if (state.source.kind === 'image' && state.image && state.status === 'ready') {
    if (state.textureUploadPending) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.image);
      state.textureUploadPending = false;
    }

    return true;
  }

  return false;
}

export function StageRenderer({
  asset,
  assetUrl,
  assetUrlStatus = 'idle',
  shaderCode,
  shaderCompileNonce = 0,
  uniformDefinitions,
  uniformValues,
  renderLayers,
  preloadLayers,
  warmupSources,
  stageTransform,
  transport,
  isOutputOnly = false,
  personalPreviewActive = false,
  showPinnedIndicator = false,
  pinnedIndicatorLabel = null,
  onPinnedIndicatorClick,
  onStageDoubleClick,
  stageDoubleClickTitle = null,
  onCanvasReady,
  onRenderStateChange,
  onCompilerError,
  onCompiledShaderCodesChange,
  onFrameRendered,
}: StageRendererProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programCacheRef = useRef<Map<string, CachedProgram>>(new Map());
  const pendingProgramCacheRef = useRef<Map<string, PendingProgramBundle>>(new Map());
  const failedProgramCodesRef = useRef<Set<string>>(new Set());
  const lastCompileNonceRef = useRef(shaderCompileNonce);
  const compiledLayersRef = useRef<CompiledRenderLayer[]>([]);
  const programCacheClockRef = useRef(0);
  const onCompilerErrorRef = useRef(onCompilerError);
  const textureSourcesRef = useRef<Map<string, StageTextureSourceState>>(new Map());
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const renderWarningRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaAspectRatioRef = useRef<number | null>(null);
  const compositeRenderTargetRef = useRef<StageRenderTarget | null>(null);
  const transportRef = useRef(transport);
  const preserveDrawingBufferRef = useRef(Boolean(onCanvasReady));
  const resolvedRenderLayersRef = useRef<StageRenderLayer[]>([]);
  const resolvedPreloadLayersRef = useRef<StageRenderLayer[]>([]);
  const [renderStatus, setRenderStatus] = useState('No asset loaded');
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [hasBufferedMedia, setHasBufferedMedia] = useState(false);
  // Bumped after a WebGL context restore so every GL-owning effect rebuilds
  // its resources (programs, textures, buffers) against the restored context.
  const [glContextGeneration, setGlContextGeneration] = useState(0);
  const [shellSize, setShellSize] = useState({ width: 1, height: 1 });
  const onCanvasReadyRef = useRef(onCanvasReady);
  const onRenderStateChangeRef = useRef(onRenderStateChange);
  const onCompiledShaderCodesChangeRef = useRef(onCompiledShaderCodesChange);
  const onFrameRenderedRef = useRef(onFrameRendered);
  const defaultInputSource = useMemo<StageRenderInputSource | null>(
    () =>
      asset
        ? {
            sourceKey: asset.id,
            assetId: asset.id,
            assetName: asset.name,
            kind: asset.kind,
            url: assetUrl,
            status: assetUrlStatus,
            quality: 'high',
          }
        : DEFAULT_WHITE_IMAGE_SOURCE,
    [asset, assetUrl, assetUrlStatus],
  );
  const {
    isPlaying,
    currentTimeSeconds,
    anchorTimestampMs,
    playbackRate,
    loop,
    externalClockEnabled,
  } = transport;

  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);

  useEffect(() => {
    onCompilerErrorRef.current = onCompilerError;
  }, [onCompilerError]);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    onRenderStateChangeRef.current = onRenderStateChange;
  }, [onRenderStateChange]);

  useEffect(() => {
    onCompiledShaderCodesChangeRef.current = onCompiledShaderCodesChange;
  }, [onCompiledShaderCodesChange]);

  useEffect(() => {
    onFrameRenderedRef.current = onFrameRendered;
  }, [onFrameRendered]);

  const resolvedRenderLayers = useMemo<StageRenderLayer[]>(
    () =>
      renderLayers && renderLayers.length > 0
        ? renderLayers
        : [
            {
              shaderCode,
              uniformDefinitions,
              uniformValues,
              opacity: 1,
              inputSource: defaultInputSource,
            },
          ],
    [defaultInputSource, renderLayers, shaderCode, uniformDefinitions, uniformValues],
  );
  const resolvedPreloadLayers = useMemo<StageRenderLayer[]>(
    () => preloadLayers ?? [],
    [preloadLayers],
  );
  resolvedRenderLayersRef.current = resolvedRenderLayers;
  resolvedPreloadLayersRef.current = resolvedPreloadLayers;
  const renderLayerShaderSignature = useMemo(
    () =>
      [...resolvedRenderLayers, ...resolvedPreloadLayers]
        .map((layer) => layer.shaderCode)
        .join('\u0001'),
    [resolvedPreloadLayers, resolvedRenderLayers],
  );
  const requiredInputSources = useMemo(() => {
    const sources = new Map<string, StageRenderInputSource>();
    const registerSource = (source: StageRenderInputSource | null | undefined) => {
      if (!source) {
        return;
      }
      sources.set(source.sourceKey, source);
    };

    registerSource(defaultInputSource);
    for (const layer of [...resolvedRenderLayers, ...resolvedPreloadLayers]) {
      registerSource(layer.inputSource);
      registerSource(layer.overlaySource);
      registerSource(layer.transitionInputSources?.from);
      registerSource(layer.transitionInputSources?.to);
      registerSource(layer.transitionOverlaySources?.from);
      registerSource(layer.transitionOverlaySources?.to);
    }
    for (const source of warmupSources ?? []) {
      registerSource(source);
    }

    return Array.from(sources.values());
  }, [defaultInputSource, resolvedPreloadLayers, resolvedRenderLayers, warmupSources]);
  const requiredInputSourceSignature = useMemo(
    () =>
      requiredInputSources
        .map(
          (source) =>
            `${source.sourceKey}:${source.assetId}:${source.kind}:${source.url ?? 'null'}:${source.status}:${
              source.quality ?? 'balanced'
            }:${source.clipStartSeconds ?? 0}:${source.clipDurationSeconds ?? 'auto'}`,
        )
        .join('\u0001'),
    [requiredInputSources],
  );
  const preferredAspectSourceId = useMemo(() => {
    if (defaultInputSource) {
      return defaultInputSource.sourceKey;
    }

    for (const layer of resolvedRenderLayers) {
      const source =
        layer.transitionInputSources?.from ??
        layer.inputSource ??
        layer.overlaySource ??
        layer.transitionInputSources?.to ??
        layer.transitionOverlaySources?.from ??
        layer.transitionOverlaySources?.to ??
        null;
      if (source) {
        return source.sourceKey;
      }
    }

    return null;
  }, [defaultInputSource, resolvedRenderLayers]);

  useEffect(() => {
    const compiledByKey = new Map(
      compiledLayersRef.current.map((layer) => [layer.key, layer] as const),
    );
    const programCache = programCacheRef.current;

    const nextCompiledLayers = resolvedRenderLayers.flatMap((layer, index) => {
      const key = `${layer.shaderCode}:${index}`;
      const existingLayer = compiledByKey.get(key);
      if (!existingLayer) {
        const cachedProgram = programCache.get(layer.shaderCode);
        if (!cachedProgram) {
          return [];
        }
        cachedProgram.lastUsedAt = ++programCacheClockRef.current;

        return [
          {
            ...layer,
            opacity: Number.isFinite(layer.opacity) ? Number(layer.opacity) : 1,
            key,
            program: cachedProgram.program,
            locations: cachedProgram.locations,
          },
        ];
      }

      return [
        {
          ...existingLayer,
          ...layer,
          opacity: Number.isFinite(layer.opacity) ? Number(layer.opacity) : 1,
          key,
        },
      ];
    });

    if (
      nextCompiledLayers.length > 0 &&
      nextCompiledLayers.length === resolvedRenderLayers.length
    ) {
      compiledLayersRef.current = nextCompiledLayers;
      return;
    }

    if (resolvedRenderLayers.length === 0) {
      compiledLayersRef.current = [];
      return;
    }

    const canRefreshExistingCompiledLayers =
      compiledLayersRef.current.length === resolvedRenderLayers.length &&
      compiledLayersRef.current.every(
        (layer, index) => layer.shaderCode === resolvedRenderLayers[index]?.shaderCode,
      );

    if (canRefreshExistingCompiledLayers) {
      compiledLayersRef.current = compiledLayersRef.current.map((existingLayer, index) => ({
        ...existingLayer,
        ...resolvedRenderLayers[index],
        opacity: Number.isFinite(resolvedRenderLayers[index].opacity)
          ? Number(resolvedRenderLayers[index].opacity)
          : 1,
        key: `${resolvedRenderLayers[index].shaderCode}:${index}`,
      }));
      return;
    }

    // Keep the last good frame until every requested layer program is compiled.
  }, [resolvedRenderLayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const programCache = programCacheRef.current;
    const pendingProgramCache = pendingProgramCacheRef.current;
    const textureSources = textureSourcesRef.current;
    const failedProgramCodes = failedProgramCodesRef.current;

    // Recover from GPU resets: prevent the default lost-context teardown so
    // the browser restores the context, then rebuild every GL resource by
    // bumping the context generation (all GL-owning effects depend on it).
    const handleContextLost = (event: Event) => {
      event.preventDefault();
    };
    const handleContextRestored = () => {
      setGlContextGeneration((currentGeneration) => currentGeneration + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: preserveDrawingBufferRef.current,
    });
    if (!gl || gl.isContextLost()) {
      if (!gl) {
        onCompilerErrorRef.current?.('WebGL is not available in this browser.');
      }
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }

    glRef.current = gl;

    const buffer = gl.createBuffer();
    if (!buffer) {
      onCompilerErrorRef.current?.('Unable to allocate the WebGL buffers.');
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    positionBufferRef.current = buffer;
    gl.viewport(0, 0, canvas.width, canvas.height);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      // After a context loss these deletes are harmless no-ops; the important
      // part is clearing the caches so the next generation recompiles and
      // re-uploads everything from scratch.
      programCache.forEach(({ program }) => {
        gl.deleteProgram(program);
      });
      programCache.clear();
      pendingProgramCache.forEach((pendingBundle) => {
        disposePendingProgramBundle(gl, pendingBundle);
      });
      pendingProgramCache.clear();
      failedProgramCodes.clear();
      compiledLayersRef.current = [];
      textureSources.forEach((state) => {
        disposeTextureSourceState(gl, state);
      });
      textureSources.clear();
      if (compositeRenderTargetRef.current) {
        gl.deleteFramebuffer(compositeRenderTargetRef.current.framebuffer);
        gl.deleteTexture(compositeRenderTargetRef.current.texture);
        compositeRenderTargetRef.current = null;
      }
      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
      }
      positionBufferRef.current = null;
      glRef.current = null;
    };
  }, [glContextGeneration]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const updateShellSize = () => {
      const rect = shell.getBoundingClientRect();
      setShellSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    updateShellSize();

    const resizeObserver = new ResizeObserver(updateShellSize);
    resizeObserver.observe(shell);
    window.addEventListener('resize', updateShellSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateShellSize);
    };
  }, []);

  useEffect(() => {
    const surface = mediaSurfaceRef.current;
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!surface || !canvas || !gl) {
      return;
    }

    const resize = () => {
      const rect = surface.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextAspectRatio =
        mediaAspectRatioRef.current && mediaAspectRatioRef.current > 0
          ? mediaAspectRatioRef.current
          : rect.width > 0 && rect.height > 0
            ? rect.width / rect.height
            : 1;
      const containerAspectRatio = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
      const targetWidth =
        nextAspectRatio > containerAspectRatio
          ? rect.width
          : Math.min(rect.width, rect.height * nextAspectRatio);
      const targetHeight =
        nextAspectRatio > containerAspectRatio
          ? Math.min(rect.height, rect.width / nextAspectRatio)
          : rect.height;

      canvas.width = Math.max(1, Math.round(targetWidth * dpr));
      canvas.height = Math.max(1, Math.round(targetHeight * dpr));
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(surface);
    window.addEventListener('resize', resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mediaAspectRatio, glContextGeneration]);

  useEffect(() => {
    const gl = glRef.current;
    if (!gl) {
      return;
    }

    let disposed = false;
    let timeoutId: number | null = null;
    const parallelCompileExtension = gl.getExtension(
      'KHR_parallel_shader_compile',
    ) as ParallelShaderCompileExtension | null;
    // A code that failed to compile must not be resubmitted on every queue
    // tick (that would keep the GPU compiler busy forever and stutter
    // playback). Failures are only retried after an explicit recompile.
    if (lastCompileNonceRef.current !== shaderCompileNonce) {
      lastCompileNonceRef.current = shaderCompileNonce;
      failedProgramCodesRef.current.clear();
    }
    const requiredLayers = [
      ...resolvedRenderLayersRef.current,
      ...resolvedPreloadLayersRef.current,
    ];
    const requiredShaderCodes = new Set(requiredLayers.map((layer) => layer.shaderCode));
    const visibleShaderCodes = new Set(
      resolvedRenderLayersRef.current.map((layer) => layer.shaderCode),
    );
    const shaderDefinitionByCode = new Map(
      requiredLayers.map((layer) => [layer.shaderCode, layer.uniformDefinitions] as const),
    );

    const notifyCompiledShaderCodes = () => {
      onCompiledShaderCodesChangeRef.current?.(new Set(programCacheRef.current.keys()));
    };

    const pruneProgramCache = () => {
      if (programCacheRef.current.size <= MAX_RETAINED_PROGRAMS) {
        return;
      }

      const disposablePrograms = Array.from(programCacheRef.current.entries())
        .filter(([key]) => !requiredShaderCodes.has(key))
        .sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt);

      let prunedAnyProgram = false;
      for (const [key, cachedProgram] of disposablePrograms) {
        if (programCacheRef.current.size <= MAX_RETAINED_PROGRAMS) {
          break;
        }

        gl.deleteProgram(cachedProgram.program);
        programCacheRef.current.delete(key);
        prunedAnyProgram = true;
      }

      if (prunedAnyProgram) {
        notifyCompiledShaderCodes();
      }
    };

    for (const [key, pendingBundle] of pendingProgramCacheRef.current.entries()) {
      if (requiredShaderCodes.has(key)) {
        continue;
      }

      disposePendingProgramBundle(gl, pendingBundle);
      pendingProgramCacheRef.current.delete(key);
    }

    const syncCompiledRenderLayers = () => {
      const resolvedLayers = resolvedRenderLayersRef.current;
      const nextCompiledLayers: CompiledRenderLayer[] = [];

      for (const [index, layer] of resolvedLayers.entries()) {
        const cachedProgram = programCacheRef.current.get(layer.shaderCode);
        if (!cachedProgram) {
          return false;
        }
        cachedProgram.lastUsedAt = ++programCacheClockRef.current;

        nextCompiledLayers.push({
          ...layer,
          opacity: Number.isFinite(layer.opacity) ? Number(layer.opacity) : 1,
          key: `${layer.shaderCode}:${index}`,
          program: cachedProgram.program,
          locations: cachedProgram.locations,
        });
      }

      if (
        nextCompiledLayers.length !== resolvedLayers.length ||
        nextCompiledLayers.some(
          (layer, index) => layer.shaderCode !== resolvedLayers[index]?.shaderCode,
        )
      ) {
        return false;
      }

      compiledLayersRef.current = nextCompiledLayers;
      return true;
    };

    const scheduleNextTick = () => {
      if (disposed) {
        return;
      }

      timeoutId = window.setTimeout(processShaderQueue, parallelCompileExtension ? 16 : 0);
    };

    const processShaderQueue = () => {
      if (disposed) {
        return;
      }

      let visibleError = '';
      let programCacheChanged = false;

      for (const [key, pendingBundle] of pendingProgramCacheRef.current.entries()) {
        try {
          const resolvedProgram = resolvePendingProgramBundle(gl, pendingBundle);
          if (!resolvedProgram) {
            continue;
          }

          pendingProgramCacheRef.current.delete(key);
          programCacheRef.current.set(key, {
            ...resolvedProgram,
            lastUsedAt: ++programCacheClockRef.current,
          });
          programCacheChanged = true;
        } catch (error) {
          pendingProgramCacheRef.current.delete(key);
          failedProgramCodesRef.current.add(key);
          if (visibleShaderCodes.has(key)) {
            visibleError = error instanceof Error ? error.message : 'Unknown GLSL compilation error.';
          }
        }
      }

      const missingShaderCode = Array.from(requiredShaderCodes).find(
        (shaderCode) =>
          !programCacheRef.current.has(shaderCode) &&
          !pendingProgramCacheRef.current.has(shaderCode) &&
          !failedProgramCodesRef.current.has(shaderCode),
      );

      if (missingShaderCode) {
        try {
          const uniformMap = shaderDefinitionByCode.get(missingShaderCode) ?? {};
          if (parallelCompileExtension) {
            pendingProgramCacheRef.current.set(
              missingShaderCode,
              createPendingProgramBundle(
                gl,
                missingShaderCode,
                uniformMap,
                parallelCompileExtension,
              ),
            );
          } else {
            programCacheRef.current.set(
              missingShaderCode,
              {
                ...createProgramBundle(gl, missingShaderCode, uniformMap),
                lastUsedAt: ++programCacheClockRef.current,
              },
            );
            programCacheChanged = true;
          }
        } catch (error) {
          failedProgramCodesRef.current.add(missingShaderCode);
          if (visibleShaderCodes.has(missingShaderCode)) {
            visibleError = error instanceof Error ? error.message : 'Unknown GLSL compilation error.';
          }
        }
      }

      if (programCacheChanged) {
        notifyCompiledShaderCodes();
      }

      const visibleShadersReady = syncCompiledRenderLayers();
      if (visibleError) {
        onCompilerErrorRef.current?.(`GLSL Error: ${visibleError}`);
      } else if (visibleShadersReady) {
        onCompilerErrorRef.current?.('');
      }

      const hasPendingWork =
        pendingProgramCacheRef.current.size > 0 ||
        Array.from(requiredShaderCodes).some(
          (shaderCode) =>
            !programCacheRef.current.has(shaderCode) &&
            !failedProgramCodesRef.current.has(shaderCode),
        );
      if (hasPendingWork) {
        scheduleNextTick();
      }
      pruneProgramCache();
    };

    processShaderQueue();

    return () => {
      disposed = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [renderLayerShaderSignature, shaderCompileNonce, glContextGeneration]);

  useEffect(() => {
    const gl = glRef.current;
    if (!gl) {
      return;
    }

    const textureSources = textureSourcesRef.current;
    const requiredSourceIds = new Set(requiredInputSources.map((source) => source.sourceKey));
    // Sources referenced by the currently drawable layers must survive even
    // when the freshly requested layers no longer reference them: the render
    // loop keeps drawing the previous compiled layers while new programs
    // finish compiling, and disposing their textures would flash black.
    for (const compiledLayer of compiledLayersRef.current) {
      for (const source of [
        compiledLayer.inputSource,
        compiledLayer.overlaySource,
        compiledLayer.transitionInputSources?.from,
        compiledLayer.transitionInputSources?.to,
        compiledLayer.transitionOverlaySources?.from,
        compiledLayer.transitionOverlaySources?.to,
      ]) {
        if (source) {
          requiredSourceIds.add(source.sourceKey);
        }
      }
    }
    const syncBufferedMedia = () => {
      const readyStates = Array.from(textureSources.values()).filter(
        (state) => state.status === 'ready',
      );
      setHasBufferedMedia(readyStates.length > 0);
      if (readyStates.length === 0 && preferredAspectSourceId === null) {
        mediaAspectRatioRef.current = null;
        setMediaAspectRatio(null);
      }
    };

    if (requiredInputSources.length === 0) {
      textureSources.forEach((state) => {
        disposeTextureSourceState(gl, state);
      });
      textureSources.clear();
      mediaAspectRatioRef.current = null;
      setMediaAspectRatio(null);
      setHasBufferedMedia(false);
      setRenderStatus('No asset loaded');
      return;
    }

    for (const [sourceId, state] of textureSources.entries()) {
      if (requiredSourceIds.has(sourceId)) {
        continue;
      }

      disposeTextureSourceState(gl, state);
      textureSources.delete(sourceId);
    }

    for (const source of requiredInputSources) {
      const existingState = textureSources.get(source.sourceKey);
      const sourceChanged =
        !existingState ||
        existingState.source.sourceKey !== source.sourceKey ||
        existingState.source.kind !== source.kind ||
        existingState.source.url !== source.url ||
        existingState.source.status !== source.status ||
        existingState.source.assetName !== source.assetName ||
        existingState.source.quality !== source.quality ||
        existingState.source.clipStartSeconds !== source.clipStartSeconds ||
        existingState.source.clipDurationSeconds !== source.clipDurationSeconds;

      if (!sourceChanged) {
        existingState.source = source;
        continue;
      }

      if (existingState) {
        disposeTextureSourceState(gl, existingState);
      }

      const nextState = createTextureSourceState(
        gl,
        source,
        transportRef.current,
        (sourceKey, aspectRatio, nextRenderStatus) => {
          const currentState = textureSourcesRef.current.get(sourceKey);
          if (!currentState) {
            return;
          }

          currentState.aspectRatio = aspectRatio;
          currentState.status = 'ready';
          setHasBufferedMedia(true);
          if (sourceKey === preferredAspectSourceId) {
            mediaAspectRatioRef.current = aspectRatio;
            setMediaAspectRatio(aspectRatio);
            setRenderStatus(nextRenderStatus);
          }
        },
        (sourceKey, nextRenderStatus) => {
          const currentState = textureSourcesRef.current.get(sourceKey);
          if (!currentState) {
            return;
          }

          currentState.status = 'error';
          if (sourceKey === preferredAspectSourceId) {
            setRenderStatus(nextRenderStatus);
          }
          syncBufferedMedia();
        },
      );

      if (nextState) {
        textureSources.set(source.sourceKey, nextState);
      } else {
        textureSources.delete(source.sourceKey);
      }
    }

    const preferredState =
      (preferredAspectSourceId ? textureSources.get(preferredAspectSourceId) : null) ??
      requiredInputSources
        .map((source) => textureSources.get(source.sourceKey) ?? null)
        .find((state) => state?.status === 'ready') ??
      null;
    if (preferredState?.status === 'ready') {
      mediaAspectRatioRef.current = preferredState.aspectRatio;
      setMediaAspectRatio(preferredState.aspectRatio);
      setRenderStatus(preferredState.source.assetName || 'Media asset');
    }

    syncBufferedMedia();
  }, [preferredAspectSourceId, requiredInputSourceSignature, requiredInputSources, glContextGeneration]);

  useEffect(() => {
    textureSourcesRef.current.forEach((state) => {
      updateTextureSourceStateTransport(state, {
        isPlaying,
        currentTimeSeconds,
        anchorTimestampMs,
        playbackRate,
        loop,
        externalClockEnabled,
      });
    });
  }, [
    isPlaying,
    currentTimeSeconds,
    anchorTimestampMs,
    playbackRate,
    loop,
    externalClockEnabled,
  ]);

  useEffect(() => {
    const render = (timestamp: number) => {
      const gl = glRef.current;
      const canvas = canvasRef.current;
      const buffer = positionBufferRef.current;
      const compiledLayers = compiledLayersRef.current;
      const textureSources = textureSourcesRef.current;
      const resolvedLayers = resolvedRenderLayersRef.current;

      // Failed codes count as settled: they will never compile, and export
      // must not wait for them (visible-layer failures surface separately
      // through onCompilerError).
      const allProgramsReady = [
        ...resolvedRenderLayersRef.current,
        ...resolvedPreloadLayersRef.current,
      ].every(
        (layer) =>
          programCacheRef.current.has(layer.shaderCode) ||
          failedProgramCodesRef.current.has(layer.shaderCode),
      );

      if (!gl || !canvas || !buffer || compiledLayers.length === 0) {
        onFrameRenderedRef.current?.({
          layersInSync: false,
          allProgramsReady,
          timeSeconds: getTransportTimeSeconds(transportRef.current, timestamp),
        });
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // When some requested layer program is still compiling, keep drawing the
      // previous compiled layers with a live clock instead of freezing the
      // stream. The new layers take over as soon as their programs are ready.
      const layersInSync =
        compiledLayers.length === resolvedLayers.length &&
        compiledLayers.every(
          (layer, index) => layer.shaderCode === resolvedLayers[index]?.shaderCode,
        );

      try {
        const currentTransport = transportRef.current;
        const transportTime = getTransportTimeSeconds(currentTransport, timestamp);
        const shaderTime = transportTime;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        const blendBaseLayerIndex = compiledLayers.findIndex((layer) => layer.requiresCompositeBase);
        let compositeBaseTexture: WebGLTexture | null = null;

        const drawCompiledLayer = (
          layer: CompiledRenderLayer,
          layerIndex: number,
          options: {
            compositeBaseTexture: WebGLTexture | null;
            passLayerCount: number;
          },
        ) => {
          // When drawing stale layers (program for the requested layers still
          // compiling), reuse the stale layer's own uniforms: the freshly
          // resolved layer at this index may belong to a different shader.
          const activeLayer = layersInSync
            ? resolvedRenderLayersRef.current[layerIndex] ?? layer
            : layer;
          const activeOpacity = Number.isFinite(activeLayer.opacity)
            ? Number(activeLayer.opacity)
            : layer.opacity;
          const primarySource =
            activeLayer.inputSource ??
            layer.inputSource ??
            defaultInputSource ??
            activeLayer.transitionInputSources?.from ??
            layer.transitionInputSources?.from ??
            activeLayer.transitionInputSources?.to ??
            layer.transitionInputSources?.to ??
            null;
          const primaryState = primarySource
            ? textureSources.get(primarySource.sourceKey) ?? null
            : null;
          const overlaySource = activeLayer.overlaySource ?? layer.overlaySource ?? null;
          const overlayState = overlaySource
            ? textureSources.get(overlaySource.sourceKey) ?? null
            : null;
          const transitionFromSource =
            activeLayer.transitionInputSources?.from ??
            layer.transitionInputSources?.from ??
            primarySource;
          const transitionToSource =
            activeLayer.transitionInputSources?.to ??
            layer.transitionInputSources?.to ??
            primarySource;
          const transitionFromState = transitionFromSource
            ? textureSources.get(transitionFromSource.sourceKey) ?? primaryState
            : primaryState;
          const transitionToState = transitionToSource
            ? textureSources.get(transitionToSource.sourceKey) ?? primaryState
            : primaryState;
          const transitionFromOverlaySource =
            activeLayer.transitionOverlaySources?.from ??
            layer.transitionOverlaySources?.from ??
            overlaySource;
          const transitionToOverlaySource =
            activeLayer.transitionOverlaySources?.to ??
            layer.transitionOverlaySources?.to ??
            overlaySource;
          const transitionFromOverlayState = transitionFromOverlaySource
            ? textureSources.get(transitionFromOverlaySource.sourceKey) ?? overlayState
            : overlayState;
          const transitionToOverlayState = transitionToOverlaySource
            ? textureSources.get(transitionToOverlaySource.sourceKey) ?? overlayState
            : overlayState;

          bindTextureSourceState(
            gl,
            primaryState,
            gl.TEXTURE0,
            currentTransport,
            transportTime,
          );

          gl.useProgram(layer.program);
          if (layer.locations.image) {
            gl.uniform1i(layer.locations.image, 0);
          }
          if (layer.locations.baseImage && options.compositeBaseTexture) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, options.compositeBaseTexture);
            gl.uniform1i(layer.locations.baseImage, 1);
          }
          if (layer.locations.overlayImage) {
            bindTextureSourceState(
              gl,
              overlayState,
              gl.TEXTURE2,
              currentTransport,
              transportTime,
            );
            gl.uniform1i(layer.locations.overlayImage, 2);
          }
          if (layer.locations.overlayAspectRatio) {
            gl.uniform1f(layer.locations.overlayAspectRatio, overlayState?.aspectRatio ?? 1);
          }
          if (layer.locations.transitionFromImage) {
            bindTextureSourceState(
              gl,
              transitionFromState,
              gl.TEXTURE0,
              currentTransport,
              transportTime,
            );
            gl.uniform1i(layer.locations.transitionFromImage, 0);
          }
          if (layer.locations.transitionToImage) {
            bindTextureSourceState(
              gl,
              transitionToState,
              gl.TEXTURE1,
              currentTransport,
              transportTime,
            );
            gl.uniform1i(layer.locations.transitionToImage, 1);
          }
          if (layer.locations.transitionFromOverlayImage) {
            bindTextureSourceState(
              gl,
              transitionFromOverlayState,
              gl.TEXTURE2,
              currentTransport,
              transportTime,
            );
            gl.uniform1i(layer.locations.transitionFromOverlayImage, 2);
          }
          if (layer.locations.transitionFromOverlayAspectRatio) {
            gl.uniform1f(
              layer.locations.transitionFromOverlayAspectRatio,
              transitionFromOverlayState?.aspectRatio ?? 1,
            );
          }
          if (layer.locations.transitionToOverlayImage) {
            bindTextureSourceState(
              gl,
              transitionToOverlayState,
              gl.TEXTURE3,
              currentTransport,
              transportTime,
            );
            gl.uniform1i(layer.locations.transitionToOverlayImage, 3);
          }
          if (layer.locations.transitionToOverlayAspectRatio) {
            gl.uniform1f(
              layer.locations.transitionToOverlayAspectRatio,
              transitionToOverlayState?.aspectRatio ?? 1,
            );
          }
          if (layer.locations.time) {
            gl.uniform1f(layer.locations.time, shaderTime);
          }
          if (layer.locations.resolution) {
            gl.uniform2f(layer.locations.resolution, canvas.width, canvas.height);
          }

          for (const [name, definition] of Object.entries(layer.uniformDefinitions)) {
            const location = layer.locations.custom[name];
            const value = activeLayer.uniformValues[name] ?? layer.uniformValues[name];

            if (!location || value === undefined) {
              continue;
            }

            if (definition.type === 'float' || definition.type === 'int') {
              gl.uniform1f(location, Number(value));
            } else if (definition.type === 'bool') {
              gl.uniform1i(location, value ? 1 : 0);
            } else if (definition.type === 'vec3' && Array.isArray(value)) {
              gl.uniform3fv(location, value);
            }
          }

          gl.enableVertexAttribArray(layer.locations.position);
          gl.vertexAttribPointer(layer.locations.position, 2, gl.FLOAT, false, 0, 0);

          if (layer.requiresCompositeBase && options.compositeBaseTexture) {
            gl.disable(gl.BLEND);
          } else if (layer.compositeMode === 'stackOnTop') {
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          } else if (options.passLayerCount > 1 || activeOpacity < 0.999) {
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendColor(activeOpacity, activeOpacity, activeOpacity, activeOpacity);
            gl.blendFunc(gl.CONSTANT_COLOR, gl.ONE);
          } else {
            gl.disable(gl.BLEND);
          }

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        };

        if (blendBaseLayerIndex > 0) {
          compositeRenderTargetRef.current = ensureStageRenderTarget(
            gl,
            compositeRenderTargetRef.current,
            canvas.width,
            canvas.height,
          );
          gl.bindFramebuffer(gl.FRAMEBUFFER, compositeRenderTargetRef.current.framebuffer);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);

          for (let index = 0; index < blendBaseLayerIndex; index += 1) {
            drawCompiledLayer(compiledLayers[index], index, {
              compositeBaseTexture: null,
              passLayerCount: blendBaseLayerIndex,
            });
          }

          compositeBaseTexture = compositeRenderTargetRef.current.texture;
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const canvasLayerStart = blendBaseLayerIndex >= 0 ? blendBaseLayerIndex : 0;
        const canvasLayerCount = compiledLayers.length - canvasLayerStart;

        for (let index = canvasLayerStart; index < compiledLayers.length; index += 1) {
          drawCompiledLayer(compiledLayers[index], index, {
            compositeBaseTexture,
            passLayerCount: canvasLayerCount,
          });
        }

        gl.disable(gl.BLEND);

        renderWarningRef.current = null;
        onFrameRenderedRef.current?.({
          layersInSync,
          allProgramsReady,
          timeSeconds: transportTime,
        });
      } catch (error) {
        const nextWarning =
          error instanceof Error ? error.message : 'Stage render frame failed.';
        if (renderWarningRef.current !== nextWarning) {
          console.warn('Stage render frame failed.', error);
          renderWarningRef.current = nextWarning;
        }
        onFrameRenderedRef.current?.({
          layersInSync: false,
          allProgramsReady,
          timeSeconds: getTransportTimeSeconds(transportRef.current, timestamp),
        });
      } finally {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [defaultInputSource]);

  const mediaSurfaceStyle = useMemo<CSSProperties>(
    () => {
      const scaleX = Math.max(MIN_STAGE_SCALE, 1 + stageTransform.widthAdjust / shellSize.width);
      const scaleY = Math.max(MIN_STAGE_SCALE, 1 + stageTransform.heightAdjust / shellSize.height);

      return {
        transform: `translate(${stageTransform.offsetX}px, ${stageTransform.offsetY}px) scale(${scaleX}, ${scaleY})`,
      };
    },
    [shellSize.height, shellSize.width, stageTransform],
  );

  const hasRequiredInputSource = requiredInputSources.length > 0;
  const hasLoadingInputSource = requiredInputSources.some((source) => source.status === 'loading');
  const hasMissingOnlyInputSources =
    hasRequiredInputSource &&
    requiredInputSources.every((source) => source.status === 'missing');
  const showEmptyState =
    !hasRequiredInputSource ||
    hasMissingOnlyInputSources ||
    (hasLoadingInputSource && !hasBufferedMedia);
  const emptyStateCopy = !hasRequiredInputSource
    ? 'Load an image or video to drive the stage.'
    : hasLoadingInputSource && !hasBufferedMedia
      ? 'Restoring the stored asset from this device...'
      : 'The assigned asset is no longer available on this device. Load it again.';

  useEffect(() => {
    onCanvasReadyRef.current?.(canvasRef.current);

    return () => {
      onCanvasReadyRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    onRenderStateChangeRef.current?.({
      renderStatus,
      hasBufferedMedia,
      hasRequiredInputSource,
      hasLoadingInputSource,
      hasMissingOnlyInputSources,
      showEmptyState,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
    });
  }, [
    hasBufferedMedia,
    hasLoadingInputSource,
    hasMissingOnlyInputSources,
    hasRequiredInputSource,
    renderStatus,
    showEmptyState,
  ]);

  return (
    <div
      ref={shellRef}
      className={`stage-shell ${isOutputOnly ? 'stage-shell-output' : ''} ${
        personalPreviewActive ? 'stage-shell-personal-preview' : ''
      }`}
      title={isOutputOnly ? undefined : renderStatus}
    >
      <div
        ref={mediaSurfaceRef}
        className={`stage-media-surface${onStageDoubleClick ? ' stage-media-surface-navigable' : ''}`}
        style={mediaSurfaceStyle}
        title={onStageDoubleClick ? stageDoubleClickTitle ?? undefined : undefined}
        onDoubleClick={
          onStageDoubleClick
            ? (event) => {
                event.stopPropagation();
                onStageDoubleClick();
              }
            : undefined
        }
      >
        <canvas ref={canvasRef} className="stage-canvas" />
      </div>
      {showPinnedIndicator && !isOutputOnly ? (
        <button
          type="button"
          className="stage-pinned-indicator"
          title={
            pinnedIndicatorLabel
              ? `Edit pinned step: ${pinnedIndicatorLabel}`
              : 'Edit pinned step'
          }
          aria-label={
            pinnedIndicatorLabel
              ? `Edit pinned step: ${pinnedIndicatorLabel}`
              : 'Edit pinned step'
          }
          onClick={(event) => {
            event.stopPropagation();
            onPinnedIndicatorClick?.();
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="stage-pinned-indicator-icon">
            <path d="M5.1 3.1h5.8" />
            <path d="m10.4 3.3-.9 3.1 2 1.9H4.5l2-1.9-.9-3.1" />
            <path d="M8 8.3v4.6" />
            <path d="M6.8 12.9h2.4" />
          </svg>
        </button>
      ) : null}
      {showEmptyState ? (
        <div className="stage-empty">
          <p className="stage-empty-eyebrow">NO SIGNAL</p>
          <p className="stage-empty-copy">{emptyStateCopy}</p>
        </div>
      ) : null}
    </div>
  );
}
