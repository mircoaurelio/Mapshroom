import { useEffect, useMemo, useRef, useState } from 'react';
import { startAssetImageDrag, type ImageTransfer } from '../lib/imageTransfer';
import { useImageDropTarget } from '../lib/useImageDropTarget';
import { isInternalCanvasAssetId } from '../lib/bundledAssets';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import { useLibraryThumbnails } from '../lib/useLibraryThumbnails';
import { useAssetVariants, variantJobKey } from '../lib/useAssetVariants';
import { sourceForAsset, variantOptions, type AssetVariantKind, type SaveAssetVariant } from '../lib/assetVariants';
import { suggestSurfaceSettings, type SuggestedSurfaces } from '../lib/assetVariantRules.js';
import type { AssetRecord } from '../types';
import type { SurfaceEditorInitialOptions } from './AssetSurfacesDialog';
import './AssetLibraryDialog.css';

interface Props {
  open: boolean; activeAsset: AssetRecord | null; assetUrl: string | null; assets: AssetRecord[]; activeAssetId: string | null;
  onLoadAsset: () => void; onPasteImage: () => void; onDropImage: (transfer: ImageTransfer) => void;
  imageImporting: boolean; imageImportMessage: string;
  onSelectAsset: (id: string) => void; onRenameAsset: (id: string, name: string) => void;
  onEditMask: (id: string, panel?: 'refine' | 'depth') => void; onEditSurfaces: (id: string, options?: SurfaceEditorInitialOptions) => void;
  onSaveVariant: SaveAssetVariant; processingSuspended: boolean;
  onRemoveAsset: (id: string) => void; onOpenProBeta: () => void; onClose: () => void;
  showImportFirstStep: boolean; highlightStartMapping: boolean; onImportFirstStepDismiss: () => void;
  timelineAssignment?: { shaderName: string; onUseLiveStage: () => void };
}
function Icon({ name }: { name: 'plus' | 'paste' | 'close' | 'download' | 'check' | 'adjust' | 'depth' | 'image' | 'info' | 'expand' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'info' ? <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></> : name === 'expand' ? <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /> : name === 'plus' ? <path d="M12 4v16M4 12h16" /> : name === 'close' ? <path d="m6 6 12 12M18 6 6 18" /> : name === 'check' ? <path d="m5 12 4 4L19 6" /> : name === 'download' ? <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" /> : name === 'paste' ? <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M8 5H5v16h14V5h-3M8 12h8m-8 4h5" /></> : name === 'adjust' ? <><path d="M4 7h5m4 0h7M4 17h9m4 0h3" /><circle cx="11" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></> : name === 'depth' ? <path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /> : <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 17 6-6 4 4 3-3 5 5" /><circle cx="16" cy="8" r="1" /></>}
  </svg>;
}
function Spinner() { return <span className="ml-spinner" aria-hidden="true" />; }
function Artwork({ asset, url, main = false, onLoad, onVideoLoad }: { asset: AssetRecord; url?: string | null; main?: boolean; onLoad?: (image: HTMLImageElement) => void; onVideoLoad?: (video: HTMLVideoElement) => void }) {
  if (!url) return <span className="ml-image-placeholder"><Icon name="image" /><span>Preview unavailable</span></span>;
  return asset.kind === 'video' ? <video src={url} muted={!main} controls={main} playsInline preload="metadata" onLoadedMetadata={event => onVideoLoad?.(event.currentTarget)} /> : <img src={url} alt={asset.name} draggable={false} loading={main ? 'eager' : 'lazy'} decoding="async" onLoad={event => onLoad?.(event.currentTarget)} />;
}

export function AssetLibraryDialog(props: Props) {
  const { open, assets, activeAssetId } = props;
  const visible = useMemo(() => assets.filter(asset => !isInternalCanvasAssetId(asset.id)), [assets]);
  const sources = visible.filter(asset => !asset.derivation || !visible.some(source => source.id === asset.derivation?.sourceAssetId));
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<AssetVariantKind | null>(null);
  const [extraVersionId, setExtraVersionId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false), [rename, setRename] = useState(false), [draftName, setDraftName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dimensions, setDimensions] = useState<{ id: string; width: number; height: number } | null>(null);
  const [imageSuggestion, setImageSuggestion] = useState<{ id: string; value: SuggestedSurfaces } | null>(null);
  const dialogRef = useRef<HTMLElement>(null), menuRef = useRef<HTMLDetailsElement>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useAssetVariants(visible, props.onSaveVariant, props.processingSuspended);
  const source = sources.find(asset => asset.id === sourceId) ?? sourceForAsset(visible.find(asset => asset.id === activeAssetId), visible) ?? sources.at(-1) ?? null;
  const versions = source ? visible.filter(asset => asset.derivation?.sourceAssetId === source.id) : [];
  const latest = (kind: AssetVariantKind) => versions.filter(asset => asset.derivation?.kind === kind).at(-1);
  const selectedVersion = versions.find(asset => asset.id === extraVersionId) ?? (selectedKind ? latest(selectedKind) : undefined);
  const otherVersions = versions.filter(asset => !variantOptions.some(option => latest(option.id)?.id === asset.id));
  const displayed = !compare && selectedVersion ? selectedVersion : source;
  const resolution = useAssetObjectUrl(open ? displayed : null);
  const thumbnails = useLibraryThumbnails(visible, open);
  const { dropProps } = useImageDropTarget(props.onDropImage);
  const shown = variantOptions.filter(option => queue.preferences.outputs.includes(option.id) || latest(option.id));
  const readyCount = shown.filter(option => latest(option.id)).length;
  const sourceBusy = source && Object.entries(queue.jobs).some(([key, job]) => key.startsWith(`${source.id}:`) && ['queued', 'processing'].includes(job.state));
  const suggestion = (source && queue.suggestions[source.id]) ?? (imageSuggestion?.id === source?.id ? imageSuggestion?.value : null);
  const canProcess = source?.kind === 'image' && !props.processingSuspended;
  const displayedDimensions = displayed?.derivation?.width ? displayed.derivation : dimensions?.id === displayed?.id ? dimensions : null;
  useEffect(() => {
    const active = visible.find(asset => asset.id === activeAssetId);
    if (open && active) { setSourceId(sourceForAsset(active, visible)?.id ?? null); setSelectedKind(null); setExtraVersionId(active.derivation ? active.id : null); setCompare(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssetId, open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const click = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) menuRef.current?.removeAttribute('open'); };
    document.addEventListener('click', click);
    return () => { document.removeEventListener('click', click); previous?.focus(); };
  }, [open]);
  useEffect(() => {
    const end = () => { if (dragTimer.current) clearTimeout(dragTimer.current); setDragging(false); };
    window.addEventListener('dragend', end); window.addEventListener('drop', end, true);
    return () => { if (dragTimer.current) clearTimeout(dragTimer.current); window.removeEventListener('dragend', end); window.removeEventListener('drop', end, true); };
  }, []);
  useEffect(() => { setRename(false); }, [source?.id]);
  const sourceThumbnail = source ? thumbnails[source.id] : null;
  const suggestionSourceId = source?.kind === 'image' ? source.id : null;
  useEffect(() => {
    if (!open || !sourceThumbnail || !suggestionSourceId) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas'), scale = Math.min(1, 96 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) { context.drawImage(image, 0, 0, canvas.width, canvas.height); setImageSuggestion({ id: suggestionSourceId, value: suggestSurfaceSettings(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, queue.profile.mobile) }); }
    };
    image.src = sourceThumbnail;
    return () => { image.onload = null; };
  }, [open, sourceThumbnail, suggestionSourceId, queue.profile.mobile]);
  const inspectedId = showInfo && displayed?.kind === 'image' ? displayed.id : null;
  useEffect(() => {
    if (!open || !inspectedId || !resolution.url) return;
    const image = new Image();
    image.onload = () => setDimensions({ id: inspectedId, width: image.naturalWidth, height: image.naturalHeight });
    image.src = resolution.url;
    return () => { image.onload = null; };
  }, [open, inspectedId, resolution.url]);
  useEffect(() => {
    if (!open || !expandedPreview) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLButtonElement>('.ml-close-preview')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [open, expandedPreview]);
  if (!open) return null;
  const close = () => { setExpandedPreview(false); if (props.showImportFirstStep) props.onImportFirstStepDismiss(); props.onClose(); };
  const selectSource = (asset: AssetRecord, expand = false) => { setSourceId(asset.id); setExtraVersionId(null); setSelectedKind(null); setCompare(false); setExpandedPreview(expand); };
  const use = (asset: AssetRecord) => { props.onSelectAsset(asset.id); close(); };
  const edit = (kind: AssetVariantKind) => {
    if (!source) return;
    setExpandedPreview(false);
    menuRef.current?.removeAttribute('open');
    if (kind === 'background') props.onEditMask((latest('background') ?? source).id, 'refine');
    else if (kind === 'depth') props.onEditMask((latest('depth') ?? source).id, 'depth');
    else props.onEditSurfaces(source.id, { method: suggestion?.method, settings: suggestion ?? undefined, output: kind === 'segmentation' ? 'regions' : kind });
  };
  const automation = <label className="ml-check"><input type="checkbox" checked={queue.preferences.automatic} onChange={event => queue.setPreferences(value => ({ ...value, automatic: event.target.checked }))} /><span>Auto-generate on upload<small>{queue.profile.mobile ? 'Lightweight outputs only · On this device' : 'Selected outputs · On this device'}</small></span></label>;
  const metadata = <><span>{displayedDimensions?.width ? `${displayedDimensions.width} × ${displayedDimensions.height} · ` : ''}{displayed?.mimeType.split('/')[1]?.toUpperCase()}{!!displayed?.size && ` · ${displayed.size >= 1e6 ? `${(displayed.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(displayed.size / 1e3))} KB`}`}</span>{displayed?.derivation?.method && <span>{displayed.derivation.method}</span>}</>;
  return <div className={`dialog-backdrop asset-browser-backdrop ml-backdrop${dragging ? ' ml-dragging' : ''}`} role="presentation" onClick={event => { if (event.currentTarget === event.target) close(); }}>
    <section ref={dialogRef} className="ml-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-browser-title" tabIndex={-1} {...dropProps()} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); if (pendingDelete) setPendingDelete(null); else if (expandedPreview) setExpandedPreview(false); else if (menuRef.current?.open) { menuRef.current.open = false; menuRef.current.querySelector('summary')?.focus(); } else close(); }
      if (event.key === 'Tab') {
        const scope = pendingDelete ? dialogRef.current?.querySelector('.ml-confirm') : expandedPreview ? dialogRef.current?.querySelector('.ml-source-panel') : dialogRef.current;
        const items = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, a[href], video[controls]') ?? []).filter(node => node.getClientRects().length && !node.closest('[inert]'));
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="ml-header" inert={expandedPreview || !!pendingDelete}><div className="ml-brand"><span>MAPSHROOM</span></div><h2 id="asset-browser-title" title={props.timelineAssignment?.shaderName}>{props.timelineAssignment ? 'Assign Media' : 'Media Library'}</h2><div className="ml-header-actions">
        <button className="secondary-button ml-paste" type="button" onClick={props.onPasteImage} disabled={props.imageImporting}><Icon name="paste" />Paste</button>
        <button className="primary-button" type="button" onClick={() => { props.onImportFirstStepDismiss(); props.onLoadAsset(); }} disabled={props.imageImporting}><Icon name="plus" />{props.imageImporting ? 'Importing…' : 'Import'}</button>
        <button className="ml-icon-button" type="button" onClick={close} aria-label="Close asset library"><Icon name="close" /></button>
      </div></header>
      {props.showImportFirstStep && <div className="ml-notice">Import an image or video, or choose an asset below.<button className="ghost-button" onClick={props.onImportFirstStepDismiss}>Got it</button></div>}
      {props.imageImportMessage && <p className="ml-notice" role="status">{props.imageImportMessage}</p>}
      {queue.interrupted && <div className="ml-notice" role="status">Previous processing was interrupted. Saved assets are still available.<button className="ghost-button" onClick={queue.dismissInterrupted}>Dismiss</button></div>}
      <div className="ml-body"><aside className="ml-library" aria-label="Your assets" inert={expandedPreview || !!pendingDelete}><div className="ml-section-label"><span>Your assets <small>{sources.length}</small></span><button className="ml-icon-button" aria-label="Asset information" aria-expanded={showInfo} onClick={() => setShowInfo(value => !value)}><Icon name="info" /></button></div>
        {showInfo && displayed && <div className="ml-asset-info"><strong>{displayed.name}</strong><small>{metadata}</small>{resolution.url && <a className="ml-icon-button" href={resolution.url} download={displayed.name} aria-label="Download selected asset"><Icon name="download" /></a>}</div>}
        <div className="ml-asset-list">{[...sources].reverse().map(asset => {
          const count = visible.filter(item => item.derivation?.sourceAssetId === asset.id).length;
          return <article key={asset.id} className={`ml-asset${source?.id === asset.id ? ' is-selected' : ''}`}><button type="button" className="ml-asset-select" aria-pressed={source?.id === asset.id} aria-label={`Select ${asset.name}`} title={asset.name} onClick={() => selectSource(asset)} draggable={asset.kind === 'image'} onDragStart={event => { startAssetImageDrag(event.dataTransfer, asset.id); dragTimer.current = setTimeout(() => setDragging(true), 0); }}>
            <span className="ml-thumbnail"><Artwork asset={asset} url={thumbnails[asset.id]} /></span><span className="ml-asset-title">{asset.name}</span><span className="ml-asset-meta">{count ? `${count} ${count === 1 ? 'version' : 'versions'}` : asset.kind === 'video' ? 'Video' : 'Original'}</span>
          </button><button type="button" className="ml-icon-button ml-expand-asset" aria-label={`Expand ${asset.name}`} onClick={() => selectSource(asset, true)}><Icon name="expand" /></button></article>;
        })}</div>{!sources.length && <p className="ml-empty">Your images and videos will appear here.</p>}
      </aside><main className={`ml-detail${expandedPreview ? ' has-expanded-preview' : ''}`}>{source ? <>
        {expandedPreview && <section className="ml-source-panel" role="dialog" aria-modal="true" aria-label="Asset preview" inert={!!pendingDelete}>
        <div className="ml-section-label"><span>{selectedVersion && !compare ? 'Selected version' : 'Original'}</span><button className="ml-icon-button ml-close-preview" type="button" aria-label="Close preview" onClick={() => setExpandedPreview(false)}><Icon name="close" /></button></div>
        <div id="ml-main-preview" className={`ml-main-preview${displayed?.derivation?.kind === 'background' ? ' ml-checkerboard' : ''}`}><Artwork asset={displayed ?? source} url={resolution.url} main onVideoLoad={video => setDimensions({ id: (displayed ?? source).id, width: video.videoWidth, height: video.videoHeight })} onLoad={image => {
          setDimensions({ id: (displayed ?? source).id, width: image.naturalWidth, height: image.naturalHeight });
          if (displayed?.id !== source.id || imageSuggestion?.id === source.id) return;
          try {
            const canvas = document.createElement('canvas'), scale = Math.min(1, 96 / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) { context.drawImage(image, 0, 0, canvas.width, canvas.height); setImageSuggestion({ id: source.id, value: suggestSurfaceSettings(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, queue.profile.mobile) }); }
          } catch { /* Worker can still suggest settings when it starts. */ }
        }} /></div>
        <div className="ml-caption"><div className="ml-caption-name">{rename ? <form onSubmit={event => { event.preventDefault(); props.onRenameAsset(source.id, draftName.trim() || 'Untitled asset'); setRename(false); }}><input autoFocus aria-label="Asset name" value={draftName} onChange={event => setDraftName(event.target.value)} /><button className="secondary-button" type="submit">Save</button></form> : <h3 title={displayed?.name}>{displayed?.name}</h3>}<small className="ml-image-meta">{displayedDimensions?.width ? `${displayedDimensions.width} × ${displayedDimensions.height} · ` : ''}{displayed?.mimeType.split('/')[1]?.toUpperCase() ?? source.kind}{!!displayed?.size && ` · ${displayed.size >= 1e6 ? `${(displayed.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(displayed.size / 1e3))} KB`}`}</small>{displayed?.derivation?.method && <small>{displayed.derivation.method}</small>}</div><div className="ml-caption-actions">{selectedVersion && <button className="secondary-button" type="button" aria-pressed={compare} onClick={() => setCompare(value => !value)}>{compare ? 'Show version' : 'Compare original'}</button>}{resolution.url && <a className="ml-icon-button" href={resolution.url} download={displayed?.name} aria-label="Download image"><Icon name="download" /></a>}</div></div>
        <p className="ml-preserved-note">Original preserved · Changes are saved as versions.</p>
        </section>}
        {source.kind === 'image' ? <section className="ml-versions-panel" aria-label="Image versions" inert={expandedPreview || !!pendingDelete}>
          <div className="ml-versions-heading"><div className="ml-section-label"><span>Versions</span><small aria-label={`${readyCount} of ${shown.length} versions ready`}>{readyCount}/{shown.length}</small></div><div className="ml-version-toolbar"><details ref={menuRef} className="ml-outputs" onToggle={event => {
            if (!event.currentTarget.open) return;
            const panel = event.currentTarget.querySelector<HTMLElement>('.ml-output-menu');
            if (!panel) return;
            if (window.innerWidth <= 760) { panel.style.removeProperty('top'); panel.style.removeProperty('left'); return; }
            const bounds = event.currentTarget.getBoundingClientRect();
            const height = Math.min(window.innerHeight * .65, 600);
            panel.style.top = `${Math.max(16, Math.min(bounds.bottom + 6, window.innerHeight - height - 16))}px`;
            panel.style.left = `${Math.max(16, Math.min(bounds.right - 290, window.innerWidth - 306))}px`;
          }}><summary aria-label="Output options" title="Choose outputs and tools"><span aria-hidden="true">⋯</span></summary><div className="ml-output-menu">
            <strong>Create versions</strong>{variantOptions.map(option => <label key={option.id} className="ml-check"><input type="checkbox" checked={queue.preferences.outputs.includes(option.id)} onChange={event => queue.setPreferences(value => ({ ...value, outputs: event.target.checked ? [...value.outputs, option.id] : value.outputs.filter(id => id !== option.id) }))} /><span>{option.title}</span></label>)}
            <button className="ghost-button ml-menu-tool" type="button" disabled={queue.busy} onClick={() => edit('segmentation')}>Single-zone masks…</button><div className="ml-menu-separator" />{automation}
            {queue.profile.canEnableAI && <label className="ml-check"><input type="checkbox" checked={queue.ai} onChange={event => queue.setAI(event.target.checked)} /><span>Enable AI tools<small>{queue.profile.mobile ? 'Manual use · may need more memory' : 'Background ~44 MB · Depth ~27 MB'}</small></span></label>}
            <div className="ml-menu-separator" /><strong>Manual tools</strong>
            <button type="button" className="ghost-button ml-menu-tool" disabled={queue.busy} onClick={() => edit('background')}>Erase / restore mask</button>
            <button type="button" className="ghost-button ml-menu-tool" disabled={queue.busy} onClick={() => edit('segmentation')}>Surfaces & gradients</button>
            <button type="button" className="ghost-button ml-menu-tool" onClick={props.onOpenProBeta}>Generate with Pro</button>
            <button type="button" className="ghost-button ml-menu-tool" onClick={() => { setSelectedKind(null); setExtraVersionId(null); setCompare(false); setExpandedPreview(true); setDraftName(source.name); setRename(true); menuRef.current?.removeAttribute('open'); }}>Rename original</button>
            <button type="button" className="ghost-button ml-menu-tool ml-danger" onClick={() => { setPendingDelete(displayed ?? source); menuRef.current?.removeAttribute('open'); }}>Delete {selectedVersion && !compare ? 'version' : 'original'}…</button>
          </div></details></div></div>
          <div className="ml-version-grid">{shown.map(option => {
            const version = latest(option.id), job = queue.jobs[variantJobKey(source.id, option.id)];
            const working = job?.state === 'processing' || job?.state === 'queued', unavailable = option.id === 'depth' && !queue.ai;
            return <article key={option.id} className={`ml-version${selectedKind === option.id && version ? ' is-selected' : ''}${!version ? ' is-pending' : ''}`} aria-busy={working}>
              <div className="ml-version-media"><button type="button" className={`ml-version-preview${option.id === 'background' && version ? ' ml-checkerboard' : ''}`} disabled={!version} aria-label={`Preview ${option.title}`} aria-pressed={!!version && selectedKind === option.id} onClick={() => { setExtraVersionId(null); setSelectedKind(option.id); setCompare(false); setExpandedPreview(true); }}>
                {version ? <Artwork asset={version} url={thumbnails[version.id]} /> : <>{thumbnails[source.id] && <img className="ml-pending-image" src={thumbnails[source.id]} alt="" />}<span className="ml-pending-icon">{working && job.state === 'processing' ? <Spinner /> : <Icon name={option.id === 'depth' ? 'depth' : 'image'} />}</span></>}
              </button><div className="ml-version-actions">{version ? <><button className="primary-button" type="button" onClick={() => use(version)}>Use</button><button className="secondary-button" type="button" disabled={queue.busy} title={queue.busy ? 'Finish or cancel processing before adjusting' : 'Adjust result'} onClick={() => edit(option.id)}><Icon name="adjust" />Adjust</button></> : working ? <button className="secondary-button" type="button" onClick={queue.cancel}>Cancel</button> : <button className="secondary-button" type="button" disabled={!canProcess || unavailable} onClick={() => queue.generate(source, [option.id])}>{job?.state === 'error' ? 'Retry' : 'Create'}</button>}</div></div>
              <div className="ml-version-content"><h4 aria-label={option.title} title={option.description}>{option.title}{version && <span className="ml-ready-icon" role="img" aria-label="Ready"><Icon name="check" /></span>}</h4>
                {(working || job?.state === 'error' || (!version && unavailable) || job?.state === 'cancelled') && <div className={`ml-version-status${job?.state === 'error' ? ' is-error' : ''}`} role="status">{working ? job.message : job?.state === 'error' ? job.message : unavailable ? 'Enable AI in output options' : 'Cancelled'}</div>}
                {job?.total && job.loaded !== undefined && working ? <div className="ml-download"><progress value={job.loaded} max={job.total} /><small>{(job.loaded / 1e6).toFixed(1)} / {(job.total / 1e6).toFixed(1)} MB</small></div> : null}
              </div></article>;
          })}</div>
          <div className="ml-generate-row"><button className="primary-button" type="button" disabled={!canProcess || !!sourceBusy || !shown.some(option => !latest(option.id) && (option.id !== 'depth' || queue.ai))} onClick={() => queue.generate(source)}>Generate selected</button></div>
          <div className="ml-suggestion"><span aria-hidden="true">✧</span><span>{suggestion ? `${suggestion.method === 'shape' ? 'Shape' : 'Color'} · ${suggestion.zones} zones` : 'Automatic settings'}</span><button type="button" className="ml-icon-button" aria-label="Adjust segmentation settings" title="Adjust segmentation settings" disabled={queue.busy} onClick={() => edit('segmentation')}><Icon name="adjust" /></button></div>
          {!shown.length && <p className="ml-empty">Choose versions in Outputs.</p>}
          {otherVersions.length > 0 && <details className="ml-more-versions"><summary>More versions · {otherVersions.length}</summary><div className="ml-version-grid">{otherVersions.map(asset => <article key={asset.id} className="ml-version"><div className="ml-version-media"><button type="button" className="ml-version-preview" aria-label={`Preview ${asset.name}`} onClick={() => { setExtraVersionId(asset.id); setSelectedKind(null); setCompare(false); setExpandedPreview(true); }}><Artwork asset={asset} url={thumbnails[asset.id]} /></button><div className="ml-version-actions"><button className="primary-button" onClick={() => use(asset)}>Use</button><button className="secondary-button ml-danger" onClick={() => setPendingDelete(asset)}>Delete</button></div></div><div className="ml-version-content"><h4 title={asset.name}>{asset.name}</h4></div></article>)}</div></details>}
          <div className="ml-device-note"><span className="ml-device-dot" aria-hidden="true" /><span>{queue.profile.label} · {queue.profile.mobile ? 'Smaller working images · Original preserved' : 'Refined against the original photo'}</span></div>
        </section> : <div className="ml-video-tools" inert={expandedPreview || !!pendingDelete}><p>Videos are ready to use directly in the timeline.</p><button className="secondary-button" onClick={() => { setExpandedPreview(true); setDraftName(source.name); setRename(true); }}>Rename</button><button className="ghost-button ml-danger" onClick={() => setPendingDelete(source)}>Delete video…</button></div>}
      </> : <div className="ml-empty-main"><Icon name="image" /><h3>Add your first image or video</h3><p>Import, paste or drop a file here.</p><button className="primary-button" onClick={props.onLoadAsset}><Icon name="plus" />Import media</button></div>}</main></div>
      <footer className="ml-footer" inert={expandedPreview || !!pendingDelete}>{automation}<div className="ml-footer-status" role="status">{queue.busy ? <><Spinner /><span>Processing on this device</span><button className="ghost-button" onClick={queue.cancel}>Cancel</button></> : props.timelineAssignment ? <span title={props.timelineAssignment.shaderName}>Assign to {props.timelineAssignment.shaderName}</span> : null}</div><div className="ml-footer-actions">{props.timelineAssignment ? <button className="ghost-button" type="button" onClick={() => { props.timelineAssignment?.onUseLiveStage(); close(); }}>Use Live Stage Asset</button> : <button className="ghost-button" type="button" onClick={close}>{queue.busy ? 'Continue mapping' : 'Start mapping'}</button>}<button className="primary-button" type="button" disabled={!(selectedVersion ?? source) || resolution.status !== 'ready'} onClick={() => { const selected = selectedVersion ?? source; if (selected) use(selected); }}>Use {selectedVersion ? 'selected' : 'original'} <span aria-hidden="true">→</span></button></div></footer>
      {pendingDelete && <div className="ml-confirm-backdrop"><section className="ml-confirm" role="alertdialog" aria-modal="true" aria-labelledby="ml-delete-title"><h3 id="ml-delete-title">Delete {pendingDelete.derivation ? 'this version' : 'this asset'}?</h3><p><strong>{pendingDelete.name}</strong> will be removed from the project. {pendingDelete.derivation ? 'The original will stay.' : 'Generated versions will stay available.'}</p><div><button autoFocus className="secondary-button" onClick={() => setPendingDelete(null)}>Keep asset</button><button className="secondary-button ml-danger" onClick={() => { props.onRemoveAsset(pendingDelete.id); setPendingDelete(null); setSelectedKind(null); }}>Delete</button></div></section></div>}
    </section>
  </div>;
}
