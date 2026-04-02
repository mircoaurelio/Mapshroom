import type { ReactNode } from 'react';

export type MobilePanelKey = 'library' | 'studio' | 'ai' | 'mapping' | null;

interface MobileChromeProps {
  activeAssetName: string;
  isPlaying: boolean;
  activePanel: MobilePanelKey;
  onOpenOutput: () => void;
  onHideUi: () => void;
  onPlayToggle: () => void;
  onPanelChange: (panel: MobilePanelKey) => void;
  panels: {
    library: ReactNode;
    studio: ReactNode;
    ai: ReactNode;
    mapping: ReactNode;
  };
}

const MOBILE_PANEL_TITLES: Record<Exclude<MobilePanelKey, null>, string> = {
  library: 'Library',
  studio: 'Studio',
  ai: 'AI',
  mapping: 'Mapping',
};

export function MobileChrome({
  activeAssetName,
  isPlaying,
  activePanel,
  onOpenOutput,
  onHideUi,
  onPlayToggle,
  onPanelChange,
  panels,
}: MobileChromeProps) {
  return (
    <>
      <header className="mobile-header">
        <div>
          <span className="panel-eyebrow">Mapshroom V3</span>
          <strong>{activeAssetName}</strong>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onOpenOutput}>
            Output
          </button>
          <button type="button" className="secondary-button" onClick={onHideUi}>
            Hide UI
          </button>
        </div>
      </header>

      <nav className="mobile-dock">
        <button type="button" onClick={() => onPanelChange('library')}>
          Library
        </button>
        <button type="button" onClick={() => onPanelChange('studio')}>
          Studio
        </button>
        <button type="button" onClick={() => onPanelChange('ai')}>
          AI
        </button>
        <button type="button" onClick={() => onPanelChange('mapping')}>
          Map
        </button>
        <button type="button" onClick={onPlayToggle}>
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
            {activePanel === 'library' ? panels.library : null}
            {activePanel === 'studio' ? panels.studio : null}
            {activePanel === 'ai' ? panels.ai : null}
            {activePanel === 'mapping' ? panels.mapping : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
