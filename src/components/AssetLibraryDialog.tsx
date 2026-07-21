import { useState } from 'react';
import { useAssetPreviewUrls } from '../lib/useAssetPreviewUrls';
import type { AssetRecord } from '../types';
import { MaskToolIcon } from './MaskToolIcon';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5 13.6 9.2 19 10.8 13.6 12.4 12 18.1 10.4 12.4 5 10.8 10.4 9.2 12 3.5Z" />
      <path d="M18.5 4.5 19.1 6.4 21 7 19.1 7.6 18.5 9.5 17.9 7.6 16 7 17.9 6.4 18.5 4.5Z" />
      <path d="M6.2 15.2 6.7 16.7 8.2 17.2 6.7 17.7 6.2 19.2 5.7 17.7 4.2 17.2 5.7 16.7 6.2 15.2Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

interface AssetLibraryDialogProps {
  open: boolean;
  activeAsset: AssetRecord | null;
  assetUrl: string | null;
  assets: AssetRecord[];
  activeAssetId: string | null;
  onLoadAsset: () => void;
  onSelectAsset: (assetId: string) => void;
  onRenameAsset: (assetId: string, name: string) => void;
  onEditMask: (assetId: string) => void;
  onRemoveAsset: (assetId: string) => void;
  onClose: () => void;
}

