import { useEffect, useMemo, useRef, useState } from 'react';
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick';
import { startAssetImageDrag, type ImageTransfer } from '../lib/imageTransfer';
import { useImageDropTarget } from '../lib/useImageDropTarget';
import { isInternalCanvasAssetId } from '../lib/bundledAssets';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import { useLibraryThumbnails } from '../lib/useLibraryThumbnails';
import { useAssetVariants, variantJobKey } from '../lib/useAssetVariants';
import { defaultVariantKinds, sourceForAsset, variantOptions, type AssetVariantKind, type SaveAssetVariant } from '../lib/assetVariants';
import { latestVariant } from '../lib/assetVariantGeneration';
import { normalizeGradientSettings, suggestSurfaceSettings, type GradientSettings, type SuggestedSurfaces } from '../lib/assetVariantRules.js';
import type { AssetRecord } from '../types';
import type { SurfaceEditorInitialOptions } from './AssetSurfacesDialog';
import { AssetPhotoWelcome } from './AssetPhotoWelcome';
import { EditableAssetName } from './EditableAssetName';
import { RangeInput } from './RangeInput';
import './AssetLibraryDialog.css';
import './AssetLibraryPage.css';

interface Props {
  presentation?: 'dialog' | 'page';
  open: boolean; activeAsset: AssetRecord | null; assetUrl: string | null; assets: AssetRecord[]; activeAssetId: string | null;
  onLoadAsset: () => void; onPasteImage: () => void; onDropImage: (transfer: ImageTransfer) => void;
  onOpenProject: () => void;
  imageImporting: boolean; imageImportMessage: string;
  onSelectAsset: (id: string) => void; onRenameAsset: (id: string, name: string) => void;
  onEditMask: (id: string, panel?: 'refine' | 'depth') => void; onEditSurfaces: (id: string, options?: SurfaceEditorInitialOptions) => void;
  onSaveVariant: SaveAssetVariant; processingSuspended: boolean;
  onRemoveAsset: (id: string) => void; onOpenProBeta: () => void; onClose: () => void;
  showImportFirstStep: boolean; highlightStartMapping: boolean; onImportFirstStepDismiss: () => void;
  timelineAssignment?: { shaderName: string; onUseLiveStage: () => void };
}
function Icon({ name }: { name: 'plus' | 'paste' | 'close' | 'download' | 'check' | 'adjust' | 'depth' | 'image' | 'info' | 'expand' | 'refresh' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'refresh' ? <path d="M20 7v5h-5M4 17v-5h5m-5 0a8 8 0 0 1 14-5l2 2M4 15l2 2a8 8 0 0 0 14-5" /> : name === 'info' ? <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></> : name === 'expand' ? <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /> : name === 'plus' ? <path d="M12 4v16M4 12h16" /> : name === 'close' ? <path d="m6 6 12 12M18 6 6 18" /> : name === 'check' ? <path d="m5 12 4 4L19 6" /> : name === 'download' ? <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" /> : name === 'paste' ? <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M8 5H5v16h14V5h-3M8 12h8m-8 4h5" /></> : name === 'adjust' ? <><path d="M4 7h5m4 0h7M4 17h9m4 0h3" /><circle cx="11" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></> : name === 'depth' ? <path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /> : <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 17 6-6 4 4 3-3 5 5" /><circle cx="16" cy="8" r="1" /></>}
  </svg>;
}
function Spinner() { return <span className="ml-spinner" aria-hidden="true" />; }
function Artwork({ asset, url, main = false, eager = false, onLoad, onVideoLoad }: { asset: AssetRecord; url?: string | null; main?: boolean; eager?: boolean; onLoad?: (image: HTMLImageElement) => void; onVideoLoad?: (video: HTMLVideoElement) => void }) {
  if (!url) return <span className="ml-image-placeholder"><Icon name="image" /><span>Preview unavailable</span></span>;
  return asset.kind === 'video' ? <video src={url} muted={!main} controls={main} playsInline preload="metadata" onLoadedMetadata={event => onVideoLoad?.(event.currentTarget)} /> : <img className={asset.derivation?.kind === 'background' ? 'ml-cutout-image' : undefined} src={url} alt={asset.name} draggable={false} loading={main || eager ? 'eager' : 'lazy'} decoding="async" onLoad={event => { event.currentTarget.style.setProperty('--asset-ratio', String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)); onLoad?.(event.currentTarget); }} />;
}

