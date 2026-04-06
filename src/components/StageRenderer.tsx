import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AssetRecord,
  PlaybackTransport,
  ShaderUniformMap,
  ShaderUniformValueMap,
  StageTransform,
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

export interface StageRenderLayer {
  shaderCode: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  opacity?: number;
}

interface ProgramLocations {
  position: number;
  time: WebGLUniformLocation | null;
  image: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  custom: Record<string, WebGLUniformLocation | null>;
}

interface CompiledRenderLayer extends StageRenderLayer {
  opacity: number;
  key: string;
  program: WebGLProgram;
  locations: ProgramLocations;
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

function disposeVideoElement(video: HTMLVideoElement | null | undefined) {
  if (!video) {
    return;
  }

  video.pause();
  video.src = '';
  video.load();
}

function syncVideoToTransport(
  video: HTMLVideoElement,
  transport: PlaybackTransport,
  nowMs = performance.now(),
  forceSeek = false,
) {
  video.loop = transport.loop;

  if (video.duration > 0) {
    const absoluteTime = getTransportTimeSeconds(transport, nowMs);
    const targetTime = transport.loop ? absoluteTime % video.duration : absoluteTime;

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
  const textureRef = useRef<WebGLTexture | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const renderWarningRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureUploadPendingRef = useRef(true);
  const lastVideoTextureTimeRef = useRef<number | null>(null);
  const mediaAspectRatioRef = useRef<number | null>(null);
  const transportRef = useRef(transport);
  const resolvedRenderLayersRef = useRef<StageRenderLayer[]>([]);
  const resolvedPreloadLayersRef = useRef<StageRenderLayer[]>([]);
  const [renderStatus, setRenderStatus] = useState('No asset loaded');
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [hasBufferedMedia, setHasBufferedMedia] = useState(false);
  const assetId = asset?.id ?? null;
  const assetKind = asset?.kind ?? null;
  const assetName = asset?.name ?? null;
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
            },
          ],
    [renderLayers, shaderCode, uniformDefinitions, uniformValues],
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
    const texture = gl.createTexture();
    if (!buffer || !texture) {
      onCompilerErrorRef.current?.('Unable to allocate the WebGL buffers.');
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

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
      new Uint8Array([0, 0, 0, 255]),
    );

    positionBufferRef.current = buffer;
    textureRef.current = texture;
    textureUploadPendingRef.current = true;
    lastVideoTextureTimeRef.current = null;

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      programCacheRef.current.forEach(({ program }) => {
        gl.deleteProgram(program);
      });
      programCacheRef.current.clear();
      compiledLayersRef.current = [];
      if (textureRef.current) {
        gl.deleteTexture(textureRef.current);
      }
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
    let disposed = false;
    const previouslyBufferedMedia =
      hasBufferedMedia || Boolean(imageRef.current) || Boolean(videoRef.current);

    if (!assetId || !assetKind || !assetUrl) {
      const existingVideo = videoRef.current;
      imageRef.current = null;
      videoRef.current = null;
      mediaAspectRatioRef.current = null;
      textureUploadPendingRef.current = true;
      lastVideoTextureTimeRef.current = null;
      setMediaAspectRatio(null);
      setHasBufferedMedia(false);
      setRenderStatus('No asset loaded');
      disposeVideoElement(existingVideo);
      return undefined;
    }

