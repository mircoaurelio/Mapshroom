import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { StageDistortion, StageTransform } from '../types';
import { DEFAULT_STAGE_DISTORTION } from '../lib/distortion';
import { loadOutputViewportSnapshot } from '../lib/outputViewport';
import { parseMappingPositionFile } from '../lib/mappingPosition';
import { projectionImageSize, resizeProjectionImage } from '../lib/projectionFraming';
import { hasStageFrameCalibration } from '../lib/assetReplacement';
import { MappingPad, type MappingAction } from './MappingPad';
import { ProjectionCornerControls } from './ProjectionCornerControls';
import { mappingKeyboardAction } from '../lib/mappingKeyboard';
import './ProjectionPage.css';

interface ProjectionPageProps {
  section: 'move' | 'output';
  sessionId: string;
  transform: StageTransform;
  assetName: string | null;
  assetAspectRatio: number;
  assetUrl: string | null;
  assetKind: 'image' | 'video';
  assetReady: boolean;
  shaderError: string | null;
  outputOpen: boolean;
  outputMessage: string;
  isPlaying: boolean;
  onChange: (patch: Partial<StageTransform>) => void;
  onOpenOutput: () => void;
  onPlayToggle: () => void;
  onSelectSection: (section: 'asset' | 'move' | 'workspace') => void;
  onExport: (source?: string) => void;
  keyboardEnabled?: boolean;
  getPositionJson: () => string;
  renderPreview: (transform: StageTransform, onDistortionChange: (value: StageDistortion) => void) => ReactNode;
}

