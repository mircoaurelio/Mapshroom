import type { ReactNode } from 'react';

export type MobilePanelKey = 'studio' | 'ai' | 'mapping' | null;

interface MobileChromeProps {
  activeAssetName: string;
  isPlaying: boolean;
  activePanel: MobilePanelKey;
  onLoadAsset: () => void;
  onOpenSettings: () => void;
  onToggleControls: () => void;
  onPlayToggle: () => void;
  onPanelChange: (panel: MobilePanelKey) => void;
  panels: {
    studio: ReactNode;
    ai: ReactNode;
    mapping: ReactNode;
  };
}

const MOBILE_PANEL_TITLES: Record<Exclude<MobilePanelKey, null>, string> = {
  studio: 'Studio',
  ai: 'AI',
  mapping: 'Mapping',
};

export function MobileChrome({
  activeAssetName,
  isPlaying,
  activePanel,
  onLoadAsset,
  onOpenSettings,
  onToggleControls,
  onPlayToggle,
  onPanelChange,
  panels,
}: MobileChromeProps) {
  return (
    <>
      <header className="mobile-header">
        <div>
          <strong>Mapshroom</strong>
          <span className="mobile-header-meta">{activeAssetName}</span>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onLoadAsset}>
            Load
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSettings}>
            APIs
          </button>
        </div>
      </header>

      <nav className="mobile-dock">
        <button
          type="button"
          className={activePanel === 'ai' ? 'mobile-dock-button-active' : ''}
          onClick={() => onPanelChange('ai')}
        >
          AI
        </button>
        <button
          type="button"
          className={activePanel === 'studio' ? 'mobile-dock-button-active' : ''}
          onClick={() => onPanelChange('studio')}
        >
          Shader
        </button>
        <button
          type="button"
          className={activePanel === 'mapping' ? 'mobile-dock-button-active' : ''}
          onClick={() => onPanelChange('mapping')}
        >
          Map
        </button>
        <button type="button" onClick={onToggleControls}>
          UI
        </button>
        <button
          type="button"
          className={isPlaying ? 'mobile-dock-button-active' : ''}
          onClick={onPlayToggle}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </nav>

      {activePanel ? (
        <aside className="mobile-sheet">
          <div className="mobile-sheet-header">
            <strong>{MOBILE_PANEL_TITLES[activePanel]}</strong>
            <button type="button" className="ghost-button" onClick={() => onPanelChange(null)}>
              Close
            </button>
          </div>
          <div className="mobile-sheet-body">
            {activePanel === 'studio' ? panels.studio : null}
            {activePanel === 'ai' ? panels.ai : null}
            {activePanel === 'mapping' ? panels.mapping : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
