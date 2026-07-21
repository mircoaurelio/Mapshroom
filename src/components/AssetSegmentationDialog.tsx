import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';

interface AssetSegmentationDialogProps {
  asset: AssetRecord | null;
  assetUrl: string | null;
  initialPanel?: 'refine' | 'depth';
  onApply: (blob: Blob, resultKind: 'mask' | 'draw' | 'depth') => Promise<boolean>;
  onClose: () => void;
}

type EditorStatus = 'loading' | 'processing' | 'ready' | 'error';

export function AssetSegmentationDialog({
  asset,
  assetUrl,
  initialPanel = 'refine',
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

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    if (!asset) {
      editorReadyRef.current = false;
      sentAssetKeyRef.current = '';
      sendingAssetKeyRef.current = '';
      sendAssetRef.current = null;
      return undefined;
    }
    if (!assetUrl) return undefined;

    const assetKey = `${asset.id}:${asset.size}:${asset.lastModified}`;
    let disposed = false;
    setEditorStatus('loading');
    setStatusMessage('Loading image…');

    const sendAsset = async () => {
      const frameWindow = frameRef.current?.contentWindow;
      if (
        !frameWindow ||
        !editorReadyRef.current ||
        sentAssetKeyRef.current === assetKey ||
        sendingAssetKeyRef.current === assetKey
      ) return;
      sendingAssetKeyRef.current = assetKey;
      try {
        const response = await fetch(assetUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        if (disposed) return;
        frameWindow.postMessage(
          {
            type: 'mapshroom:load-image',
            name: asset.name,
            mimeType: blob.type || asset.mimeType || 'image/png',
            buffer,
          },
          window.location.origin,
          [buffer],
        );
        sentAssetKeyRef.current = assetKey;
      } catch {
        if (disposed) return;
        setEditorStatus('error');
        setStatusMessage('The asset could not be opened in Mask Studio.');
      } finally {
        if (sendingAssetKeyRef.current === assetKey) sendingAssetKeyRef.current = '';
      }
    };

    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; status?: EditorStatus; message?: string; buffer?: ArrayBuffer; mimeType?: string; resultKind?: 'mask' | 'draw' | 'depth' };
      if (data.type === 'mapshroom:ready') {
        editorReadyRef.current = true;
        void sendAsset();
      } else if (data.type === 'mapshroom:status') {
        setEditorStatus(data.status ?? 'ready');
        setStatusMessage(data.message ?? 'Mask Studio ready.');
        if (data.resultKind) setResultKind(data.resultKind);
      } else if (data.type === 'mapshroom:segmentation-result' && data.buffer) {
        setEditorStatus('processing');
        setStatusMessage('Saving masked copy…');
        const nextResultKind = data.resultKind ?? 'mask';
        setResultKind(nextResultKind);
        void onApplyRef.current(new Blob([data.buffer], { type: data.mimeType || 'image/png' }), nextResultKind).then((saved) => {
          if (!saved) {
            setEditorStatus('error');
            setStatusMessage('The masked copy could not be saved. Try again.');
          }
        });
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
  }, [asset, assetUrl]);

  if (!asset) return null;

  const applyMask = () => {
    setEditorStatus('processing');
    setStatusMessage('Building the full-resolution masked asset…');
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
            <h2 id="asset-segmentation-title" className="dialog-title">Mask editor</h2>
            <small>{asset.name}</small>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </header>
        <div className="asset-segmentation-frame-shell">
          <iframe
            ref={frameRef}
            className="asset-segmentation-frame"
            src={`${import.meta.env.BASE_URL}segmentation/?embed=1${initialPanel === 'depth' ? '&panel=depth' : ''}`}
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
            <small>The original remains in your library.</small>
            <button
              type="button"
              className="primary-button"
              onClick={applyMask}
              disabled={editorStatus !== 'ready'}
            >
              {resultKind === 'depth' ? 'Save depth map' : resultKind === 'draw' ? 'Save painted copy' : 'Save masked copy'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
