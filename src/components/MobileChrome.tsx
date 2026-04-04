import type { ReactNode } from 'react';
import type { MobileUiMode } from '../types';

export type MobilePanelKey = 'studio' | 'mapping' | 'sliders' | null;

interface MobileChromeProps {
  activeAssetName: string;
  isPlaying: boolean;
  isTimelineOpen: boolean;
  uiMode: Exclude<MobileUiMode, 'hidden'>;
  activePanel: MobilePanelKey;
  onLoadAsset: () => void;
  onOpenSettings: () => void;
  onOpenTimeline: () => void;
  onToggleMapping: () => void;
  onHide: () => void;
  onPlayToggle: () => void;
  onPanelChange: (panel: MobilePanelKey) => void;
  panels: {
    studio: ReactNode;
    mapping: ReactNode;
  };
}

const MOBILE_PANEL_TITLES: Record<Exclude<MobilePanelKey, null>, string> = {
  studio: 'Shader',
  mapping: 'Mapping',
  sliders: 'Sliders',
};

export function MobileChrome({
  activeAssetName,
  isPlaying,
  isTimelineOpen,
  uiMode,
  activePanel,
  onLoadAsset,
  onOpenSettings,
  onOpenTimeline,
  onToggleMapping,
  onHide,
  onPlayToggle,
  onPanelChange,
  panels,
}: MobileChromeProps) {
  const hasVisibleControls =
    (activePanel !== null && uiMode === 'full') || activePanel === 'sliders';

  return (
    <>
      <header className="mobile-header">
        <button type="button" className="mobile-header-logo" onClick={onHide}>
          <strong>Mapshroom</strong>
          <span className="mobile-header-meta">{activeAssetName}</span>
        </button>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onLoadAsset}>
            Load
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <nav className="mobile-dock">
        <button
          type="button"
          className={activePanel === 'studio' ? 'mobile-dock-button-active' : ''}
          onClick={() => onPanelChange('studio')}
        >
          Shader
        </button>
        <button
          type="button"
          className={activePanel === 'sliders' ? 'mobile-dock-button-active' : ''}
          onClick={() => onPanelChange('sliders')}
        >
          Sliders
        </button>
        <button
          type="button"
          className={isTimelineOpen ? 'mobile-dock-button-active' : ''}
          onClick={onOpenTimeline}
        >
          Timeline
        </button>
        <button
          type="button"
          className={hasVisibleControls ? 'mobile-dock-button-active' : ''}
          onClick={hasVisibleControls ? onHide : onToggleMapping}
        >
          {hasVisibleControls ? 'Hide' : 'Map'}
        </button>
        <button
          type="button"
          className={isPlaying ? 'mobile-dock-button-active' : ''}
          onClick={onPlayToggle}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </nav>

      {activePanel && activePanel !== 'sliders' && uiMode === 'full' ? (
        <>
          <div
            className="mobile-sheet-backdrop"
            role="presentation"
            onClick={() => onPanelChange(null)}
          />
          <aside className="mobile-sheet">
            <div className="mobile-sheet-header">
              <strong>{MOBILE_PANEL_TITLES[activePanel]}</strong>
              <button type="button" className="ghost-button" onClick={() => onPanelChange(null)}>
                Close
              </button>
            </div>
            <div className="mobile-sheet-body">
              {activePanel === 'studio' ? panels.studio : null}
              {activePanel === 'mapping' ? panels.mapping : null}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