    if (assetKind === 'image') {
      const image = new Image();
      image.decoding = 'async';
      image.crossOrigin = 'anonymous';

      const handleImageReady = () => {
        if (disposed) {
          return;
        }
        const existingVideo = videoRef.current;
        imageRef.current = image;
        videoRef.current = null;
        const nextAspectRatio =
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? image.naturalWidth / image.naturalHeight
            : null;
        mediaAspectRatioRef.current = nextAspectRatio;
        textureUploadPendingRef.current = true;
        lastVideoTextureTimeRef.current = null;
        setMediaAspectRatio(nextAspectRatio);
        setHasBufferedMedia(true);
        setRenderStatus(assetName ?? 'Image asset');
        disposeVideoElement(existingVideo);
      };

      image.onload = handleImageReady;
      image.onerror = () => {
        if (disposed) {
          return;
        }
        if (!previouslyBufferedMedia) {
          imageRef.current = null;
          setHasBufferedMedia(false);
        }
        setRenderStatus('Unable to load image asset');
      };

      image.src = assetUrl;

      if (image.complete && image.naturalWidth > 0) {
        handleImageReady();
      } else if (typeof image.decode === 'function') {
        image
          .decode()
          .then(() => {
            handleImageReady();
          })
          .catch(() => {
            // Some browsers reject decode() for blob sources even though onload still fires.
          });
      }

      return () => {
        disposed = true;
        image.onload = null;
        image.onerror = null;
      };
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = assetUrl;
    video.onloadeddata = () => {
      if (disposed) {
        return;
      }
      imageRef.current = null;
      const existingVideo = videoRef.current;
      videoRef.current = video;
      const nextAspectRatio =
        video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : null;
      mediaAspectRatioRef.current = nextAspectRatio;
      textureUploadPendingRef.current = true;
      lastVideoTextureTimeRef.current = null;
      setMediaAspectRatio(nextAspectRatio);
      setHasBufferedMedia(true);
      setRenderStatus(assetName ?? 'Video asset');
      const currentTransport = transportRef.current;
      const targetTime = getTransportTimeSeconds(currentTransport);
      if (Number.isFinite(targetTime) && video.duration > 0) {
        video.currentTime = targetTime % video.duration;
      }
      if (currentTransport.isPlaying) {
        void video.play().catch(() => {});
      }
      if (existingVideo && existingVideo !== video) {
        disposeVideoElement(existingVideo);
      }
    };
    video.onerror = () => {
      if (disposed) {
        return;
      }
      if (!previouslyBufferedMedia) {
        videoRef.current = null;
        setHasBufferedMedia(false);
      }
      setRenderStatus('Unable to load video asset');
    };
    return () => {
      disposed = true;
      video.onloadeddata = null;
      video.onerror = null;
      if (videoRef.current !== video) {
        disposeVideoElement(video);
      }
    };
  }, [assetId, assetKind, assetName, assetUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || assetKind !== 'video') {
      return;
    }

    syncVideoToTransport(
      video,
      {
        isPlaying,
        currentTimeSeconds,
        anchorTimestampMs,
        playbackRate,
        loop,
        externalClockEnabled,
      },
      performance.now(),
      true,
    );
  }, [
    assetKind,
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
      const texture = textureRef.current;
      const buffer = positionBufferRef.current;
      const compiledLayers = compiledLayersRef.current;
      const video = videoRef.current;
      const image = imageRef.current;

      if (!gl || !canvas || !texture || !buffer || compiledLayers.length === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      try {
        const currentTransport = transportRef.current;
        const transportTime = getTransportTimeSeconds(currentTransport, timestamp);
        const shaderTime = transportTime;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        if (assetKind === 'video' && video && video.readyState >= 2) {
          if (currentTransport.isPlaying && video.duration > 0) {
            const targetTime = currentTransport.loop ? transportTime % video.duration : transportTime;
            if (Math.abs(video.currentTime - targetTime) > 0.25) {
              video.currentTime = targetTime;
            }
          }
          const shouldUploadVideoFrame =
            textureUploadPendingRef.current ||
            lastVideoTextureTimeRef.current === null ||
            Math.abs(video.currentTime - lastVideoTextureTimeRef.current) > 0.001;

          if (shouldUploadVideoFrame) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
            textureUploadPendingRef.current = false;
            lastVideoTextureTimeRef.current = video.currentTime;
          }
        } else if (assetKind === 'image' && image && textureUploadPendingRef.current) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          textureUploadPendingRef.current = false;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (const layer of compiledLayers) {
          gl.useProgram(layer.program);
          if (layer.locations.image) {
            gl.uniform1i(layer.locations.image, 0);
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
  }, [assetKind]);

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

  const showEmptyState =
    !asset || assetUrlStatus === 'missing' || (assetUrlStatus === 'loading' && !hasBufferedMedia);
  const emptyStateCopy = !asset
    ? 'Load an image or video to drive the stage.'
    : assetUrlStatus === 'loading'
      ? 'Restoring the stored asset from this device...'
      : 'The stored asset is no longer available on this device. Load it again.';

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
