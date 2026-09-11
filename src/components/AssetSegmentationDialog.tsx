import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';

export interface SegmentationSaveOptions {
  automatic: boolean;
  outputAssetId?: string;
  width?: number;
  height?: number;
}

interface AssetSegmentationDialogProps {
  asset: AssetRecord | null;
  assetUrl: string | null;
  initialPanel?: 'refine' | 'depth';
  originalAsset?: AssetRecord | null;
  originalAssetUrl?: string | null;
  onApply: (blob: Blob, resultKind: 'mask' | 'draw' | 'depth', options: SegmentationSaveOptions) => Promise<boolean>;
  onClose: () => void;
}

type EditorStatus = 'loading' | 'processing' | 'ready' | 'error';

export function AssetSegmentationDialog({
  asset,
  assetUrl,
  initialPanel = 'refine',
  originalAsset = null,
  originalAssetUrl = null,
  onApply,
  onClose,
}: AssetSegmentationDialogProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const onApplyRef = useRef(onApply);
  const editorReadyRef = useRef(false);
  const sentAssetKeyRef = useRef('');
  const sendingAssetKeyRef = useRef('');
  const sendAssetRef = useRef<(() => Promise<void>) | null>(null);
  const [editorStatus, setEditorStatus] = useState<EditorStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('Opening Mask Studio…');
  const [resultKind, setResultKind] = useState<'mask' | 'draw' | 'depth'>('mask');
  const [depthSaved, setDepthSaved] = useState(false);
  const mobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const assetId = asset?.id ?? null;
  const assetName = asset?.name ?? '';
  const assetMimeType = asset?.mimeType ?? 'image/png';
  const assetRevision = asset ? `${asset.id}:${asset.size}:${asset.lastModified}` : '';
  const savedDepth = initialPanel === 'depth' && asset?.derivation?.kind === 'depth';
  const originalName = originalAsset?.name;
  const needsOriginal = Boolean(originalAsset);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    if (!assetId) {
      editorReadyRef.current = false;
      sentAssetKeyRef.current = '';
      sendingAssetKeyRef.current = '';
      sendAssetRef.current = null;
      return undefined;
    }
    if (!assetUrl || (needsOriginal && !originalAssetUrl)) return undefined;

    const assetKey = `${assetRevision}:${savedDepth}:${assetName}:${originalAssetUrl ?? ''}`;
    let disposed = false;
    let saving = false;
    let sendGeneration = 0;
    const depthAssetIds = new Map<string, string>();
    if (savedDepth) depthAssetIds.set(assetId, assetId);
    setDepthSaved(savedDepth);
    setResultKind(savedDepth ? 'depth' : 'mask');
    setEditorStatus('loading');
    setStatusMessage(savedDepth ? 'Opening saved depth map…' : 'Loading image…');

    const loadImage = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Image unavailable');
      let blob = await response.blob();
      if (mobile) {
        const bitmap = await createImageBitmap(blob);
        try {
          const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height), Math.sqrt(1.5e6 / (bitmap.width * bitmap.height)));
          if (scale < 1) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare mobile image')), 'image/png'));
            canvas.width = canvas.height = 1;
          }
        } finally { bitmap.close(); }
      }
      return blob;
    };

    const sendAsset = async () => {
      const frameWindow = frameRef.current?.contentWindow;
      if (
        !frameWindow ||
        !editorReadyRef.current ||
        sentAssetKeyRef.current === assetKey ||
        sendingAssetKeyRef.current === assetKey
      ) return;
      const generation = ++sendGeneration;
      sendingAssetKeyRef.current = assetKey;
      try {
        const blob = await loadImage(assetUrl);
        const buffer = await blob.arrayBuffer();
        const originalBlob = savedDepth && originalAssetUrl ? await loadImage(originalAssetUrl) : null;
        const originalBuffer = originalBlob ? await originalBlob.arrayBuffer() : null;
        if (disposed || generation !== sendGeneration) return;
        frameWindow.postMessage(
          {
            type: 'mapshroom:load-image',
            name: assetName,
            mimeType: blob.type || assetMimeType,
            buffer,
            savedDepth: savedDepth ? { resultId: assetId, originalBuffer, originalName, originalMimeType: originalBlob?.type } : null,
          },
          window.location.origin,
          originalBuffer ? [buffer, originalBuffer] : [buffer],
        );
        sentAssetKeyRef.current = assetKey;
      } catch {
        if (disposed || generation !== sendGeneration) return;
        setEditorStatus('error');
        setStatusMessage('The asset could not be opened in Mask Studio.');
      } finally {
        if (generation === sendGeneration && sendingAssetKeyRef.current === assetKey) sendingAssetKeyRef.current = '';
      }
    };

    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; status?: EditorStatus; message?: string; buffer?: ArrayBuffer; mimeType?: string; resultKind?: 'mask' | 'draw' | 'depth'; resultId?: string; automatic?: boolean; width?: number; height?: number };
      if (data.type === 'mapshroom:ready') {
        // A reloaded iframe has a new editor state, even for the same asset.
        sendGeneration += 1;
        sentAssetKeyRef.current = '';
        sendingAssetKeyRef.current = '';
        editorReadyRef.current = true;
        void sendAsset();
      } else if (data.type === 'mapshroom:status') {
        if (saving) return;
        setEditorStatus(data.status ?? 'ready');
        setStatusMessage(data.message ?? 'Mask Studio ready.');
        if (data.resultKind) setResultKind(data.resultKind);
      } else if (data.type === 'mapshroom:segmentation-result' && data.buffer instanceof ArrayBuffer) {
        if (saving) return;
        saving = true;
        setEditorStatus('processing');
        const nextResultKind = data.resultKind ?? 'mask';
        const automatic = nextResultKind === 'depth' && data.automatic === true;
        let outputAssetId: string | undefined;
        if (nextResultKind === 'depth' && data.resultId) {
          outputAssetId = depthAssetIds.get(data.resultId) ?? crypto.randomUUID();
          depthAssetIds.set(data.resultId, outputAssetId);
        }
        setStatusMessage(nextResultKind === 'depth' ? 'Saving depth map to your media library…' : 'Saving image…');
        setResultKind(nextResultKind);
        const blob = new Blob([data.buffer], { type: data.mimeType || 'image/png' });
        void (async () => {
          let saved = false;
          try {
            saved = await onApplyRef.current(blob, nextResultKind, { automatic, outputAssetId, width: data.width, height: data.height });
          } catch {
            // Keep the generated result available so a failed save can be retried.
          }
          if (disposed) return;
          saving = false;
          frameRef.current?.contentWindow?.postMessage(
            { type: 'mapshroom:segmentation-saved', saved, resultKind: nextResultKind },
            window.location.origin,
          );
          if (nextResultKind === 'depth') setDepthSaved(saved);
          setEditorStatus('ready');
          setStatusMessage(saved
            ? nextResultKind === 'depth'
              ? 'Depth map saved to your media library. Adjust it, then save your changes.'
              : 'Image saved to your media library.'
            : 'The image could not be saved. Use Save to try again.');
        })();
      }
    };

    sendAssetRef.current = sendAsset;
    window.addEventListener('message', receiveMessage);
    if (editorReadyRef.current) void sendAsset();
    return () => {
      disposed = true;
      window.removeEventListener('message', receiveMessage);
      if (sendAssetRef.current === sendAsset) sendAssetRef.current = null;
    };
  }, [assetId, assetName, assetMimeType, assetRevision, assetUrl, mobile, savedDepth, originalName, originalAssetUrl, needsOriginal]);

  if (!asset) return null;

  const applyMask = () => {
    setEditorStatus('processing');
    setStatusMessage(resultKind === 'depth' ? 'Saving depth changes…' : 'Building the full-resolution image…');
    frameRef.current?.contentWindow?.postMessage(
      { type: 'mapshroom:request-segmentation-result' },
      window.location.origin,
    );
  };

  return (
    <div className="dialog-backdrop asset-segmentation-backdrop" role="presentation">
      <section
        className="dialog-panel asset-segmentation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-segmentation-title"
      >
        <header className="dialog-header asset-segmentation-header">
          <div>
            <span className="panel-eyebrow">Media library</span>
            <h2 id="asset-segmentation-title" className="dialog-title">{initialPanel === 'depth' ? 'Depth map editor' : 'Mask editor'}</h2>
            <small>{asset.name}</small>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </header>
        <div className="asset-segmentation-frame-shell">
          <iframe
            ref={frameRef}
            className="asset-segmentation-frame"
            src={`${import.meta.env.BASE_URL}segmentation/?embed=1&auto=0${mobile ? '&mobile=1' : ''}${initialPanel === 'depth' ? '&panel=depth' : ''}`}
            title="Mapshroom Mask Studio"
            onLoad={() => {
              editorReadyRef.current = true;
              void sendAssetRef.current?.();
            }}
          />
        </div>
        <footer className="dialog-footer asset-segmentation-footer">
          <span className={`asset-segmentation-status asset-segmentation-status-${editorStatus}`}>
            <i aria-hidden="true" />
            <span>{statusMessage}</span>
          </span>
          <div className="asset-segmentation-footer-actions">
            <small>{mobile ? 'Mobile working copy · Original preserved in the library.' : 'The original remains in your library.'}</small>
            <button
              type="button"
              className="primary-button"
              onClick={applyMask}
              disabled={editorStatus !== 'ready'}
            >
              {resultKind === 'depth' ? depthSaved ? 'Save depth changes' : 'Save depth map' : resultKind === 'draw' ? 'Save painted copy' : 'Save masked copy'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
