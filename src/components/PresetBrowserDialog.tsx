import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { SavedShader } from '../types';
import {
  buildFragmentShaderSource,
  VERTEX_SHADER_SOURCE,
  parseUniforms,
} from '../lib/shader';

const GROUP_ORDER = ['Glow', 'Color', 'Graphic', 'Geometry', 'Motion', 'Default', 'Saved'];
const PREVIEW_WIDTH = 128;
const PREVIEW_HEIGHT = 96;
const PREVIEW_SOURCE_MAX_EDGE = 256;

interface PresetBrowserDialogProps {
  open: boolean;
  presets: SavedShader[];
  activeShaderId: string;
  assetUrl: string | null;
  onSelect: (shaderId: string) => void;
  onClose: () => void;
}

function getPresetGroup(preset: SavedShader): string {
  if (preset.group?.trim()) {
    return preset.group;
  }

  return preset.id.startsWith('default_') ? 'Default' : 'Saved';
}

function sortGroups(left: string, right: string): number {
  const leftIndex = GROUP_ORDER.indexOf(left);
  const rightIndex = GROUP_ORDER.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right);
  }
  if (leftIndex === -1) {
    return 1;
  }
  if (rightIndex === -1) {
    return -1;
  }

  return leftIndex - rightIndex;
}

function createPreviewSource(image: HTMLImageElement) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

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
  context.drawImage(image, 0, 0, nextWidth, nextHeight);
  return canvas;
}

function renderPreviewToCanvas(
  canvas: HTMLCanvasElement,
  shaderCode: string,
  image: HTMLCanvasElement,
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
  preset: SavedShader;
  isActive: boolean;
  image: HTMLCanvasElement | null;
  onSelect: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible || !cardRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px' },
    );

    observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !canvasRef.current || !image) return;
    renderPreviewToCanvas(canvasRef.current, preset.code, image);
  }, [image, isVisible, preset.code]);

  const presetGroup = getPresetGroup(preset);

  return (
    <button
      ref={cardRef}
      type="button"
      className={`preset-preview-card ${isActive ? 'preset-preview-card-active' : ''}`}
      onClick={onSelect}
    >
      <div className="preset-preview-shell">
        {isVisible && image ? (
          <canvas
            ref={canvasRef}
            className="preset-preview-canvas"
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        ) : (
          <div className="preset-preview-placeholder">
            {image ? 'Loading preview...' : 'Load an asset to see previews'}
          </div>
        )}
      </div>
      <div className="preset-preview-meta">
        <div className="preset-preview-header">
          <span className="preset-preview-name">{preset.name}</span>
          <span className="preset-preview-tag">{isActive ? 'Active' : presetGroup}</span>
        </div>
        <p className="preset-preview-copy">
          {preset.description ?? 'Shader preset ready to load into the stage.'}
        </p>
      </div>
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
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loadedPreview, setLoadedPreview] = useState<{
    assetUrl: string;
    image: HTMLCanvasElement;
  } | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!open || !assetUrl) {
      return;
    }

    let disposed = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const previewSource = createPreviewSource(img);
      if (!previewSource) {
        return;
      }
      if (!disposed) {
        setLoadedPreview({ assetUrl, image: previewSource });
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
  const categories = ['All', ...Array.from(new Set(presets.map(getPresetGroup))).sort(sortGroups)];
  const selectedCategory = categories.includes(activeCategory) ? activeCategory : 'All';
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPresets = presets.filter((preset) => {
    const matchesCategory =
      selectedCategory === 'All' || getPresetGroup(preset) === selectedCategory;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [preset.name, preset.description, preset.group, preset.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const groupedPresets = Array.from(
    filteredPresets.reduce((groups, preset) => {
      const group = getPresetGroup(preset);
      const items = groups.get(group) ?? [];
      items.push(preset);
      groups.set(group, items);
      return groups;
    }, new Map<string, SavedShader[]>()),
  )
    .sort(([left], [right]) => sortGroups(left, right))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((left, right) => left.name.localeCompare(right.name)),
    }));

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
            <>
              <div className="preset-browser-toolbar">
                <div className="field-inline-label">
                  <span>Preset Browser</span>
                  <small>{filteredPresets.length} results</small>
                </div>
                <input
                  className="text-field preset-browser-search"
                  placeholder="Search presets..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className="preset-category-row" role="tablist" aria-label="Preset categories">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`preset-category-chip ${
                        category === selectedCategory ? 'preset-category-chip-active' : ''
                      }`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {groupedPresets.length === 0 ? (
                <p className="empty-copy">No presets match this filter.</p>
              ) : (
                <div className="preset-group-stack">
                  {groupedPresets.map(({ group, items }) => (
                    <section className="preset-group" key={group}>
                      <div className="preset-group-header">
                        <strong className="preset-group-title">{group}</strong>
                        <span className="preset-group-count">{items.length}</span>
                      </div>
                      <div className="preset-preview-grid">
                        {items.map((preset) => (
                          <PreviewCard
                            key={preset.id}
                            preset={preset}
                            isActive={preset.id === activeShaderId}
                            image={image}
                            onSelect={() => setPendingId(preset.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
