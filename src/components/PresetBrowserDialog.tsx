import { useDeferredValue, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { SavedShader, ShaderTemplate, ShaderUniformValueMap } from '../types';
import {
  buildFragmentShaderSource,
  VERTEX_SHADER_SOURCE,
  parseUniforms,
} from '../lib/shader';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
} from '../lib/shaderState';

const TEMPLATE_ORDER: ShaderTemplate[] = ['stage', 'drawing', 'sculpture'];
const TEMPLATE_LABELS: Record<ShaderTemplate, string> = {
  stage: 'Stage',
  drawing: 'Drawing',
  sculpture: 'Sculpture',
};
const GROUP_ORDER: Record<ShaderTemplate, string[]> = {
  stage: [
    'Halos',
    'Scanners',
    'Lights',
    'Geometry',
    'Dots & Grids',
    'Spirals',
    'Organic Motion',
    'Eyes & Entities',
    'Fractals',
    'Masks & Contrast',
    'Experimental',
  ],
  drawing: ['Base', 'Ink Halos', 'Ink Flow', 'Scanner Bands', 'Op Art', 'Crosshatch Ritual'],
  sculpture: ['Base', 'Relief Halos', 'Chrome Relief', 'Laser Relief', 'Structural Relief', 'Patina Flow'],
};
const PREVIEW_WIDTH = 128;
const PREVIEW_HEIGHT = 96;
const PREVIEW_SOURCE_MAX_EDGE = 256;
const PREVIEW_FALLBACK_BG = '#050506';
const PREVIEW_IMAGE_QUALITY = 0.68;

interface PreviewRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  quadBuffer: WebGLBuffer;
  texture: WebGLTexture;
  vertexShader: WebGLShader;
}

interface PresetBrowserDialogProps {
  open: boolean;
  presets: SavedShader[];
  activeShaderId: string;
  assetUrl: string | null;
  onSelect: (shaderId: string) => void;
  onClose: () => void;
}