export function AssetLibraryDialog({
  open,
  activeAsset,
  assetUrl,
  assets,
  activeAssetId,
  onLoadAsset,
  onSelectAsset,
  onRenameAsset,
  onEditMask,
  onRemoveAsset,
  onClose,
}: AssetLibraryDialogProps) {
  const previewUrls = useAssetPreviewUrls(assets, open, activeAssetId, assetUrl);
  const orderedAssets = [...assets].reverse();
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<AssetRecord | null>(null);
  const [isGeneratePanelOpen, setIsGeneratePanelOpen] = useState(false);

  if (!open) {
    return null;
  }

  const closeGeneratePanel = () => setIsGeneratePanelOpen(false);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setIsGeneratePanelOpen(false);
          onClose();
        }
      }}
    >
      <section
        className="dialog-panel asset-browser-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-browser-title"
      >
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Assets</span>
            <h2 id="asset-browser-title" className="dialog-title">
              Media Library
            </h2>
          </div>
          <div className="asset-browser-header-actions">
            <button
              type="button"
              className="asset-browser-generate"
              onClick={() => setIsGeneratePanelOpen(true)}
              title="Generate with Nano Banana"
            >
              <SparkleIcon />
              <span>Generate</span>
            </button>
            <button type="button" className="primary-button asset-browser-import" onClick={onLoadAsset}>
              Import
            </button>
            <button type="button" className="asset-browser-close" onClick={onClose} aria-label="Close asset library" title="Close">
              ×
            </button>
          </div>
        </header>

        <div className="dialog-body asset-browser-dialog-body">
          <div className="asset-browser-gallery-shell">
              <div className="field-inline-label">
                <span>All Uploads</span>
                <small>{assets.length} items</small>
              </div>

              {assets.length === 0 ? (
                <div className="asset-browser-preview-placeholder asset-browser-gallery-empty">
                  Import images or videos to build your library.
                </div>
              ) : (
                <div className="asset-browser-preview-grid">
                  {orderedAssets.map((asset) => {
                    const previewUrl = previewUrls[asset.id] ?? null;
                    const isActive = asset.id === activeAssetId;

                    return (
                      <article
                        key={asset.id}
                        className={`asset-browser-preview-card ${
                          isActive ? 'asset-browser-preview-card-active' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="asset-browser-preview-card-main"
                          onClick={() => onSelectAsset(asset.id)}
                          aria-label={`Select ${asset.name}`}
                        >
                          <div className="asset-browser-preview-card-media-shell">
                          {previewUrl ? (
                            asset.kind === 'video' ? (
                              <video
                                className="asset-browser-preview-card-media"
                                src={previewUrl}
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                className="asset-browser-preview-card-media"
                                src={previewUrl}
                                alt={asset.name}
                              />
                            )
                          ) : (
                            <div className="asset-browser-preview-card-placeholder">
                              Loading {asset.kind}
                            </div>
                          )}
                          </div>
                        </button>
                        <input
                          className="asset-browser-card-name"
                          value={asset.name}
                          aria-label={`Rename ${asset.name}`}
                          title="Rename asset"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => onRenameAsset(asset.id, event.target.value)}
                          onBlur={(event) => {
                            if (!event.target.value.trim()) onRenameAsset(asset.id, 'Untitled asset');
                          }}
                        />
                        <button
                          type="button"
                          className="asset-browser-card-delete"
                          onClick={() => setPendingDeleteAsset(asset)}
                          aria-label={`Delete ${asset.name}`}
                          title="Delete asset"
                        >
                          <TrashIcon />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
          </div>
          <div className="asset-browser-preview-column">
            <div className="asset-browser-preview-shell">
              {activeAsset?.kind === 'image' && assetUrl ? (
                <div className="asset-browser-preview-actions">
                  <button type="button" className="asset-browser-remove-background" onClick={() => onEditMask(activeAsset.id)}>
                    <MaskToolIcon />
                    <span>Remove background</span>
                  </button>
                  <a className="asset-browser-preview-action" href={assetUrl} download={activeAsset.name} aria-label={`Download ${activeAsset.name}`} title="Download image">
                    <DownloadIcon />
                  </a>
                </div>
              ) : null}
              {activeAsset && assetUrl ? (
                activeAsset.kind === 'video' ? (
                  <video className="asset-browser-preview-media" src={assetUrl} controls playsInline />
                ) : (
                  <img className="asset-browser-preview-media" src={assetUrl} alt={activeAsset.name} />
                )
              ) : (
                <div className="asset-browser-preview-placeholder">Open an asset to preview it here.</div>
              )}
            </div>
          </div>
        </div>
        {isGeneratePanelOpen ? (
          <div
            className="asset-delete-confirm-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeGeneratePanel();
            }}
          >
            <section
              className="asset-generate-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="asset-generate-title"
              aria-describedby="asset-generate-copy"
            >
              <span className="panel-eyebrow">Nano Banana</span>
              <h3 id="asset-generate-title">Beta access ended for today</h3>
              <p id="asset-generate-copy">
                Nano Banana beta access has ended for now. It returns tomorrow for your spot.
              </p>
              <p className="asset-generate-workaround">
                Meanwhile, download an image from the library, edit it in Gemini or another image tool, then reupload
                it here with Import.
              </p>
              <div className="asset-delete-confirm-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={closeGeneratePanel}
                  autoFocus
                >
                  Got it
                </button>
              </div>
            </section>
          </div>
        ) : null}
        {pendingDeleteAsset ? (
          <div
            className="asset-delete-confirm-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setPendingDeleteAsset(null);
            }}
          >
            <section
              className="asset-delete-confirm-panel"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="asset-delete-confirm-title"
              aria-describedby="asset-delete-confirm-copy"
            >
              <span className="panel-eyebrow">Confirm removal</span>
              <h3 id="asset-delete-confirm-title">Delete this asset?</h3>
              <p id="asset-delete-confirm-copy">
                <strong>{pendingDeleteAsset.name}</strong> will be removed from this project and cannot be restored.
              </p>
              <div className="asset-delete-confirm-actions">
                <button type="button" className="secondary-button" onClick={() => setPendingDeleteAsset(null)} autoFocus>
                  Keep asset
                </button>
                <button
                  type="button"
                  className="asset-delete-confirm-button"
                  onClick={() => {
                    onRemoveAsset(pendingDeleteAsset.id);
                    setPendingDeleteAsset(null);
                  }}
                >
                  Delete asset
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
