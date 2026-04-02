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

interface StageRendererProps {
  asset: AssetRecord | null;
  assetUrl: string | null;
  shaderCode: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  stageTransform: StageTransform;
  transport: PlaybackTransport;
  isOutputOnly?: boolean;
  onCompilerError?: (message: string) => void;
}

interface ProgramLocations {
  position: number;
  time: WebGLUniformLocation | null;
  image: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  custom: Record<string, WebGLUniformLocation | null>;
}

const DEFAULT_LOCATIONS: ProgramLocations = {
  position: -1,
  time: null,
  image: null,
  resolution: null,
  custom: {},
};

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

export function StageRenderer({
  asset,
  assetUrl,
  shaderCode,
  uniformDefinitions,
  uniformValues,
  stageTransform,
  transport,
  isOutputOnly = false,
  onCompilerError,
}: StageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const locationsRef = useRef<ProgramLocations>(DEFAULT_LOCATIONS);
  const rafRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transportRef = useRef(transport);
  const [renderStatus, setRenderStatus] = useState('No asset loaded');
  const assetId = asset?.id ?? null;
  const assetKind = asset?.kind ?? null;
  const assetName = asset?.name ?? null;

  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      onCompilerError?.('WebGL is not available in this browser.');
      return;
    }

    glRef.current = gl;

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) {
      onCompilerError?.('Unable to allocate the WebGL buffers.');
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

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
      }
      if (textureRef.current) {
        gl.deleteTexture(textureRef.current);
      }
      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
      }
      glRef.current = null;
    };
  }, [onCompilerError]);

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
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
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
  }, []);

  useEffect(() => {
    const gl = glRef.current;
    if (!gl) {
      return;
    }

    try {
      const vertexShader = compileShaderRaw(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fragmentShader = compileShaderRaw(
        gl,
        gl.FRAGMENT_SHADER,
        buildFragmentShaderSource(shaderCode),
      );

      const nextProgram = gl.createProgram();
      if (!nextProgram) {
        throw new Error('Unable to create the WebGL program.');
      }
      gl.attachShader(nextProgram, vertexShader);
      gl.attachShader(nextProgram, fragmentShader);
      gl.linkProgram(nextProgram);

      if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(nextProgram) || 'GLSL link error.');
      }

      if (programRef.current) {
        gl.deleteProgram(programRef.current);
      }

      programRef.current = nextProgram;
      locationsRef.current = {
        position: gl.getAttribLocation(nextProgram, 'a_position'),
        time: gl.getUniformLocation(nextProgram, 'u_time'),
        image: gl.getUniformLocation(nextProgram, 'u_image'),
        resolution: gl.getUniformLocation(nextProgram, 'u_resolution'),
        custom: Object.fromEntries(
          Object.keys(uniformDefinitions).map((name) => [
            name,
            gl.getUniformLocation(nextProgram, name),
          ]),
        ),
      };

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      onCompilerError?.('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown GLSL compilation error.';
      onCompilerError?.(`GLSL Error: ${message}`);
    }
  }, [shaderCode, uniformDefinitions, onCompilerError]);

  useEffect(() => {
    let disposed = false;
    imageRef.current = null;

    const existingVideo = videoRef.current;
    if (existingVideo) {
      existingVideo.pause();
      existingVideo.src = '';
      existingVideo.load();
      videoRef.current = null;
    }

    if (!assetId || !assetKind || !assetUrl) {
      setRenderStatus('No asset loaded');
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
        imageRef.current = image;
        setRenderStatus(assetName ?? 'Image asset');
      };

      image.onload = handleImageReady;
      image.onerror = () => {
        if (disposed) {
          return;
        }
        imageRef.current = null;
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
        if (imageRef.current === image) {
          imageRef.current = null;
        }
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
      setRenderStatus(assetName ?? 'Video asset');
      const currentTransport = transportRef.current;
      const targetTime = getTransportTimeSeconds(currentTransport);
      if (Number.isFinite(targetTime) && video.duration > 0) {
        video.currentTime = targetTime % video.duration;
      }
      if (currentTransport.isPlaying) {
        void video.play().catch(() => {});
      }
    };
    video.onerror = () => {
      if (disposed) {
        return;
      }
      setRenderStatus('Unable to load video asset');
    };
    videoRef.current = video;
    return () => {
      disposed = true;
      video.onloadeddata = null;
      video.onerror = null;
      video.pause();
      video.src = '';
      video.load();
      if (videoRef.current === video) {
        videoRef.current = null;
      }
    };
  }, [assetId, assetKind, assetName, assetUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || asset?.kind !== 'video') {
      return;
    }

    video.loop = transport.loop;

    if (!transport.isPlaying) {
      video.pause();
      if (video.duration > 0) {
        const targetTime = getTransportTimeSeconds(transport) % video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.1) {
          video.currentTime = targetTime;
        }
      }
      return;
    }

    void video.play().catch(() => {});
  }, [asset, transport]);

  useEffect(() => {
    const render = (timestamp: number) => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      const texture = textureRef.current;
      const buffer = positionBufferRef.current;
      const video = videoRef.current;
      const image = imageRef.current;

      if (!gl || !program || !canvas || !texture || !buffer) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const shaderTime = getTransportTimeSeconds(transport, timestamp);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      if (asset?.kind === 'video' && video && video.readyState >= 2) {
        if (video.duration > 0) {
          const targetTime = transport.loop ? shaderTime % video.duration : shaderTime;
          if (Math.abs(video.currentTime - targetTime) > 0.25) {
            video.currentTime = targetTime;
          }
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } else if (asset?.kind === 'image' && image) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      }

      if (locationsRef.current.image) {
        gl.uniform1i(locationsRef.current.image, 0);
      }
      if (locationsRef.current.time) {
        gl.uniform1f(locationsRef.current.time, shaderTime);
      }
      if (locationsRef.current.resolution) {
        gl.uniform2f(locationsRef.current.resolution, canvas.width, canvas.height);
      }

      for (const [name, definition] of Object.entries(uniformDefinitions)) {
        const location = locationsRef.current.custom[name];
        const value = uniformValues[name];

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

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(locationsRef.current.position);
      gl.vertexAttribPointer(locationsRef.current.position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [asset, shaderCode, transport, uniformDefinitions, uniformValues]);

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

  return (
    <div
      className={`stage-shell ${isOutputOnly ? 'stage-shell-output' : ''}`}
      title={isOutputOnly ? undefined : renderStatus}
    >
      <div ref={mediaSurfaceRef} className="stage-media-surface" style={mediaSurfaceStyle}>
        <canvas ref={canvasRef} className="stage-canvas" />
      </div>
      {!asset ? (
        <div className="stage-empty">
          <p className="stage-empty-eyebrow">NO SIGNAL</p>
          <p className="stage-empty-copy">Load an image or video to drive the stage.</p>
        </div>
      ) : null}
    </div>
  );
}
