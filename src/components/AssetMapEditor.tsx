import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';
import { createImageEditor, type ImageEditorController, type ImageResultKind } from '../../segmentation/editor.js';
import { MapEditorIcon, MapEditorTools } from './MapEditorTools';
import './AssetMapEditor.css';

export interface MapEditorSaveOptions { automatic: boolean; outputAssetId?: string; width?: number; height?: number }
interface Props {
  asset: AssetRecord | null; assetUrl: string | null; initialPanel?: 'refine' | 'depth';
  originalAsset?: AssetRecord | null; originalAssetUrl?: string | null;
  onApply: (blob: Blob, kind: ImageResultKind, options: MapEditorSaveOptions) => Promise<boolean>;
  onClose: () => void;
}

export function AssetMapEditor({ asset, assetUrl, initialPanel = 'refine', originalAsset = null, originalAssetUrl = null, onApply, onClose }: Props) {
  const dialog = useRef<HTMLElement>(null), editorRoot = useRef<HTMLDivElement>(null);
  const controller = useRef<ImageEditorController | null>(null);
  const applyRef = useRef(onApply), closeRef = useRef(onClose), saving = useRef(false);
  applyRef.current = onApply; closeRef.current = onClose;
  const [status, setStatus] = useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading image…');
  const [kind, setKind] = useState<ImageResultKind>(initialPanel === 'depth' ? 'depth' : 'mask');
  const [savedDepth, setSavedDepth] = useState(false);
  const assetId = asset?.id, assetName = asset?.name, assetMimeType = asset?.mimeType;
  const revision = asset ? `${asset.size}:${asset.lastModified}` : '';
  const isSavedDepth = initialPanel === 'depth' && asset?.derivation?.kind === 'depth';
  const originalName = originalAsset?.name;
  const needsOriginal = Boolean(originalAsset);

  useEffect(() => { if (editorRoot.current) editorRoot.current.inert = status !== 'ready'; }, [status]);

  useEffect(() => {
    if (!assetId) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = new Map<HTMLElement, boolean>();
    let branch = dialog.current?.parentElement ?? null;
    while (branch && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement) { background.set(sibling, sibling.inert); sibling.inert = true; }
      }
      branch = branch.parentElement;
    }
    dialog.current?.focus();
    return () => { for (const [element, wasInert] of background) element.inert = wasInert; if (previous?.isConnected) previous.focus(); };
  }, [assetId]);

  useEffect(() => {
    if (!editorRoot.current || !assetId || !assetUrl || (needsOriginal && !originalAssetUrl)) return;
    let disposed = false;
    const abort = new AbortController();
    const outputIds = new Map<string, string>();
    if (isSavedDepth) outputIds.set(assetId, assetId);
    setSavedDepth(isSavedDepth); setKind(isSavedDepth ? 'depth' : 'mask');
    setStatus('loading'); setMessage('Loading image…');
    const mobile = matchMedia('(max-width: 700px)').matches;
    const runtime = createImageEditor(editorRoot.current, {
      initialPanel, mobile,
      onStatus: state => { if (disposed || saving.current) return; setStatus(state.status); setMessage(state.message); if (state.resultKind) setKind(state.resultKind); },
      onSave: async (blob, result) => {
        if (disposed || saving.current) return false;
        saving.current = true; setStatus('processing'); setMessage('Saving changes…');
        let outputAssetId: string | undefined;
        if (result.resultKind === 'depth' && result.resultId) {
          outputAssetId = outputIds.get(result.resultId) ?? crypto.randomUUID();
          outputIds.set(result.resultId, outputAssetId);
        }
        try {
          const saved = await applyRef.current(blob, result.resultKind, { automatic: result.automatic, outputAssetId, width: result.width, height: result.height });
          if (!disposed && result.resultKind === 'depth' && saved) setSavedDepth(true);
          return saved;
        } catch { return false; }
        finally { saving.current = false; }
      },
    });
    controller.current = runtime;
    const load = async (url: string) => {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error('Image unavailable');
      let blob = await response.blob();
      if (mobile) {
        const bitmap = await createImageBitmap(blob);
        try {
          const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height), Math.sqrt(1.5e6 / (bitmap.width * bitmap.height)));
          if (scale < 1) {
            const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare image')), 'image/png'));
            canvas.width = canvas.height = 1;
          }
        } finally { bitmap.close(); }
      }
      return blob;
    };
    void (async () => {
      try {
        const blob = await load(assetUrl);
        // A missing source must not make an otherwise valid saved depth map unusable.
        const original = isSavedDepth && originalAssetUrl ? await load(originalAssetUrl).catch(() => null) : null;
        const originalBuffer = original ? await original.arrayBuffer() : null;
        if (disposed) return;
        await runtime.open(new File([blob], assetName ?? 'image.png', { type: blob.type || assetMimeType || 'image/png' }), isSavedDepth ? { resultId: assetId, originalBuffer, originalName, originalMimeType: original?.type } : null);
      } catch { if (!disposed) { setStatus('error'); setMessage('This image could not be opened. Close the editor and import it again.'); } }
    })();
    return () => { disposed = true; abort.abort(); runtime.dispose(); if (controller.current === runtime) controller.current = null; };
  }, [assetId, assetName, assetMimeType, revision, assetUrl, initialPanel, isSavedDepth, originalAssetUrl, originalName, needsOriginal]);

  if (!asset) return null;
  return <div className="map-editor-backdrop" role="presentation"><section ref={dialog} className="map-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="map-editor-title" tabIndex={-1}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); if (!saving.current) closeRef.current(); }
      if (event.key === 'Tab') {
        const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary') ?? []).filter(item => item.getClientRects().length && !item.closest('[inert]'));
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header className="map-editor-header"><div className="map-editor-heading"><h2 id="map-editor-title" className="panel-title">Adjust map</h2><span className="map-editor-breadcrumb" title={asset.name}>{asset.name}</span></div><div className="map-editor-header-actions"><button type="button" className="primary-button map-editor-primary" disabled={status !== 'ready'} onClick={() => { void controller.current?.save(); }}><MapEditorIcon name="check" />{kind === 'depth' ? savedDepth ? 'Save changes' : 'Save depth map' : kind === 'draw' ? 'Save painted copy' : 'Save masked copy'}</button><button type="button" className="ghost-button map-editor-close" aria-label="Close image editor" disabled={saving.current} onClick={onClose}><MapEditorIcon name="close" /></button></div></header>
    <div ref={editorRoot} className="map-editor-body" data-editor-panel={initialPanel}><MapEditorTools /></div>
    <footer className="map-editor-footer"><span role={status === 'error' ? 'alert' : 'status'} className={status === 'error' ? 'map-editor-error' : ''}>{message}</span><span>{mobileLabel()}Original preserved</span></footer>
  </section></div>;
}

function mobileLabel() { return matchMedia('(max-width: 700px)').matches ? 'Working copy · ' : ''; }