function Icon({ name }: { name: 'fit' | 'reset' | 'undo' | 'redo' | 'link' | 'grid' | 'export' | 'import' | 'play' | 'pause' | 'arrow' }) {
  const paths = {
    fit: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    reset: 'M4 9a8 8 0 1 1 0 6M4 3v6h6',
    undo: 'M9 4 3 10l6 6M3 10h11a6 6 0 0 1 0 12',
    redo: 'm15 4 6 6-6 6m6-6H10a6 6 0 0 0 0 12',
    link: 'm10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1',
    grid: 'M3 3h18v18H3Zm6 0v18m6-18v18M3 9h18M3 15h18',
    export: 'M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5',
    import: 'M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5',
    play: 'm7 3 14 9-14 9Z',
    pause: 'M8 3v18M16 3v18',
    arrow: 'M3 12h18m-7-7 7 7-7 7',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function NumericField({ label, value, unit = 'px', step = 1, min, max, onChange }: {
  label: string; value: number; unit?: string; step?: number; min?: number; max?: number; onChange: (value: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formattedValue = String(Math.round(value * 10) / 10);
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.value = formattedValue;
  }, [formattedValue]);
  return <label className="projection-number-field"><span>{label}</span><span className="projection-number-input">
    <input ref={inputRef} type="number" aria-label={label} defaultValue={formattedValue} min={min} max={max} step={step}
      onBlur={(event) => { event.currentTarget.value = formattedValue; }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (Number.isFinite(next)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
      }} /><span>{unit}</span>
  </span></label>;
}

function GuideStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className={`projection-guide-step projection-guide-step-${number}`}><span className="projection-step-number">{number}</span><div><strong>{title}</strong><p>{children}</p></div></div>;
}

function ProjectionPreview({ render, transform, onDistortionChange }: {
  render: ProjectionPageProps['renderPreview'];
  transform: StageTransform;
  onDistortionChange: (value: StageDistortion) => void;
}) {
  return render(transform, onDistortionChange);
}

export function ProjectionPage(props: ProjectionPageProps) {
  const { section, transform, sessionId, assetReady, outputOpen, onChange } = props;
  const isMove = section === 'move';
  const [linked, setLinked] = useState(true);
  const [safeArea, setSafeArea] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [positionMessage, setPositionMessage] = useState('');
  const [history, setHistory] = useState<{ past: StageTransform[]; future: StageTransform[] }>({ past: [], future: [] });
  const lastEdit = useRef(0);
  const correctedSource = useRef<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });
  const [mediaRatio, setMediaRatio] = useState<{ url: string; ratio: number } | null>(null);
  const [outputViewport, setOutputViewport] = useState(() => loadOutputViewportSnapshot(sessionId));

  useEffect(() => {
    pageRef.current?.scrollTo(0, 0);
    inspectorRef.current?.scrollTo(0, 0);
  }, [section]);

  useEffect(() => {
    const url = props.assetUrl;
    if (!url) return;
    let disposed = false;
    if (props.assetKind === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => { if (!disposed && video.videoHeight) setMediaRatio({ url, ratio: video.videoWidth / video.videoHeight }); };
      video.src = url;
      return () => { disposed = true; video.removeAttribute('src'); video.load(); };
    }
    const image = new Image();
    image.onload = () => { if (!disposed && image.naturalHeight) setMediaRatio({ url, ratio: image.naturalWidth / image.naturalHeight }); };
    image.src = url;
    return () => { disposed = true; };
  }, [props.assetUrl, props.assetKind]);

  useEffect(() => {
    const sync = () => {
      const next = loadOutputViewportSnapshot(sessionId);
      setOutputViewport((current) => current?.width === next?.width && current?.height === next?.height ? current : next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [sessionId]);

  useLayoutEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    setPreviewSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(([entry]) => setPreviewSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewport = outputViewport ?? { width: 1920, height: 1080 };
  const aspectRatio = transform.referenceAspectRatio ?? (mediaRatio?.url === props.assetUrl ? mediaRatio?.ratio : undefined) ?? props.assetAspectRatio;
  const naturalRatio = (mediaRatio?.url === props.assetUrl ? mediaRatio?.ratio : undefined) ?? props.assetAspectRatio;
  // Repair legacy frames captured from the empty stage, without discarding a
  // resized/warped calibration or reapplying this after a position import.
  useEffect(() => {
    if (!isMove || !mediaRatio || mediaRatio.url !== props.assetUrl || correctedSource.current === mediaRatio.url) return;
    correctedSource.current = mediaRatio.url;
    if (!hasStageFrameCalibration(transform) && transform.referenceAspectRatio !== mediaRatio.ratio) {
      onChange({ referenceAspectRatio: mediaRatio.ratio });
    }
  }, [isMove, mediaRatio, props.assetUrl, transform, onChange]);

  const imageSize = projectionImageSize(transform, viewport, aspectRatio);
  const scale = Math.max(0.001, Math.min((previewSize.width - 48) / viewport.width, (previewSize.height - 48) / viewport.height)) * zoom;
  const edit = (patch: Partial<StageTransform>, grouped = false) => {
    if (!grouped || Date.now() - lastEdit.current > 400) {
      setHistory((current) => ({ past: [...current.past.slice(-79), transform], future: [] }));
    }
    lastEdit.current = grouped ? Date.now() : 0;
    onChange(patch);
  };
  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({ past: history.past.slice(0, -1), future: [transform, ...history.future] });
    lastEdit.current = 0;
    onChange(previous);
  };
  const redo = () => {
    const next = history.future[0];
    if (!next) return;
    setHistory({ past: [...history.past, transform], future: history.future.slice(1) });
    lastEdit.current = 0;
    onChange(next);
  };
  const resize = (axis: 'width' | 'height', value: number) => edit(resizeProjectionImage(transform, viewport, aspectRatio, axis, value, linked));
  const handleAction = (action: MappingAction) => {
    const directions = { 'move-left': [-1, 0], 'move-right': [1, 0], 'move-up': [0, -1], 'move-down': [0, 1] };
    if (action in directions) {
      const [x, y] = directions[action as keyof typeof directions];
      edit({ offsetX: transform.offsetX + x * transform.precision, offsetY: transform.offsetY + y * transform.precision }, true);
    } else {
      const axis = action.startsWith('width') ? 'width' : 'height';
      resize(axis, imageSize[axis] + (action.endsWith('plus') ? 1 : -1) * transform.precision);
    }
  };
  const onKeyboard = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const editing = Boolean(target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="slider"], [role="spinbutton"]'));
    const action = mappingKeyboardAction(event, editing);
    if (!action) return;
    event.preventDefault();
    if (action === 'undo') undo();
    else if (action === 'redo') redo();
    else handleAction(action);
  });
  useEffect(() => {
    if (!isMove || !assetReady || props.keyboardEnabled === false) return;
    window.addEventListener('keydown', onKeyboard);
    return () => window.removeEventListener('keydown', onKeyboard);
  }, [isMove, assetReady, props.keyboardEnabled]);
  const importPosition = (source: string): string | null => {
    try {
      edit(parseMappingPositionFile(source));
      setPositionMessage('');
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import position.';
      setPositionMessage('');
      return message;
    }
  };
  const openButton = <button type="button" className="projection-primary" onClick={props.onOpenOutput}>{outputOpen ? 'Show output window' : 'Open output window'}<Icon name="arrow" /></button>;

  return <section ref={pageRef} className={`projection-page projection-page-${section}`} aria-label={`${isMove ? 'Move' : 'Output'} page`}>
    {!isMove && <>
      <header className="projection-page-header">
        <div><h1>Output preview</h1><p>Preview your projection and send it to a projector or second display.</p></div>
        <div className="projection-toolbar-actions">
          <span className="projection-window-status" role="status"><i className={outputOpen ? 'is-open' : ''} />{outputOpen ? 'Window open' : 'Window closed'}</span>
          {openButton}
        </div>
      </header>
      {(props.outputMessage || props.shaderError) && <div className="projection-output-notices">
        {props.outputMessage && <p role="status">{props.outputMessage}</p>}
        {props.shaderError && <p role="status">Shader needs attention. <button type="button" onClick={() => props.onSelectSection('workspace')}>Review shader in Workspace<Icon name="arrow" /></button></p>}
      </div>}
    </>}
    <div className="projection-page-body">
      <div className="projection-preview-panel">
        <div className={`projection-preview-toolbar${isMove ? ' projection-preview-toolbar-move' : ''}`}>
          {isMove ? <><span className="projection-preview-label">Reference image <span title={props.assetName ?? ''}>{props.assetName ?? 'No asset selected'}</span></span>
            <div className="projection-toolbar-actions">
              <span className="projection-window-status" role="status"><i className={outputOpen ? 'is-open' : ''} />Output window: {outputOpen ? 'Open' : 'Closed'}</span>
              {openButton}
            </div>
          </> : <>
            <button type="button" onClick={() => setZoom(1)}><Icon name="fit" />Fit preview</button>
            <label className="projection-switch"><input type="checkbox" checked={safeArea} onChange={(event) => setSafeArea(event.target.checked)} /><span />Safe area</label>
            <button type="button" className="projection-play" onClick={props.onPlayToggle}><Icon name={props.isPlaying ? 'pause' : 'play'} />{props.isPlaying ? 'Pause' : 'Play'}</button>
          </>}
        </div>
        {isMove && <div className="projection-guide-top" aria-label="Quick alignment guide">
          <GuideStep number={1} title="Position">Move the image with the arrow keys or pad.</GuideStep>
          <GuideStep number={2} title="Adjust size">Resize with W / H. Link them to keep proportions.</GuideStep>
        </div>}
        <div ref={previewRef} className="projection-preview-area">
          {assetReady ? <div className="projection-output-frame" style={{ width: viewport.width * scale, height: viewport.height * scale }}>
            <div className="projection-render-viewport" style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})`, '--projection-scale': scale } as CSSProperties}
              tabIndex={isMove ? 0 : undefined} aria-label={isMove ? 'Alignment preview. Arrow keys move the image.' : 'Final output preview'}
              onPointerDown={(event) => {
                if (isMove && !(event.target as Element).closest('button, input, [role="button"]')) event.currentTarget.focus({ preventScroll: true });
              }}>
              <ProjectionPreview render={props.renderPreview} transform={transform} onDistortionChange={(distortion) => edit({ distortion }, true)} />
            </div>
            {isMove && transform.distortMode && <ProjectionCornerControls transform={transform} viewport={viewport}
              aspectRatio={aspectRatio} previewScale={scale} onChange={(distortion) => edit({ distortion }, true)} />}
            {!isMove && safeArea && <div className="projection-safe-area" aria-label="Safe area: central 90%" />}
          </div> : <div className="projection-empty"><Icon name="fit" /><h2>Add an image to start</h2><p>Choose the asset you want to align and project.</p><button type="button" className="projection-primary" onClick={() => props.onSelectSection('asset')}>Choose asset<Icon name="arrow" /></button></div>}
        </div>
        <footer className="projection-preview-footer">
          {isMove ? <><div className="projection-footer-actions"><button type="button" aria-label="Undo framing" title="Undo framing" disabled={!history.past.length} onClick={undo}><Icon name="undo" /></button><button type="button" aria-label="Redo framing" title="Redo framing" disabled={!history.future.length} onClick={redo}><Icon name="redo" /></button>
            <button type="button" disabled={!assetReady} onClick={() => edit({ referenceAspectRatio: naturalRatio, offsetX: 0, offsetY: 0, widthAdjust: 0, heightAdjust: 0 })}><Icon name="fit" />Fit image</button>
            <button type="button" disabled={!assetReady} onClick={() => edit({ referenceAspectRatio: naturalRatio, offsetX: 0, offsetY: 0, widthAdjust: 0, heightAdjust: 0, rotationDegrees: 0, distortion: DEFAULT_STAGE_DISTORTION })}><Icon name="reset" />Reset framing</button></div>
            <label className="projection-zoom">Preview<select aria-label="Preview zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={0.75}>75%</option><option value={1}>Fit</option><option value={1.25}>125%</option><option value={1.5}>150%</option></select></label></> : <>
            <div className="projection-frame-legend"><span><i />{viewport.width} × {viewport.height} · {outputViewport ? outputOpen ? 'Output window' : 'Last output size' : 'Preview size'}</span>{safeArea && <span><i className="is-dashed" />Safe area · 90%</span>}</div>
            <button type="button" onClick={() => props.onSelectSection('move')}>Adjust framing in Move<Icon name="arrow" /></button>
          </>}
        </footer>
      </div>

      {isMove && <aside ref={inspectorRef} className="projection-inspector" aria-label="Mapping controls">
          <fieldset disabled={!assetReady} className="projection-controls-fieldset">
            <section className="projection-mapping-pad-section">
              <MappingPad variant="page" disabled={!assetReady} onAction={handleAction}
                precision={transform.precision} onPrecisionChange={(precision) => edit({ precision }, true)}
                rotationDegrees={transform.rotationDegrees} onRotationChange={(rotationDegrees) => edit({ rotationDegrees }, true)}
                showGrid={transform.showGrid} onToggleGrid={() => edit({ showGrid: !transform.showGrid })}
                distortMode={transform.distortMode} onDistortModeChange={(distortMode) => edit({ distortMode })}
                onResetDistortion={() => edit({ distortion: DEFAULT_STAGE_DISTORTION })}
                onImportPosition={() => { setPositionMessage(''); importRef.current?.click(); }} onImportPositionText={importPosition}
                getPositionJson={props.getPositionJson} onExportPosition={props.onExport} />
              <p className="projection-pad-hint">Click either side of Precision, or drag to adjust the step.</p>
            </section>
            <section className="projection-control-section projection-exact-controls"><div className="projection-section-title"><h3>Position</h3><span className="projection-key-hint">↑ ↓ ← →</span></div>
              <div className="projection-size-values"><NumericField label="X" value={transform.offsetX} step={transform.precision} onChange={(offsetX) => edit({ offsetX })} /><NumericField label="Y" value={transform.offsetY} step={transform.precision} onChange={(offsetY) => edit({ offsetY })} /></div>
            </section>
            <section className="projection-control-section projection-exact-controls"><div className="projection-section-title"><h3>Size</h3><button type="button" className="projection-icon-button" aria-label="Link width and height" aria-pressed={linked} title="Keep proportions when resizing" onClick={() => setLinked(!linked)}><Icon name="link" /></button></div>
              <div className="projection-size-values"><NumericField label="Width" value={imageSize.width} min={1} step={transform.precision} onChange={(value) => resize('width', value)} /><NumericField label="Height" value={imageSize.height} min={1} step={transform.precision} onChange={(value) => resize('height', value)} /></div>
              <div className="projection-ratio-row"><span>{linked ? 'Proportions linked' : 'Independent width / height'}</span><button type="button" onClick={() => edit({ referenceAspectRatio: naturalRatio, widthAdjust: 0, heightAdjust: 0 })}>Original ratio</button></div>
            </section>
            <section className="projection-control-section projection-exact-controls projection-precision-values">
              <NumericField label="Step" value={transform.precision} min={1} max={40} onChange={(precision) => edit({ precision: Math.round(precision) })} />
              <NumericField label="Angle" unit="°" value={transform.rotationDegrees} min={-20} max={20} step={0.1} onChange={(rotationDegrees) => edit({ rotationDegrees })} />
            </section>
          </fieldset>
          {positionMessage && <p className="projection-inspector-footnote" role="status">{positionMessage}</p>}
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={async (event) => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            if (file.size > 128 * 1024) { setPositionMessage('This position file is too large.'); return; }
            try { setPositionMessage(importPosition(await file.text()) ?? 'Position imported.'); } catch { setPositionMessage('Unable to read this file.'); }
          }} />
          {!outputViewport && <p className="projection-inspector-footnote">Open Output to match the preview to your display size.</p>}
      </aside>}
    </div>
  </section>;
}
