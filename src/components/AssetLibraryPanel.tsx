import { useState } from 'react';
import type { AssetRecord } from '../types';
import { PanelSection } from './PanelSection';

interface AssetLibraryPanelProps {
  assets: AssetRecord[];
  activeAssetId: string | null;
  onLoadAsset: () => void;
  onSelectAsset: (assetId: string) => void;
  onRemoveAsset: (assetId: string) => void;
}

export function AssetLibraryPanel({
  assets,
  activeAssetId,
  onLoadAsset,
  onSelectAsset,
  onRemoveAsset,
}: AssetLibraryPanelProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  return (
    <>
      <PanelSection
        title="Media Library"
        actions={
          <>
            <span className="asset-library-count">
              {assets.length} {assets.length === 1 ? 'item' : 'items'}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsImportDialogOpen(true)}
            >
              Import
            </button>
          </>
        }
      >
      <div className="stack gap-sm">
        <div className="asset-list">
          {assets.length === 0 ? (
            <p className="empty-copy">
              Use Import to add a video or image and start shaping the stage.
            </p>
          ) : (
            assets.map((asset) => (
              <article
                key={asset.id}
                className={`asset-row ${asset.id === activeAssetId ? 'asset-row-active' : ''}`}
              >
                <button
                  type="button"
                  className="asset-row-main"
                  onClick={() => onSelectAsset(asset.id)}
                >
                  <span className="asset-row-meta">
                    <strong>{asset.name}</strong>
                    <small>
                      {asset.kind} | {asset.sourceType}
                    </small>
                  </span>
                </button>
                <span className="asset-row-actions">
                  {asset.id === activeAssetId ? <span className="status-pill">Live</span> : null}
                  <button
                    type="button"
                    className="ghost-button asset-row-remove"
                    onClick={() => onRemoveAsset(asset.id)}
                  >
                    Remove
                  </button>
                </span>
              </article>
            ))
          )}
        </div>
      </div>
      </PanelSection>

      {isImportDialogOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsImportDialogOpen(false);
            }
          }}
        >
          <section
            className="dialog-panel asset-import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-import-title"
          >
            <header className="dialog-header">
              <div>
                <span className="panel-eyebrow">Media Library</span>
                <h2 id="asset-import-title" className="dialog-title">
                  Import Image or Video
                </h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Close
              </button>
            </header>

            <div className="dialog-body asset-import-dialog-body">
              <p className="dialog-note">
                Import opens the same file picker as the top toolbar, but keeps the library panel
                focused on the asset list.
              </p>

              <div className="status-card asset-import-dialog-card">
                <span className="status-card-label">Library</span>
                <strong className="status-card-value">
                  {assets.length} {assets.length === 1 ? 'asset ready' : 'assets ready'}
                </strong>
                <p className="helper-copy">
                  Images and videos stay in the library, and you can switch the live asset at any
                  time from the list.
                </p>
              </div>
            </div>

            <footer className="dialog-footer">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  onLoadAsset();
                }}
              >
                Choose Image / Video
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