export function AssetLibraryDialog(props: Props) {
  const importTipRef = useRef<HTMLDivElement | null>(null);
  useDismissOnOutsideClick(importTipRef, props.open && props.showImportFirstStep, props.onImportFirstStepDismiss);
  const { open, assets, activeAssetId } = props;
  const visible = useMemo(() => assets.filter(asset => !isInternalCanvasAssetId(asset.id)), [assets]);
  const sources = visible.filter(asset => !asset.derivation || !visible.some(source => source.id === asset.derivation?.sourceAssetId));
  const sourceGrid = [...sources].reverse();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<AssetVariantKind | null>(null);
  const [extraVersionId, setExtraVersionId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false), [rename, setRename] = useState(false), [draftName, setDraftName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [gradientControlsOpen, setGradientControlsOpen] = useState(false);
  const [gradientDraft, setGradientDraft] = useState<{ sourceId: string; settings: GradientSettings } | null>(null);
  const [dimensions, setDimensions] = useState<{ id: string; width: number; height: number } | null>(null);
  const [imageSuggestion, setImageSuggestion] = useState<{ id: string; value: SuggestedSurfaces } | null>(null);
  const dialogRef = useRef<HTMLElement>(null), menuRef = useRef<HTMLDetailsElement>(null);
  const detailRef = useRef<HTMLElement>(null), bodyRef = useRef<HTMLDivElement>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useAssetVariants(visible, props.onSaveVariant, props.processingSuspended);
  const prepareFirstPhoto = () => {
    props.onImportFirstStepDismiss();
  };
  const source = sources.find(asset => asset.id === sourceId) ?? sourceForAsset(visible.find(asset => asset.id === activeAssetId), visible) ?? sources.at(-1) ?? null;
  const versions = source ? visible.filter(asset => asset.derivation?.sourceAssetId === source.id) : [];
  const latest = (kind: AssetVariantKind) => source ? latestVariant(visible, source.id, kind) : undefined;
  const generationInput = queue.preferences.useBackgroundSource ? latest('background') : source;
  const latestGradientId = latest('gradient')?.id;
  const gradientSettings = gradientDraft && gradientDraft.sourceId === source?.id ? gradientDraft.settings : normalizeGradientSettings(latest('gradient')?.derivation?.surfaceSettings);
  const selectedVersion = versions.find(asset => asset.id === extraVersionId) ?? (selectedKind ? latest(selectedKind) : undefined);
  const otherVersions = versions.filter(asset => !variantOptions.some(option => latest(option.id)?.id === asset.id));
  const displayed = !compare && selectedVersion ? selectedVersion : source;
  const resolution = useAssetObjectUrl(open ? displayed : null);
  const thumbnailAssets = [...new Map([
    ...(source ? [source] : []),
    ...variantOptions.flatMap(option => { const version = latest(option.id); return version ? [version] : []; }),
    ...sourceGrid, ...visible,
  ].map(asset => [asset.id, asset])).values()];
  const thumbnails = useLibraryThumbnails(thumbnailAssets, open);
  const { dropProps } = useImageDropTarget(transfer => { prepareFirstPhoto(); props.onDropImage(transfer); });
  const shown = variantOptions.filter(option => defaultVariantKinds.includes(option.id));
  const additionalOptions = variantOptions.filter(option => !defaultVariantKinds.includes(option.id));
  const sourceBusy = source && Object.entries(queue.jobs).some(([key, job]) => key.startsWith(`${source.id}:`) && ['queued', 'processing'].includes(job.state));
  const suggestion = (source && queue.suggestions[source.id]) ?? (imageSuggestion?.id === source?.id ? imageSuggestion?.value : null);
  const canProcess = source?.kind === 'image' && !props.processingSuspended;
  const displayedDimensions = displayed?.derivation?.width ? displayed.derivation : dimensions?.id === displayed?.id ? dimensions : null;
  useEffect(() => { setGradientDraft(null); }, [source?.id, latestGradientId]);
  useEffect(() => {
    const active = visible.find(asset => asset.id === activeAssetId);
    if (open && active) { setSourceId(sourceForAsset(active, visible)?.id ?? null); setSelectedKind(null); setExtraVersionId(active.derivation ? active.id : null); setCompare(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssetId, open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollTo(0, 0);
    bodyRef.current?.scrollTo(0, 0);
    const click = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) menuRef.current?.removeAttribute('open'); };
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('click', click);
      if (props.presentation !== 'page') previous?.focus();
    };
  }, [open, props.presentation]);
  useEffect(() => {
    const end = () => { if (dragTimer.current) clearTimeout(dragTimer.current); setDragging(false); };
    window.addEventListener('dragend', end); window.addEventListener('drop', end, true);
    return () => { if (dragTimer.current) clearTimeout(dragTimer.current); window.removeEventListener('dragend', end); window.removeEventListener('drop', end, true); };
  }, []);
  useEffect(() => { setRename(false); setGradientControlsOpen(false); detailRef.current?.scrollTo(0, 0); }, [source?.id]);
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
  useEffect(() => {
    if (!open || !expandedPreview) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLButtonElement>('.ml-close-preview')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [open, expandedPreview]);
  if (!open) return null;
  const isPage = props.presentation === 'page';
  const close = () => { setExpandedPreview(false); setExtrasOpen(false); if (props.showImportFirstStep) props.onImportFirstStepDismiss(); props.onClose(); };
  const selectSource = (asset: AssetRecord, expand = false) => { setSourceId(asset.id); setExtraVersionId(null); setSelectedKind(null); setCompare(false); setExpandedPreview(expand); setGradientDraft(null); };
  const use = (asset: AssetRecord) => { props.onSelectAsset(asset.id); close(); };
  const edit = (kind: AssetVariantKind) => {
    if (!source) return;
    setExpandedPreview(false);
    setExtrasOpen(false);
    menuRef.current?.removeAttribute('open');
    if (kind === 'background') props.onEditMask((latest('background') ?? source).id, 'refine');
    else if (generationInput) {
      const depth = latest('depth');
      const depthInputId = depth?.derivation?.inputAssetId ?? source.id;
      if (kind === 'depth') props.onEditMask((depth && depthInputId === generationInput.id ? depth : generationInput).id, 'depth');
      else props.onEditSurfaces(generationInput.id, { method: suggestion?.method, settings: { ...suggestion, ...(kind === 'gradient' ? gradientSettings : {}) }, output: kind === 'segmentation' ? 'regions' : kind });
    }
  };
  const selectVersion = (kind: AssetVariantKind, expand = false) => {
    setExtraVersionId(null); setSelectedKind(kind); setCompare(false); setExpandedPreview(expand);
  };
  const renderVersion = (option: (typeof variantOptions)[number]) => {
    if (!source) return null;
    const version = latest(option.id), job = queue.jobs[variantJobKey(source.id, option.id)];
    const working = job?.state === 'processing' || job?.state === 'queued';
    const unavailable = option.id === 'depth' && !queue.ai;
    const selected = !!version && selectedVersion?.id === version.id;
    const canAdjust = !queue.busy && (option.id === 'background' || !!generationInput);
    const generate = () => {
      selectVersion(option.id);
      queue.generate(source, [option.id], false, { regenerate: !!version, ...(option.id === 'gradient' ? { gradientSettings } : {}) });
    };
    return <article key={option.id} className={`ml-version ml-grid-card${selected ? ' is-selected' : ''}${!version ? ' is-pending' : ''}`} aria-busy={working}>
      <div className="ml-card-heading"><h4>{option.title}</h4><div className="ml-card-tools">
        <button className="ml-icon-button" type="button" aria-label={`Adjust ${option.title}`} title={canAdjust ? 'Adjust' : queue.busy ? 'Wait for processing to finish' : 'Create the background-free image first'} disabled={!canAdjust} aria-expanded={option.id === 'gradient' ? gradientControlsOpen : undefined} onClick={() => { if (option.id === 'gradient') { selectVersion(option.id); setGradientControlsOpen(value => !value); } else edit(option.id); }}><Icon name="adjust" /></button>
        {version && <><button className="ml-icon-button" type="button" aria-label={`Regenerate ${option.title}`} title="Regenerate" disabled={!canProcess || queue.busy || unavailable} onClick={generate}><Icon name="refresh" /></button><button className="ml-icon-button" type="button" aria-label={`Preview ${option.title}`} title="Preview" onClick={() => selectVersion(option.id, true)}><Icon name="expand" /></button></>}
      </div></div>
      <div className="ml-version-media"><button type="button" className="ml-version-preview" disabled={!version} aria-label={`Select ${option.title}`} aria-pressed={selected} onClick={() => selectVersion(option.id)}>
        {version ? <Artwork asset={version} url={thumbnails[version.id]} eager /> : <span className="ml-pending-icon">{working ? <Spinner /> : <Icon name={option.id === 'depth' ? 'depth' : 'image'} />}</span>}
      </button>{selected && <span className="ml-card-selected" aria-hidden="true"><Icon name="check" /></span>}
      {!version && <div className="ml-card-create">{working ? <button className="secondary-button" type="button" onClick={queue.cancel}>Cancel</button> : <button className="secondary-button" type="button" disabled={!canProcess || queue.busy || unavailable} onClick={generate}>{job?.state === 'error' ? 'Retry' : 'Generate'}</button>}</div>}
      </div>
      {(working || job?.state === 'error' || (!version && unavailable) || job?.state === 'cancelled') && <div className={`ml-version-status${job?.state === 'error' ? ' is-error' : ''}`} role="status">{working ? job.message : job?.state === 'error' ? job.message : unavailable ? 'Enable AI in version options' : 'Cancelled'}</div>}
      {job?.total && job.loaded !== undefined && working ? <div className="ml-download"><progress value={job.loaded} max={job.total} /></div> : null}
    </article>;
  };
  const originalCard = source && <article className={`ml-version ml-grid-card ml-original-card${!selectedVersion && !selectedKind ? ' is-selected' : ''}`}>
    <div className="ml-card-heading"><h4>Original</h4><div className="ml-card-tools">
      {source.kind === 'image' && <button className="ml-icon-button" type="button" aria-label="Adjust original" title="Adjust" disabled={queue.busy} onClick={() => props.onEditMask(source.id, 'refine')}><Icon name="adjust" /></button>}
      <button className="ml-icon-button" type="button" aria-label="Preview original" title="Preview" onClick={() => selectSource(source, true)}><Icon name="expand" /></button>
    </div></div><div className="ml-version-media"><button type="button" className="ml-version-preview" aria-label="Select original" aria-pressed={!selectedVersion && !selectedKind} onClick={() => selectSource(source)} draggable={source.kind === 'image'} onDragStart={event => { startAssetImageDrag(event.dataTransfer, source.id); dragTimer.current = setTimeout(() => setDragging(true), 0); }}><Artwork asset={source} url={thumbnails[source.id]} eager /></button>{!selectedVersion && !selectedKind && <span className="ml-card-selected" aria-hidden="true"><Icon name="check" /></span>}</div>
  </article>;
  const backgroundPreference = <label className="ml-check ml-background-preference"><input type="checkbox" checked={queue.preferences.useBackgroundSource} disabled={queue.busy} onChange={event => queue.setPreferences(value => ({ ...value, useBackgroundSource: event.target.checked }))} /><span>Usa immagine senza sfondo per la generazione</span></label>;
  const automation = <label className="ml-check"><input type="checkbox" checked={queue.preferences.automatic} onChange={event => queue.setPreferences(value => ({ ...value, automatic: event.target.checked }))} /><span>Auto-generate on upload<small>{queue.profile.mobile ? 'Lightweight outputs only · On this device' : 'Selected outputs · On this device'}</small></span></label>;
  const generateButton = source && <button className="secondary-button" type="button" disabled={!canProcess || !!sourceBusy || !queue.preferences.outputs.some(kind => !latest(kind) && (kind !== 'depth' || queue.ai))} onClick={() => queue.generate(source)}><Icon name="depth" />Generate</button>;
  return <div className={`${isPage ? 'ml-page' : 'dialog-backdrop asset-browser-backdrop ml-page ml-overlay-page'} ml-backdrop${sources.length ? ' ml-populated' : ''}${dragging ? ' ml-dragging' : ''}`} role="presentation" onClick={event => { if (event.currentTarget === event.target) close(); }}>
    <section ref={dialogRef} className="ml-dialog" role={isPage ? 'region' : 'dialog'} aria-modal={isPage ? undefined : true} aria-labelledby="asset-browser-title" tabIndex={-1} {...dropProps()} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); if (pendingDelete) setPendingDelete(null); else if (expandedPreview) setExpandedPreview(false); else if (extrasOpen) setExtrasOpen(false); else if (menuRef.current?.open) { menuRef.current.open = false; menuRef.current.querySelector('summary')?.focus(); } else close(); }
      if (event.key === 'Tab' && (!isPage || pendingDelete || expandedPreview || extrasOpen)) {
        const scope = pendingDelete ? dialogRef.current?.querySelector('.ml-confirm') : expandedPreview ? dialogRef.current?.querySelector('.ml-source-panel') : extrasOpen ? dialogRef.current?.querySelector('.ml-extras-panel') : dialogRef.current;
        const items = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], video[controls]') ?? []).filter(node => node.getClientRects().length && !node.closest('[inert]'));
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <h2 id="asset-browser-title" className="ml-sr-only">{props.timelineAssignment ? 'Assign Media' : 'Assets'}</h2>
      {!!sources.length && <header className="ml-header" inert={expandedPreview || extrasOpen || !!pendingDelete}>
        {source && <span className="ml-current-photo"><EditableAssetName key={source.id} name={source.name} onSave={name => props.onRenameAsset(source.id, name)} /></span>}
        <div className="ml-header-actions">{!!sources.length && <>
          <button className="ml-icon-button" type="button" aria-label="Paste image" title="Paste" onClick={props.onPasteImage} disabled={props.imageImporting}><Icon name="paste" /></button>
          <button className="ml-icon-button" type="button" aria-label="Import image" title="Import" onClick={() => { props.onImportFirstStepDismiss(); props.onLoadAsset(); }} disabled={props.imageImporting}>{props.imageImporting ? <Spinner /> : <Icon name="plus" />}</button>
          {props.timelineAssignment && <button className="ghost-button" type="button" onClick={() => { props.timelineAssignment?.onUseLiveStage(); close(); }}>Use Live Stage Asset</button>}
          <button className="primary-button" type="button" disabled={!(selectedVersion ?? source) || !!selectedKind && !selectedVersion || resolution.status !== 'ready'} onClick={() => { const selected = selectedVersion ?? source; if (selected) use(selected); }}>Use selection <span aria-hidden="true">→</span></button>
        </>}{!isPage && <button className="ml-icon-button" type="button" onClick={close} aria-label="Close asset library"><Icon name="close" /></button>}</div>
      </header>}
      {props.showImportFirstStep && !!sources.length && <div ref={importTipRef} className="ml-notice">Import an image or video, or choose an asset below.<button className="ghost-button" onClick={props.onImportFirstStepDismiss}>Got it</button></div>}
      {props.imageImportMessage && <p className={isPage && /^\d+ assets? added\.$/.test(props.imageImportMessage) ? 'ml-sr-only' : 'ml-notice'} role="status">{props.imageImportMessage}</p>}
      {queue.interrupted && <div className="ml-notice" role="status">Previous processing was interrupted. Saved assets are still available.<button className="ghost-button" onClick={queue.dismissInterrupted}>Dismiss</button></div>}
      {!sources.length ? <AssetPhotoWelcome importing={props.imageImporting} onChoosePhoto={() => { prepareFirstPhoto(); props.onLoadAsset(); }} onPasteImage={() => { prepareFirstPhoto(); props.onPasteImage(); }} onOpenProject={props.onOpenProject} onClose={isPage ? undefined : close} automaticGeneration={queue.preferences.automatic} generationOptions={<>{automation}{backgroundPreference}</>} /> : <div ref={bodyRef} className="ml-body">
        <aside className="ml-source-browser" aria-label="Uploaded assets" inert={expandedPreview || extrasOpen || !!pendingDelete}>
          <div className="ml-source-browser-heading"><span>Images</span><span>{sourceGrid.length}</span></div>
          <button className="ml-add-source" type="button" disabled={props.imageImporting} onClick={() => { prepareFirstPhoto(); props.onLoadAsset(); }}><Icon name="plus" />{props.imageImporting ? 'Importing…' : 'Add image'}</button>
          <div className="ml-source-scroll" tabIndex={0} aria-label="Scroll uploaded images">
            {sourceGrid.map((asset, index) => <button key={asset.id} type="button" className={`ml-source-thumbnail${asset.id === source?.id ? ' is-selected' : ''}`} aria-label={`Select photo: ${asset.name}`} aria-pressed={asset.id === source?.id} onClick={() => selectSource(asset)}>
              <span className="ml-source-thumbnail-media"><Artwork asset={asset} url={thumbnails[asset.id]} eager={index < 3} />{asset.kind === 'video' && <span className="ml-source-video-badge">Video</span>}</span>
              <span className="ml-source-thumbnail-name" title={asset.name}>{asset.name}</span>
            </button>)}
          </div>
        </aside>
        <main ref={detailRef} className={`ml-detail${expandedPreview ? ' has-expanded-preview' : ''}`}>{source ? <>
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
        <div className="ml-caption"><div className="ml-caption-name">{rename ? <form onSubmit={event => { event.preventDefault(); props.onRenameAsset(source.id, draftName.trim() || 'Untitled asset'); setRename(false); }}><input autoFocus aria-label="Asset name" value={draftName} onChange={event => setDraftName(event.target.value)} /><button className="secondary-button" type="submit">Save</button></form> : <h3>{displayed && <EditableAssetName key={displayed.id} name={displayed.name} label="asset" onSave={name => props.onRenameAsset(displayed.id, name)} />}</h3>}<small className="ml-image-meta">{displayedDimensions?.width ? `${displayedDimensions.width} × ${displayedDimensions.height} · ` : ''}{displayed?.mimeType.split('/')[1]?.toUpperCase() ?? source.kind}{!!displayed?.size && ` · ${displayed.size >= 1e6 ? `${(displayed.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(displayed.size / 1e3))} KB`}`}</small>{displayed?.derivation?.method && <small>{displayed.derivation.method}</small>}</div><div className="ml-caption-actions">{selectedVersion && <button className="secondary-button" type="button" aria-pressed={compare} onClick={() => setCompare(value => !value)}>{compare ? 'Show version' : 'Compare original'}</button>}{resolution.url && <a className="ml-icon-button" href={resolution.url} download={displayed?.name} aria-label="Download image"><Icon name="download" /></a>}</div></div>
        <p className="ml-preserved-note">Original preserved · Changes are saved as versions.</p>
        </section>}
        {source.kind === 'image' ? <section className="ml-versions-panel" aria-label="Image versions" inert={expandedPreview || extrasOpen || !!pendingDelete}>
          <div className="ml-versions-heading">{backgroundPreference}<div className="ml-version-toolbar">{generateButton}<button className="ml-icon-button" type="button" aria-label="More versions" title="More versions" onClick={() => setExtrasOpen(true)}><Icon name="plus" /></button><details ref={menuRef} className="ml-outputs" onToggle={event => {
            if (!event.currentTarget.open) return;
            const panel = event.currentTarget.querySelector<HTMLElement>('.ml-output-menu');
            if (!panel) return;
            if (window.innerWidth <= 760) { panel.style.removeProperty('top'); panel.style.removeProperty('left'); return; }
            const bounds = event.currentTarget.getBoundingClientRect();
            const height = Math.min(window.innerHeight * .65, 600);
            panel.style.top = `${Math.max(16, Math.min(bounds.bottom + 6, window.innerHeight - height - 16))}px`;
            panel.style.left = `${Math.max(16, Math.min(bounds.right - 290, window.innerWidth - 306))}px`;
          }}><summary aria-label="Version options" title="Choose versions and tools"><span aria-hidden="true">⋯</span></summary><div className="ml-output-menu">
            <strong>Create versions</strong>{variantOptions.map(option => <label key={option.id} className="ml-check"><input type="checkbox" checked={queue.preferences.outputs.includes(option.id)} onChange={event => queue.setPreferences(value => ({ ...value, outputs: event.target.checked ? [...value.outputs, option.id] : value.outputs.filter(id => id !== option.id) }))} /><span>{option.title}</span></label>)}
            <button className="ghost-button ml-menu-tool" type="button" disabled={queue.busy || !generationInput} onClick={() => edit('segmentation')}>Single-zone masks…</button><div className="ml-menu-separator" />{automation}
            {queue.profile.canEnableAI && <label className="ml-check"><input type="checkbox" checked={queue.ai} onChange={event => queue.setAI(event.target.checked)} /><span>Enable AI tools<small>{queue.profile.mobile ? 'Manual use · may need more memory' : 'Background ~44 MB · Depth ~27 MB'}</small></span></label>}
            <div className="ml-menu-separator" /><strong>Manual tools</strong>
            <button type="button" className="ghost-button ml-menu-tool" disabled={queue.busy} onClick={() => edit('background')}>Erase / restore mask</button>
            <button type="button" className="ghost-button ml-menu-tool" disabled={queue.busy || !generationInput} onClick={() => edit('segmentation')}>Surfaces & gradients</button>
            <button type="button" className="ghost-button ml-menu-tool" onClick={props.onOpenProBeta}>Generate with Pro</button>
            <button type="button" className="ghost-button ml-menu-tool" onClick={() => { setSelectedKind(null); setExtraVersionId(null); setCompare(false); setExpandedPreview(true); setDraftName(source.name); setRename(true); menuRef.current?.removeAttribute('open'); }}>Rename original</button>
            <button type="button" className="ghost-button ml-menu-tool ml-danger" onClick={() => { setPendingDelete(displayed ?? source); menuRef.current?.removeAttribute('open'); }}>Delete {selectedVersion && !compare ? 'version' : 'original'}…</button>
          </div></details></div></div>
          {sourceBusy && <div className="ml-analysis-progress" role="status"><Spinner /><div><strong>Generating…</strong></div><button className="ghost-button" type="button" onClick={queue.cancel}>Cancel</button></div>}
          <div className="ml-version-grid ml-primary-versions">{originalCard}{shown.map(renderVersion)}</div>
          {gradientControlsOpen && <form className="ml-gradient-controls" aria-label="Gradient map settings" onSubmit={event => { event.preventDefault(); if (!canProcess || queue.busy) return; setExtraVersionId(null); setSelectedKind('gradient'); setCompare(false); queue.generate(source, ['gradient'], false, { regenerate: true, gradientSettings }); }}>
            <div className="ml-gradient-label"><Icon name="adjust" /><strong>Gradient map</strong></div>
            <label className="ml-gradient-slider"><span>Target zones<output>{gradientSettings.zones}</output></span><RangeInput aria-label="Target zones" title="Target, not exact count; isolated pieces stay separate" min={2} max={48} value={gradientSettings.zones} disabled={queue.busy} onChange={event => setGradientDraft({ sourceId: source.id, settings: { ...gradientSettings, zones: Number(event.target.value) } })} /></label>
            <label className="ml-gradient-slider"><span>Smooth surfaces<output>{gradientSettings.smoothing}%</output></span><RangeInput aria-label="Smooth surfaces" min={0} max={100} value={gradientSettings.smoothing} disabled={queue.busy} onChange={event => setGradientDraft({ sourceId: source.id, settings: { ...gradientSettings, smoothing: Number(event.target.value) } })} /></label>
            <button className="secondary-button" type="submit" disabled={!canProcess || queue.busy}>{sourceBusy ? 'Generating…' : latest('gradient') ? 'Update gradient' : 'Create gradient'}</button>
            <button className="ghost-button" type="button" disabled={queue.busy || !generationInput} onClick={() => edit('gradient')}>Advanced…</button>
            <button className="ml-icon-button" type="button" aria-label="Close gradient controls" onClick={() => setGradientControlsOpen(false)}><Icon name="close" /></button>
          </form>}
        </section> : <div className="ml-video-tools" inert={expandedPreview || !!pendingDelete}>{originalCard}<p>Videos are ready to use directly in the timeline.</p><button className="secondary-button" onClick={() => { setExpandedPreview(true); setDraftName(source.name); setRename(true); }}>Rename</button><button className="ghost-button ml-danger" onClick={() => setPendingDelete(source)}>Delete video…</button></div>}
      </> : null}</main></div>}
      {extrasOpen && <section className="ml-extras-panel" role="dialog" aria-modal="true" aria-label="More versions" inert={expandedPreview || !!pendingDelete}><div className="ml-section-label"><span>More versions</span><button autoFocus className="ml-icon-button" type="button" aria-label="Close more versions" onClick={() => setExtrasOpen(false)}><Icon name="close" /></button></div><div className="ml-extras-body">
        <div className="ml-version-grid">{additionalOptions.map(renderVersion)}</div>
        {otherVersions.length > 0 && <section className="ml-more-versions" aria-label="Previous versions"><h3>Previous versions · {otherVersions.length}</h3><div className="ml-version-grid">{otherVersions.map(asset => <article key={asset.id} className="ml-version"><div className="ml-version-media"><button type="button" className="ml-version-preview" aria-label={`Preview ${asset.name}`} onClick={() => { setExtraVersionId(asset.id); setSelectedKind(null); setCompare(false); setExpandedPreview(true); }}><Artwork asset={asset} url={thumbnails[asset.id]} /></button><div className="ml-version-actions"><button className="primary-button" onClick={() => use(asset)}>Use</button><button className="secondary-button ml-danger" onClick={() => setPendingDelete(asset)}>Delete</button></div></div><div className="ml-version-content"><h4 title={asset.name}>{asset.name}</h4></div></article>)}</div></section>}
      </div></section>}
      {pendingDelete && <div className="ml-confirm-backdrop"><section className="ml-confirm" role="alertdialog" aria-modal="true" aria-labelledby="ml-delete-title"><h3 id="ml-delete-title">Delete {pendingDelete.derivation ? 'this version' : 'this asset'}?</h3><p><strong>{pendingDelete.name}</strong> will be removed from the project. {pendingDelete.derivation ? 'The original will stay.' : 'Generated versions will stay available.'}</p><div><button autoFocus className="secondary-button" onClick={() => setPendingDelete(null)}>Keep asset</button><button className="secondary-button ml-danger" onClick={() => { props.onRemoveAsset(pendingDelete.id); setPendingDelete(null); setSelectedKind(null); }}>Delete</button></div></section></div>}
    </section>
  </div>;
}
