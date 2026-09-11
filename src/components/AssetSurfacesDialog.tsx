import { useEffect, useId, useRef, useState } from 'react';
import type { AssetRecord } from '../types';
import { AppSelect } from './AppSelect';
import { createPreviewQueue } from '../lib/surfaceMapping/preview-queue.js';
import type { LightingOptions, SurfaceMethod, SurfaceOutput, SurfaceResult, SurfaceSettings } from '../lib/surfaceMapping/types';
import './AssetSurfacesDialog.css';

export interface SurfaceEditorInitialOptions { method?: SurfaceMethod; settings?: Partial<SurfaceSettings>; output?: SurfaceOutput }
interface Props {
  asset: AssetRecord;
  assetUrl: string | null;
  assetMissing: boolean;
  onApply: (blob: Blob, output: SurfaceOutput) => Promise<boolean>;
  onClose: () => void;
  initialOptions?: SurfaceEditorInitialOptions;
}
interface Source { bitmap: ImageBitmap; blob: Blob }
interface Analysis { result: SurfaceResult; rgba: Uint8ClampedArray<ArrayBuffer>; milliseconds: number; black: number }
const defaults: SurfaceSettings = { zones: 12, smoothing: 65, black: 8, resolution: 960 };
const initialLighting: LightingOptions = { style: 'radial', palette: 'thermal', angle: 90, texture: 100, feather: 1 };
const methods: { id: SurfaceMethod; title: string; description: string }[] = [
  { id: 'shape', title: 'Shape', description: 'Leaves & isolated objects' },
  { id: 'graph', title: 'Color', description: 'Stages & patterned surfaces' },
  { id: 'pidi', title: 'CNN edges', description: 'Experimental · ~14.2 MB' },
];

function Slider({ label, value, min = 0, max, unit = '', onChange }: {
  label: string; value: number; min?: number; max: number; unit?: string; onChange: (value: number) => void;
}) {
  const id = useId();
  return <div className="surface-slider"><label htmlFor={id}>{label}<output>{value}{unit}</output></label>
    <input id={id} type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>;
}

