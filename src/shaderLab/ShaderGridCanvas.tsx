import { useEffect, useRef, useState, type RefObject } from 'react';
import { buildFragmentShader, type ShaderGenome } from './shaderEvolution';
import type { AssetKind } from '../types';

const vertexSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

interface CompiledPreview {
  program: WebGLProgram;
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  image: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  scale: WebGLUniformLocation | null;
  warp: WebGLUniformLocation | null;
  depthRelief: WebGLUniformLocation | null;
  maskThreshold: WebGLUniformLocation | null;
}

export function ShaderGridCanvas({
  genomes,
  gridRef,
  assetUrl,
  assetKind,
}: {
  genomes: ShaderGenome[];
  gridRef: RefObject<HTMLElement | null>;
  assetUrl: string | null;
  assetKind: AssetKind | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [contextEpoch, setContextEpoch] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!canvas || !grid || !gl) {
      setFailed(true);
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    const handleContextRestored = () => {
      setContextEpoch((current) => current + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    if (!vertex) {
      setFailed(true);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      return;
    }

    const compiled = genomes.map<CompiledPreview | null>((genome) => {
      const fragment = compile(gl.FRAGMENT_SHADER, buildFragmentShader(genome));
      const program = fragment ? gl.createProgram() : null;
      if (!fragment || !program) return null;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return {
        program,
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        time: gl.getUniformLocation(program, 'u_time'),
        image: gl.getUniformLocation(program, 'u_image'),
        speed: gl.getUniformLocation(program, 'sporeSpeed'),
        scale: gl.getUniformLocation(program, 'sporeScale'),
        warp: gl.getUniformLocation(program, 'sporeWarp'),
        depthRelief: gl.getUniformLocation(program, 'depthRelief'),
        maskThreshold: gl.getUniformLocation(program, 'maskThreshold'),
      };
    });
    setFailed(compiled.some((preview) => !preview));

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

    let media: HTMLImageElement | HTMLVideoElement | null = null;
    let mediaReady = false;
    let disposed = false;
    if (assetUrl && assetKind === 'video') {
      const video = document.createElement('video');
      video.src = assetUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.addEventListener('canplay', () => { mediaReady = true; }, { once: true });
      void video.play().catch(() => undefined);
      media = video;
    } else if (assetUrl) {
      const image = new Image();
      image.onload = () => { mediaReady = true; };
      image.src = assetUrl;
      media = image;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let frame = 0;

    const render = (now: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.35);
      const gridRect = grid.getBoundingClientRect();
      const width = Math.max(1, Math.round(gridRect.width * ratio));
      const height = Math.max(1, Math.round(gridRect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (media && mediaReady) {
        try {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
        } catch {
          mediaReady = false;
        }
      }

      const previews = grid.querySelectorAll<HTMLElement>('[data-spore-preview]');
      previews.forEach((preview, index) => {
        const shader = compiled[index];
        if (!shader) return;
        const rect = preview.getBoundingClientRect();
        const x = Math.round((rect.left - gridRect.left) * ratio);
        const y = Math.round((gridRect.bottom - rect.bottom) * ratio);
        const previewWidth = Math.max(1, Math.round(rect.width * ratio));
        const previewHeight = Math.max(1, Math.round(rect.height * ratio));
        gl.viewport(x, y, previewWidth, previewHeight);
        gl.scissor(x, y, previewWidth, previewHeight);
        gl.useProgram(shader.program);
        const position = gl.getAttribLocation(shader.program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(shader.resolution, previewWidth, previewHeight);
        gl.uniform1f(shader.time, reducedMotion ? 6 : (now - startedAt) / 1000);
        gl.uniform1i(shader.image, 0);
        gl.uniform1f(shader.speed, genomes[index]?.speed ?? 0.4);
        gl.uniform1f(shader.scale, genomes[index]?.scale ?? 4.0);
        gl.uniform1f(shader.warp, genomes[index]?.warp ?? 0.7);
        gl.uniform1f(shader.depthRelief, 1.0);
        gl.uniform1f(shader.maskThreshold, 0.01);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      if (!disposed) frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      if (media instanceof HTMLVideoElement) {
        media.pause();
        media.removeAttribute('src');
        media.load();
      }
      compiled.forEach((preview) => {
        if (preview) gl.deleteProgram(preview.program);
      });
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
    };
  }, [assetKind, assetUrl, contextEpoch, genomes, gridRef]);

  return (
    <>
      <canvas ref={canvasRef} className="spore-grid-canvas" aria-hidden="true" />
      {failed ? (
        <div className="spore-grid-canvas-fallback">WebGL2 preview unavailable</div>
      ) : null}
    </>
  );
}
