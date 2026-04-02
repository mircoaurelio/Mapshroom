import { useEffect, useRef, useState } from 'react';
import {
  buildFragmentShaderSource,
  VERTEX_SHADER_SOURCE,
  parseUniforms,
} from '../lib/shader';

interface SavedShaderOption {
  id: string;
  name: string;
  code: string;
}

interface PresetBrowserDialogProps {
  open: boolean;
  presets: SavedShaderOption[];
  activeShaderId: string;
  assetUrl: string | null;
  onSelect: (shaderId: string) => void;
  onClose: () => void;
}

function renderPreviewToCanvas(
  canvas: HTMLCanvasElement,
  shaderCode: string,
  image: HTMLImageElement,
) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  gl.shaderSource(vs, VERTEX_SHADER_SOURCE);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return;

  gl.shaderSource(fs, buildFragmentShaderSource(shaderCode));
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return;

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const imgLoc = gl.getUniformLocation(program, 'u_image');
  if (imgLoc) gl.uniform1i(imgLoc, 0);

  const timeLoc = gl.getUniformLocation(program, 'u_time');
  if (timeLoc) gl.uniform1f(timeLoc, 1.0);

  const resLoc = gl.getUniformLocation(program, 'u_resolution');
  if (resLoc) gl.uniform2f(resLoc, canvas.width, canvas.height);

  const uniforms = parseUniforms(shaderCode);
  for (const [name, def] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (!loc) continue;
    if (def.type === 'float' || def.type === 'int') {
      gl.uniform1f(loc, Number(def.default));
    } else if (def.type === 'bool') {
      gl.uniform1i(loc, def.default ? 1 : 0);
    } else if (def.type === 'vec3' && Array.isArray(def.default)) {
      gl.uniform3fv(loc, def.default);
    }
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.deleteTexture(texture);
  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
}

function PreviewCard({
  preset,
  isActive,
  image,
  onSelect,
}: {
  preset: SavedShaderOption;
  isActive: boolean;
  image: HTMLImageElement | null;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    renderPreviewToCanvas(canvasRef.current, preset.code, image);
  }, [image, preset.code]);

  return (
    <button
      type="button"
      className={`preset-preview-card ${isActive ? 'preset-preview-card-active' : ''}`}
      onClick={onSelect}
    >
      <canvas
        ref={canvasRef}
        className="preset-preview-canvas"
        width={160}
        height={120}
      />
      <span className="preset-preview-name">{preset.name}</span>
      {isActive ? <span className="preset-preview-badge">Active</span> : null}
    </button>
  );
}

export function PresetBrowserDialog({
  open,
  presets,
  activeShaderId,
  assetUrl,
  onSelect,
  onClose,
}: PresetBrowserDialogProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loadedPreview, setLoadedPreview] = useState<{
    assetUrl: string;
    image: HTMLImageElement;
  } | null>(null);

  useEffect(() => {
    if (!open || !assetUrl) {
      return;
    }

    let disposed = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!disposed) {
        setLoadedPreview({ assetUrl, image: img });
      }
    };
    img.src = assetUrl;

    return () => {
      disposed = true;
      img.onload = null;
    };
  }, [open, assetUrl]);

  if (!open) return null;

  const image = assetUrl && loadedPreview?.assetUrl === assetUrl ? loadedPreview.image : null;
  const handleClose = () => {
    setPendingId(null);
    onClose();
  };

  const pendingPreset = pendingId
    ? presets.find((p) => p.id === pendingId)
    : null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section className="dialog-panel preset-browser-panel" role="dialog" aria-modal="true">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Presets</span>
            <h2 className="dialog-title">Shader Library</h2>
          </div>
          <button type="button" className="ghost-button" onClick={handleClose}>
            Close
          </button>
        </header>

        <div className="dialog-body preset-browser-body">
          {pendingPreset ? (
            <div className="preset-confirm">
              <p>
                Load <strong>{pendingPreset.name}</strong>?
              </p>
              <p className="preset-confirm-note">
                This will replace your current shader and clear the chat history.
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    onSelect(pendingPreset.id);
                    handleClose();
                  }}
                >
                  Load Preset
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPendingId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="preset-preview-grid">
              {presets.map((preset) => (
                <PreviewCard
                  key={preset.id}
                  preset={preset}
                  isActive={preset.id === activeShaderId}
                  image={image}
                  onSelect={() => setPendingId(preset.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