function getUniformValuesPreviewSignature(uniformValues: ShaderUniformValueMap | undefined): string {
  return JSON.stringify(
    Object.entries(uniformValues ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function getPresetGroup(preset: SavedShader): string {
  if (preset.group?.trim()) {
    return preset.group;
  }

  return 'Saved';
}

function getPresetTemplate(preset: SavedShader): ShaderTemplate {
  return preset.template ?? 'stage';
}

function sortGroups(template: ShaderTemplate, left: string, right: string): number {
  const order = GROUP_ORDER[template];
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);

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

function createPreviewMessageDataUrl(message: string) {
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

function createPreviewRenderer(): PreviewRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;

  const gl = canvas.getContext('webgl', {
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
  };
}

function destroyPreviewRenderer(renderer: PreviewRenderer | null) {
  if (!renderer) {
    return;
  }

  renderer.gl.deleteTexture(renderer.texture);
  renderer.gl.deleteBuffer(renderer.quadBuffer);
  renderer.gl.deleteShader(renderer.vertexShader);
  renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
}

function getPreviewRenderer(rendererRef: MutableRefObject<PreviewRenderer | null>) {
  if (!rendererRef.current) {
    rendererRef.current = createPreviewRenderer();
  }

  return rendererRef.current;
}

function renderPreviewToCanvas(
  shaderCode: string,
  uniformValues: ShaderUniformValueMap | undefined,
  image: HTMLCanvasElement,
  rendererRef: MutableRefObject<PreviewRenderer | null>,
) {
  const renderer = getPreviewRenderer(rendererRef);
  if (!renderer) {
    return createPreviewMessageDataUrl('Preview unavailable');
  }

  const { gl, canvas: renderCanvas, quadBuffer, texture, vertexShader } = renderer;
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragmentShader) {
    return createPreviewMessageDataUrl('Preview unavailable');
  }

  gl.shaderSource(fragmentShader, buildFragmentShaderSource(shaderCode));
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    gl.deleteShader(fragmentShader);
    return createPreviewMessageDataUrl('Shader error');
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(fragmentShader);
    return createPreviewMessageDataUrl('Preview unavailable');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    return createPreviewMessageDataUrl('Shader error');
  }

  gl.viewport(0, 0, renderCanvas.width, renderCanvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  if (posLoc === -1) {
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    return createPreviewMessageDataUrl('Preview unavailable');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const imgLoc = gl.getUniformLocation(program, 'u_image');
  if (imgLoc !== null) gl.uniform1i(imgLoc, 0);

  const timeLoc = gl.getUniformLocation(program, 'u_time');
  if (timeLoc !== null) gl.uniform1f(timeLoc, 1.0);

  const resLoc = gl.getUniformLocation(program, 'u_resolution');
  if (resLoc !== null) gl.uniform2f(resLoc, renderCanvas.width, renderCanvas.height);

  const uniforms = parseUniforms(shaderCode);
  for (const [name, def] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (loc === null) continue;
    const value = uniformValues?.[name] ?? def.default;
    if (def.type === 'float' || def.type === 'int') {
      gl.uniform1f(loc, Number(value));
    } else if (def.type === 'bool') {
      gl.uniform1i(loc, value ? 1 : 0);
    } else if (def.type === 'vec3' && Array.isArray(value)) {
      gl.uniform3fv(loc, value);
    }
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.finish();
  const previewSrc = renderCanvas.toDataURL('image/webp', PREVIEW_IMAGE_QUALITY);

  gl.disableVertexAttribArray(posLoc);
  gl.deleteProgram(program);
  gl.deleteShader(fragmentShader);
  return previewSrc;
}

function PreviewCard({
  preset,
  isActive,
  image,
  previewSrc,
  onRequestPreview,
  onSelect,
}: {
  preset: SavedShader;
  isActive: boolean;
  image: HTMLCanvasElement | null;
  previewSrc: string | null;
  onRequestPreview: () => void;
  onSelect: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
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
    if (isVisible && image && !previewSrc) {
      onRequestPreview();
    }
  }, [image, isVisible, onRequestPreview, previewSrc]);

  const presetGroup = getPresetGroup(preset);

  return (
    <button
      ref={cardRef}
      type="button"
      className={`preset-preview-card ${isActive ? 'preset-preview-card-active' : ''}`}
      onClick={onSelect}
    >
      <div className="preset-preview-shell">
        {isVisible && image && previewSrc ? (
          <img
            className="preset-preview-image"
            src={previewSrc}
            alt=""
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        ) : (
          <div className="preset-preview-placeholder">
            {image ? 'Loading snapshot...' : 'Load an asset to see previews'}
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
  const [query, setQuery] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<ShaderTemplate>('stage');
  const [loadedPreview, setLoadedPreview] = useState<{
    assetUrl: string;
    image: HTMLCanvasElement;
  } | null>(null);
  const [previewSources, setPreviewSources] = useState<Record<string, string>>({});
  const deferredQuery = useDeferredValue(query);
  const previewRendererRef = useRef<PreviewRenderer | null>(null);
  const previewSourceRef = useRef<Record<string, string>>({});
  const previewRequestsRef = useRef(new Set<string>());

  useEffect(() => {
    if (open) {
      return;
    }

    destroyPreviewRenderer(previewRendererRef.current);
    previewRendererRef.current = null;
  }, [open]);

  useEffect(
    () => () => {
      destroyPreviewRenderer(previewRendererRef.current);
      previewRendererRef.current = null;
    },
    [],
  );

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const currentTemplate =
      presets.find((preset) => preset.id === activeShaderId)?.template ?? 'stage';
    setActiveTemplate(currentTemplate);
  }, [open, presets, activeShaderId]);

  if (!open) return null;

  const image = assetUrl && loadedPreview?.assetUrl === assetUrl ? loadedPreview.image : null;
  const previewNamespace = assetUrl ?? '__no_asset__';
  const handleClose = () => {
    onClose();
  };
  const requestPreview = (preset: SavedShader) => {
    if (!image) {
      return;
    }

    const renderCode = getRenderableShaderCode(preset);
    const renderUniformValues = getRenderableShaderUniformValues(preset);
    const previewKey = `${previewNamespace}\u0000${preset.id}\u0000${renderCode}\u0000${getUniformValuesPreviewSignature(renderUniformValues)}`;
    if (previewSourceRef.current[previewKey] || previewRequestsRef.current.has(previewKey)) {
      return;
    }

    previewRequestsRef.current.add(previewKey);
    const previewSrc = renderPreviewToCanvas(
      renderCode,
      renderUniformValues,
      image,
      previewRendererRef,
    );
    previewRequestsRef.current.delete(previewKey);

    previewSourceRef.current = {
      ...previewSourceRef.current,
      [previewKey]: previewSrc,
    };

    setPreviewSources((current) => {
      if (current[previewKey]) {
        return current;
      }

      return {
        ...current,
        [previewKey]: previewSrc,
      };
    });
  };
  const selectedTemplate = TEMPLATE_ORDER.includes(activeTemplate) ? activeTemplate : 'stage';
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPresets = presets.filter((preset) => {
    if (getPresetTemplate(preset) !== selectedTemplate) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      preset.name,
      preset.description,
      preset.group,
      TEMPLATE_LABELS[getPresetTemplate(preset)],
      preset.id,
    ]
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
    .sort(([left], [right]) => sortGroups(selectedTemplate, left, right))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((left, right) => left.name.localeCompare(right.name)),
    }));

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
            <div className="preset-category-row" role="tablist" aria-label="Preset templates">
              {TEMPLATE_ORDER.map((template) => (
                <button
                  key={template}
                  type="button"
                  className={`preset-category-chip ${
                    template === selectedTemplate ? 'preset-category-chip-active' : ''
                  }`}
                  onClick={() => setActiveTemplate(template)}
                >
                  {TEMPLATE_LABELS[template]}
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
                        previewSrc={
                          previewSources[
                            `${previewNamespace}\u0000${preset.id}\u0000${getRenderableShaderCode(preset)}\u0000${getUniformValuesPreviewSignature(getRenderableShaderUniformValues(preset))}`
                          ] ?? null
                        }
                        onRequestPreview={() => requestPreview(preset)}
                        onSelect={() => {
                          onSelect(preset.id);
                          handleClose();
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
