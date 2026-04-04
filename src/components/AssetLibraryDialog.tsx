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
              Active Media Preview
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body asset-browser-dialog-body">
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
