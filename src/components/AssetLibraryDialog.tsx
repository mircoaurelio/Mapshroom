import { useAssetPreviewUrls } from '../lib/useAssetPreviewUrls';
import type { AssetRecord } from '../types';
import { AssetLibraryPanel } from './AssetLibraryPanel';

interface AssetLibraryDialogProps {
  open: boolean;
  activeAsset: AssetRecord | null;
  assetUrl: string | null;
  assets: AssetRecord[];
  activeAssetId: string | null;
  onLoadAsset: () => void;
  onSelectAsset: (assetId: string) => void;
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
  onRemoveAsset,
  onClose,
}: AssetLibraryDialogProps) {
  const previewUrls = useAssetPreviewUrls(assets, open, activeAssetId, assetUrl);

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
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body asset-browser-dialog-body">
          <div className="asset-browser-preview-column">
            <div className="asset-browser-preview-shell">
              {activeAsset && assetUrl ? (
                activeAsset.kind === 'video' ? (
                  <video
                    className="asset-browser-preview-media"
                    src={assetUrl}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    className="asset-browser-preview-media"
                    src={assetUrl}
                    alt={activeAsset.name}
                  />
                )
              ) : (
                <div className="asset-browser-preview-placeholder">
                  Open an asset to preview it here.
                </div>
              )}
            </div>

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
                  {assets.map((asset) => {
                    const previewUrl = previewUrls[asset.id] ?? null;
                    const isActive = asset.id === activeAssetId;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`asset-browser-preview-card ${
                          isActive ? 'asset-browser-preview-card-active' : ''
                        }`}
                        onClick={() => onSelectAsset(asset.id)}
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
                        <span className="asset-browser-preview-card-meta">
                          <strong>{asset.name}</strong>
                          <small>
                            {asset.kind} | {asset.sourceType}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <AssetLibraryPanel
            assets={assets}
            activeAssetId={activeAssetId}
            onLoadAsset={onLoadAsset}
            onSelectAsset={onSelectAsset}
            onRemoveAsset={onRemoveAsset}
          />
        </div>
      </section>
    </div>
  );
}
