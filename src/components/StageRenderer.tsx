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
  stageTransform: StageTransform;
  transport: PlaybackTransport;
  isOutputOnly?: boolean;
  onCompilerError?: (message: string) => void;
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
  resolution: WebGLUniformLocation | null;
  custom: Record<string, WebGLUniformLocation | null>;
}

interface CompiledRenderLayer extends StageRenderLayer {
  opacity: number;
  key: string;
  program: WebGLProgram;
  locations: ProgramLocations;
}

interface StageTextureSourceState {
  source: StageRenderInputSource;
  texture: WebGLTexture | null;
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
  textureUploadPending: boolean;
  lastVideoTextureTime: number | null;
  aspectRatio: number | null;
  status: 'loading' | 'ready' | 'error';
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
) {
  video.loop = transport.loop;

  if (video.duration > 0) {
    const absoluteTime = getTransportTimeSeconds(transport, nowMs);
    const targetTime = getClippedVideoTime(source, absoluteTime, video.duration, transport.loop);

    if (forceSeek || Math.abs(video.currentTime - targetTime) > 0.08) {
      video.currentTime = targetTime;
    }
  }

  if (transport.isPlaying) {
    void video.play().catch(() => {});
    return;
  }

  video.pause();
}

function disposeTextureSourceState(
  gl: WebGLRenderingContext | null,
  state: StageTextureSourceState | null | undefined,
) {
  if (!state) {
    return;
  }

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
    onReady(state.source.sourceKey, state.aspectRatio, source.assetName || 'Video asset');
  };
  video.onerror = () => {
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

  syncVideoToTransport(state.video, state.source, transport, performance.now(), true);
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
      if (Math.abs(state.video.currentTime - targetTime) > 0.25) {
        state.video.currentTime = targetTime;
      }
    }

    const shouldUploadVideoFrame =
      state.textureUploadPending ||
      state.lastVideoTextureTime === null ||
      Math.abs(state.video.currentTime - state.lastVideoTextureTime) > 0.001;

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
  stageTransform,
  transport,
  isOutputOnly = false,
  onCompilerError,
}: StageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programCacheRef = useRef<
    Map<string, { program: WebGLProgram; locations: ProgramLocations }>
  >(new Map());
  const compiledLayersRef = useRef<CompiledRenderLayer[]>([]);
  const onCompilerErrorRef = useRef(onCompilerError);
  const textureSourcesRef = useRef<Map<string, StageTextureSourceState>>(new Map());
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const renderWarningRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaAspectRatioRef = useRef<number | null>(null);
  const transportRef = useRef(transport);
  const resolvedRenderLayersRef = useRef<StageRenderLayer[]>([]);
  const resolvedPreloadLayersRef = useRef<StageRenderLayer[]>([]);
  const [renderStatus, setRenderStatus] = useState('No asset loaded');
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [hasBufferedMedia, setHasBufferedMedia] = useState(false);
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
        : null,
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

    return Array.from(sources.values());
  }, [defaultInputSource, resolvedPreloadLayers, resolvedRenderLayers]);
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
    resolvedRenderLayersRef.current = resolvedRenderLayers;
    const compiledByKey = new Map(
      compiledLayersRef.current.map((layer) => [layer.key, layer] as const),
    );

    compiledLayersRef.current = resolvedRenderLayers.flatMap((layer, index) => {
      const key = `${layer.shaderCode}:${index}`;
      const existingLayer = compiledByKey.get(key);
      if (!existingLayer) {
        return [];
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
  }, [resolvedRenderLayers]);

  useEffect(() => {
    resolvedPreloadLayersRef.current = resolvedPreloadLayers;
  }, [resolvedPreloadLayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      onCompilerErrorRef.current?.('WebGL is not available in this browser.');
      return;
    }

    glRef.current = gl;

    const buffer = gl.createBuffer();
    if (!buffer) {
      onCompilerErrorRef.current?.('Unable to allocate the WebGL buffers.');
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    positionBufferRef.current = buffer;

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      programCacheRef.current.forEach(({ program }) => {
        gl.deleteProgram(program);
      });
      programCacheRef.current.clear();
      compiledLayersRef.current = [];
      textureSourcesRef.current.forEach((state) => {
        disposeTextureSourceState(gl, state);
      });
      textureSourcesRef.current.clear();
      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
      }
      glRef.current = null;
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
  }, [mediaAspectRatio]);

  useEffect(() => {
    const gl = glRef.current;
    if (!gl) {
      return;
    }

    const requiredLayers = [
      ...resolvedRenderLayersRef.current,
      ...resolvedPreloadLayersRef.current,
    ];
    const requiredShaderCodes = new Set(requiredLayers.map((layer) => layer.shaderCode));
    for (const [key, cachedProgram] of programCacheRef.current.entries()) {
      if (requiredShaderCodes.has(key)) {
        continue;
      }

      gl.deleteProgram(cachedProgram.program);
      programCacheRef.current.delete(key);
    }

    const nextCompiledLayers: CompiledRenderLayer[] = [];
    let firstError = '';

    try {
      for (const [index, layer] of requiredLayers.entries()) {
        const key = layer.shaderCode;
        let cachedProgram = programCacheRef.current.get(key);

        if (!cachedProgram) {
          cachedProgram = createProgramBundle(gl, layer.shaderCode, layer.uniformDefinitions);
          programCacheRef.current.set(key, cachedProgram);
        }

        if (index < resolvedRenderLayersRef.current.length) {
          nextCompiledLayers.push({
            ...layer,
            opacity: Number.isFinite(layer.opacity) ? Number(layer.opacity) : 1,
            key: `${key}:${index}`,
            program: cachedProgram.program,
            locations: cachedProgram.locations,
          });
        }
      }
    } catch (error) {
      firstError = error instanceof Error ? error.message : 'Unknown GLSL compilation error.';
    }

    compiledLayersRef.current = nextCompiledLayers;
    onCompilerErrorRef.current?.(firstError ? `GLSL Error: ${firstError}` : '');
  }, [renderLayerShaderSignature, shaderCompileNonce]);

  useEffect(() => {
    const gl = glRef.current;
    if (!gl) {
      return;
    }

    const textureSources = textureSourcesRef.current;
    const requiredSourceIds = new Set(requiredInputSources.map((source) => source.sourceKey));
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
  }, [preferredAspectSourceId, requiredInputSourceSignature, requiredInputSources]);

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

      if (!gl || !canvas || !buffer || compiledLayers.length === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      try {
        const currentTransport = transportRef.current;
        const transportTime = getTransportTimeSeconds(currentTransport, timestamp);
        const shaderTime = transportTime;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (const layer of compiledLayers) {
          const primarySource =
            layer.inputSource ??
            defaultInputSource ??
            layer.transitionInputSources?.from ??
            layer.transitionInputSources?.to ??
            null;
          const primaryState = primarySource
            ? textureSources.get(primarySource.sourceKey) ?? null
            : null;
          const overlaySource = layer.overlaySource ?? null;
          const overlayState = overlaySource
            ? textureSources.get(overlaySource.sourceKey) ?? null
            : null;
          const transitionFromSource = layer.transitionInputSources?.from ?? primarySource;
          const transitionToSource = layer.transitionInputSources?.to ?? primarySource;
          const transitionFromState = transitionFromSource
            ? textureSources.get(transitionFromSource.sourceKey) ?? primaryState
            : primaryState;
          const transitionToState = transitionToSource
            ? textureSources.get(transitionToSource.sourceKey) ?? primaryState
            : primaryState;
          const transitionFromOverlaySource =
            layer.transitionOverlaySources?.from ?? overlaySource;
          const transitionToOverlaySource =
            layer.transitionOverlaySources?.to ?? overlaySource;
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
            const value = layer.uniformValues[name];

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

          if (compiledLayers.length > 1 || layer.opacity < 0.999) {
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendColor(layer.opacity, layer.opacity, layer.opacity, layer.opacity);
            gl.blendFunc(gl.CONSTANT_COLOR, gl.ONE);
          } else {
            gl.disable(gl.BLEND);
          }

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        gl.disable(gl.BLEND);

        renderWarningRef.current = null;
      } catch (error) {
        const nextWarning =
          error instanceof Error ? error.message : 'Stage render frame failed.';
        if (renderWarningRef.current !== nextWarning) {
          console.warn('Stage render frame failed.', error);
          renderWarningRef.current = nextWarning;
        }
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
    () => ({
      left: `${stageTransform.widthAdjust * -0.5}px`,
      top: `${stageTransform.heightAdjust * -0.5}px`,
      width: `calc(100% + ${stageTransform.widthAdjust}px)`,
      height: `calc(100% + ${stageTransform.heightAdjust}px)`,
      transform: `translate(${stageTransform.offsetX}px, ${stageTransform.offsetY}px)`,
    }),
    [stageTransform],
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

  return (
    <div
      className={`stage-shell ${isOutputOnly ? 'stage-shell-output' : ''}`}
      title={isOutputOnly ? undefined : renderStatus}
    >
      <div ref={mediaSurfaceRef} className="stage-media-surface" style={mediaSurfaceStyle}>
        <canvas ref={canvasRef} className="stage-canvas" />
      </div>
      {showEmptyState ? (
        <div className="stage-empty">
          <p className="stage-empty-eyebrow">NO SIGNAL</p>
          <p className="stage-empty-copy">{emptyStateCopy}</p>
        </div>
      ) : null}
    </div>
  );
}
