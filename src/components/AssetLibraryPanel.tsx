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
  return (
    <PanelSection title="Media Library">
      <div className="stack gap-sm">
        <button type="button" className="primary-button" onClick={onLoadAsset}>
          Load Image / Video
        </button>
        <div className="asset-list">
          {assets.length === 0 ? (
            <p className="empty-copy">Drop a video or image into the library to start shaping the stage.</p>
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
  );
}