export function AssetSurfacesDialog({ asset, assetUrl, assetMissing, onApply, onClose, initialOptions }: Props) {
  const dialog = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const exportWorker = useRef<Worker | null>(null);
  const previewQueue = useRef<ReturnType<typeof createPreviewQueue> | null>(null);
  const previewZones = useRef<Pick<SurfaceResult, 'labels' | 'width' | 'height'> | null>(null);
  const alive = useRef(true);
  const savingRef = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [source, setSource] = useState<Source | null>(null);
  const [method, setMethod] = useState<SurfaceMethod>(initialOptions?.method ?? 'shape');
  const [settings, setSettings] = useState({ ...defaults, ...initialOptions?.settings });
  const [lighting, setLighting] = useState(initialLighting);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [output, setOutput] = useState<SurfaceOutput>(initialOptions?.output ?? 'gradient');
  const [selected, setSelected] = useState(0);
  const [original, setOriginal] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading your image…');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [retry, setRetry] = useState(0);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [precisionOpen, setPrecisionOpen] = useState(true);

  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    // The media library stays mounted below this editor; make it inert while editing.
    const library = document.querySelector<HTMLElement>('.asset-browser-backdrop');
    const wasInert = library?.inert;
    if (library) library.inert = true;
    return () => {
      alive.current = false;
      exportWorker.current?.terminate();
      if (library) library.inert = wasInert ?? false;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (!assetUrl) return;
    const controller = new AbortController();
    let disposed = false, bitmap: ImageBitmap | undefined;
    setError('');
    setBusy(true);
    setStatus('Loading your image…');
    void (async () => {
      try {
        const response = await fetch(assetUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('This image could not be loaded. Re-import it and try again.');
        const blob = await response.blob();
        bitmap = await createImageBitmap(blob);
        if (disposed) { bitmap.close(); return; }
        if (bitmap.width * bitmap.height > 24e6) { bitmap.close(); throw new Error('Please use an image of 24 megapixels or less.'); }
        setSource({ bitmap, blob });
      } catch (cause) {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : 'This image could not be opened.');
          setBusy(false);
        }
      }
    })();
    return () => { disposed = true; controller.abort(); bitmap?.close(); };
  }, [assetUrl]);

  useEffect(() => {
    if (!source) return;
    let worker: Worker | undefined, disposed = false;
    setBusy(true);
    setError('');
    setSelected(0);
    setStatus('Finding smooth surfaces…');
    setSaveError('');
    const timer = window.setTimeout(() => {
      try {
        const scale = Math.min(1, settings.resolution / Math.max(source.bitmap.width, source.bitmap.height));
        const width = Math.max(1, Math.round(source.bitmap.width * scale)), height = Math.max(1, Math.round(source.bitmap.height * scale));
        const scratch = document.createElement('canvas');
        scratch.width = width; scratch.height = height;
        const context = scratch.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Your browser could not prepare the preview.');
        context.imageSmoothingQuality = 'high';
        context.drawImage(source.bitmap, 0, 0, width, height);
        const rgba = context.getImageData(0, 0, width, height).data;
        worker = new Worker(new URL('../lib/surfaceMapping/analysis.worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }) => {
          if (disposed) return;
          if (data.type === 'progress') setStatus('Preparing the optional CNN and finding edges…');
          if (data.type === 'result') {
            const result = data.result as SurfaceResult;
            setAnalysis({ result, rgba, milliseconds: data.metrics.analysisMs + data.metrics.inferenceMs, black: settings.black });
            setBusy(false);
            setStatus(result.count ? `${result.count} zones ready` : 'No subject found. Lower “Ignore dark background” or try another image.');
          }
          if (data.type === 'error' || data.type === 'method-error') {
            setBusy(false);
            setError(method === 'pidi' ? 'The optional CNN could not run. Retry, or choose Shape or Color.' : 'Surface detection could not finish. Try a lower analysis resolution.');
          }
        };
        worker.onerror = event => {
          event.preventDefault();
          if (!disposed) { setBusy(false); setError('The image processor stopped. Retry or reduce the analysis resolution.'); }
        };
        worker.postMessage({ runId: 1, width, height, rgba, methods: [method], settings: { ...settings, profile: 'surface', detail: 50 } });
      } catch (cause) {
        setBusy(false);
        setError(cause instanceof Error ? cause.message : 'Could not start surface detection.');
      }
    }, 250);
    return () => { disposed = true; clearTimeout(timer); worker?.terminate(); };
  }, [source, settings, method, retry]);

  useEffect(() => {
    if (!analysis || !source || !canvas.current) return;
    let worker: Worker;
    try {
      worker = new Worker(new URL('../lib/surfaceMapping/preview.worker.ts', import.meta.url), { type: 'module' });
    } catch { setPreviewError('Could not start the preview. Close and reopen this editor.'); return; }
    const queue = createPreviewQueue(message => worker.postMessage(message), message => {
      setPreviewPending(false);
      if (message.error) { setPreviewError(message.error); return; }
      if (!canvas.current || !message.pixels || !message.width || !message.height) return;
      const context = canvas.current.getContext('2d');
      if (!context) return;
      if (canvas.current.width !== message.width) canvas.current.width = message.width;
      if (canvas.current.height !== message.height) canvas.current.height = message.height;
      context.putImageData(new ImageData(message.pixels, message.width, message.height), 0, 0);
    });
    previewQueue.current = queue;
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') previewZones.current = data;
      else queue.complete(data);
    };
    worker.onerror = event => {
      event.preventDefault(); queue.dispose(); previewQueue.current = null;
      setPreviewPending(false); setPreviewError('The preview stopped. Close and reopen this editor.');
    };
    // Send the source once per analysis. Dropdown changes send only their small settings object.
    worker.postMessage({ type: 'source', source: source.blob, result: analysis.result, rgba: analysis.rgba, black: analysis.black });
    return () => { queue.dispose(); previewQueue.current = null; previewZones.current = null; worker.terminate(); };
  }, [analysis, source]);

  useEffect(() => {
    if (!previewQueue.current) return;
    setPreviewPending(true); setPreviewError('');
    previewQueue.current.request({ lighting, original, output, selected });
  }, [analysis, lighting, original, output, selected]);

  const updateSettings = (patch: Partial<SurfaceSettings>) => setSettings(current => ({ ...current, ...patch }));
  const updateLighting = (patch: Partial<LightingOptions>) => setLighting(current => ({ ...current, ...patch }));
  const save = () => {
    if (!source || !analysis || busy || error || savingRef.current || (output === 'mask' && !selected)) return;
    savingRef.current = true;
    setSaving(true); setSaveError(''); setStatus('Creating the full-size PNG…');
    const fail = (message: string) => {
      exportWorker.current?.terminate(); exportWorker.current = null;
      savingRef.current = false;
      if (alive.current) { setSaving(false); setSaveError(message); }
    };
    try {
      const worker = new Worker(new URL('../lib/surfaceMapping/export.worker.ts', import.meta.url), { type: 'module' });
      exportWorker.current = worker;
      worker.onerror = event => { event.preventDefault(); fail('Could not create the PNG. Try again.'); };
      worker.onmessage = async ({ data }: MessageEvent<{ blob?: Blob; error?: string }>) => {
        worker.terminate(); exportWorker.current = null;
        if (!alive.current) return;
        if (!data.blob) { fail(data.error ?? 'Could not create the PNG.'); return; }
        setStatus('Saving to your media library…');
        try {
          const saved = await onApply(data.blob, output);
          if (!alive.current) return;
          if (saved) closeRef.current();
          else fail('The image could not be saved. Free some browser storage and retry.');
        } catch { fail('The image could not be saved. Please try again.'); }
      };
      worker.postMessage({ source: source.blob, result: analysis.result, rgba: analysis.rgba, output, selected, lighting: { ...lighting, black: settings.black } });
    } catch { fail('Your browser could not start the PNG export.'); }
  };
  const missing = assetMissing ? 'This image is missing from browser storage. Close the editor and import it again.' : '';
  const canSave = !!analysis?.result.count && !busy && !saving && !error && !previewError && !missing && (output !== 'mask' || !!selected);
  return (
    <div className="dialog-backdrop asset-surfaces-backdrop" role="presentation">
      <section ref={dialog} className="dialog-panel asset-surfaces-dialog" role="dialog" aria-modal="true" aria-labelledby="surfaces-title" tabIndex={-1}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); if (!savingRef.current) onClose(); }
          if (event.key === 'Tab') {
            const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href]') ?? []).filter(item => item.getClientRects().length > 0);
            const first = items[0], last = items.at(-1);
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <header className="dialog-header asset-segmentation-header">
          <div><span className="panel-eyebrow">Media library · Image tools</span><h2 id="surfaces-title" className="dialog-title">Surfaces & gradients</h2><small title={asset.name}>{asset.name}</small></div>
          <button type="button" className="ghost-button" disabled={saving} onClick={onClose}>Close</button>
        </header>
        <div className="surface-editor-body">
          <div className="surface-preview">
            <div className="surface-preview-toolbar">
              <AppSelect<SurfaceOutput> label="Preview & save" value={output} disabled={saving} onChange={value => { setOutput(value); setOriginal(false); }} options={[
                { value: 'gradient', label: 'Color gradient' }, { value: 'field', label: 'Grayscale gradient' }, { value: 'regions', label: 'Colored zones' }, { value: 'edges', label: 'Zone edges' }, { value: 'mask', label: 'Single-zone mask' },
              ]} />
              <button type="button" className="ghost-button" aria-pressed={original} onClick={() => setOriginal(value => !value)} disabled={!analysis || saving}>{original ? 'Show result' : 'Compare original'}</button>
            </div>
            <div className={`surface-preview-stage${busy ? ' is-processing' : ''}`} aria-busy={(busy || previewPending) && !missing && !error && !previewError}>
              <canvas ref={canvas} aria-label={original ? 'Original image' : `${output} preview. Select a zone using the menu below.`}
                onClick={event => {
                  if (!previewZones.current || busy || previewPending || saving || original) return;
                  const bounds = event.currentTarget.getBoundingClientRect(), result = previewZones.current;
                  const scale = Math.min(bounds.width / result.width, bounds.height / result.height);
                  const x = Math.floor((event.clientX - bounds.left - (bounds.width - result.width * scale) / 2) / scale);
                  const y = Math.floor((event.clientY - bounds.top - (bounds.height - result.height * scale) / 2) / scale);
                  if (x >= 0 && y >= 0 && x < result.width && y < result.height) {
                    const id = result.labels[y * result.width + x];
                    if (id) { setSelected(id); setOutput('mask'); }
                  }
                }} />
              {!analysis && !error && !missing && <span className="surface-preview-placeholder">{status}</span>}
              {original && <span className="surface-preview-badge">Original</span>}
              {busy && analysis && !error && <span className="surface-preview-badge">Updating surfaces…</span>}
              {!busy && previewPending && !original && <span className="surface-preview-badge">Refining preview…</span>}
            </div>
            <div className="surface-preview-info">
              <span>{analysis ? `${analysis.result.count} zones · ${Math.round(analysis.milliseconds)} ms` : 'Automatic surface detection'}</span>
              {output === 'mask' ? <AppSelect label="Zone" value={selected} disabled={busy || saving} onChange={setSelected} options={[{ value: 0, label: 'Choose a zone' }, ...Array.from({ length: analysis?.result.count ?? 0 }, (_, i) => ({ value: i + 1, label: `Zone ${i + 1}` }))]} /> : <span>Click a zone to isolate its mask</span>}
            </div>
          </div>
          <aside className="surface-controls" aria-label="Surface and gradient settings">
            <fieldset disabled={saving}>
              <legend>Find surfaces</legend>
              <p>Choose the method that fits your image. Shape and Color need no model download.</p>
              <div className="surface-methods" role="group" aria-label="Detection method">
                {methods.map(item => <button type="button" key={item.id} aria-pressed={method === item.id} onClick={() => setMethod(item.id)}><strong>{item.title}</strong><small>{item.description}</small></button>)}
              </div>
              {method === 'pidi' && <p className="surface-method-note">Runs on this device. The first use loads ~3 MB of weights and ~11.2 MB of runtime.<br />PiDiNet is for research; commercial use requires contacting its authors. <a href={`${import.meta.env.BASE_URL}surface-mapping/PIDINET-LICENSE.txt`} target="_blank" rel="noreferrer">License ↗</a></p>}
              <Slider label="Target zones" min={2} max={48} value={settings.zones} onChange={zones => updateSettings({ zones })} />
              <Slider label="Smooth surfaces" max={100} unit="%" value={settings.smoothing} onChange={smoothing => updateSettings({ smoothing })} />
              <p className="surface-hint">A target, not an exact count. Isolated pieces stay separate.</p>
            </fieldset>
            <fieldset disabled={saving || (output !== 'gradient' && output !== 'field')}>
              <legend>Light & color</legend>
              <AppSelect<LightingOptions['style']> label="Gradient" value={lighting.style} disabled={saving || (output !== 'gradient' && output !== 'field')} onChange={style => updateLighting({ style })} options={[{ value: 'radial', label: 'From each zone’s edge' }, { value: 'linear', label: 'Direction in each zone' }, { value: 'global', label: 'Across the whole subject' }]} />
              {output !== 'field' && <AppSelect<LightingOptions['palette']> label="Palette" value={lighting.palette} disabled={saving || output !== 'gradient'} onChange={palette => updateLighting({ palette })} options={[{ value: 'thermal', label: 'Thermal · blue to red' }, { value: 'cool', label: 'Cool · violet to cyan' }]} />}
              {lighting.style !== 'radial' && <Slider label="Direction" max={360} unit="°" value={lighting.angle} onChange={angle => updateLighting({ angle })} />}
              <Slider label="Photo texture" max={100} unit="%" value={lighting.texture} onChange={texture => updateLighting({ texture })} />
              <Slider label="Soften zone edges" max={10} value={lighting.feather} onChange={feather => updateLighting({ feather })} />
            </fieldset>
            <details className="surface-advanced" open={precisionOpen} onToggle={event => setPrecisionOpen(event.currentTarget.open)}><summary>Image & precision</summary><fieldset disabled={saving}>
              <AppSelect label="Analysis resolution" value={settings.resolution} disabled={saving} onChange={resolution => updateSettings({ resolution })} options={[{ value: 384, label: 'Fast · 384 px' }, { value: 640, label: 'Balanced · 640 px' }, { value: 960, label: 'Detailed · 960 px' }]} />
              <Slider label="Ignore dark background" max={64} value={settings.black} onChange={black => updateSettings({ black })} />
              <p>Best with an isolated subject on black or transparency. Use Remove background first for a busy scene.</p>
              <p>Original-photo refinement is always on: sharper contours and photo detail, with no extra download.</p>
              <p>PNG output: {source ? `${source.bitmap.width} × ${source.bitmap.height} px` : 'original size'}. Preview up to 2048 px; export uses the full-size photo. Zones are automatic estimates, not guaranteed object outlines.</p>
              <button type="button" className="ghost-button" onClick={() => { setSettings(defaults); setLighting(initialLighting); setPrecisionOpen(true); setMethod('shape'); setOutput('gradient'); setOriginal(false); }}>Reset settings</button>
            </fieldset></details>
          </aside>
        </div>
        <footer className="dialog-footer surface-footer">
          <div className="surface-footer-status"><span role={error || previewError || saveError || missing ? 'alert' : 'status'} className={error || previewError || saveError || missing ? 'surface-error' : ''}>{missing || error || previewError || saveError || status}</span>{error && source && <button type="button" className="ghost-button" disabled={saving} onClick={() => setRetry(value => value + 1)}>Retry</button>}</div>
          <div className="surface-footer-actions"><small>Saves a new image. Your original stays in the library.</small><button type="button" className="primary-button" disabled={!canSave} onClick={save}>{saving ? 'Saving…' : 'Save to library'}</button></div>
        </footer>
      </section>
    </div>
  );
}
