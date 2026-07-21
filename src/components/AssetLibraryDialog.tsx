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

  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
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
                        {asset.kind === 'image' ? (
                          <button
                            type="button"
                            className="asset-mask-icon-button asset-browser-card-mask"
                            onClick={() => onEditMask(asset.id)}
                            aria-label={`Edit mask for ${asset.name}`}
                            title="Edit mask"
                          >
                            <MaskToolIcon />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="asset-browser-card-delete"
                          onClick={() => onRemoveAsset(asset.id)}
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
      </section>
    </div>
  );
}
