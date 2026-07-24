import type { ReactNode } from 'react';
import type { MobileUiMode } from '../types';
import { InstallAppButton } from './InstallAppCallout';

export type MobilePanelKey = 'studio' | 'mapping' | 'sliders' | null;

interface MobileChromeProps {
  activeAssetName: string;
  isTimelineOpen: boolean;
  uiMode: Exclude<MobileUiMode, 'hidden'>;
  activePanel: MobilePanelKey;
  moveMode: boolean;
  onOpenProjects: () => void;
  onOpenShare: () => void;
  onOpenAssets: () => void;
  onOpenSettings: () => void;
  onOpenProBeta: () => void;
  onOpenTimeline: () => void;
  onToggleMapping: () => void;
  onHide: () => void;
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
  isTimelineOpen,
  uiMode,
  activePanel,
  moveMode,
  onOpenProjects,
  onOpenShare,
  onOpenAssets,
  onOpenSettings,
  onOpenProBeta,
  onOpenTimeline,
  onToggleMapping,
  onHide,
  onPanelChange,
  panels,
}: MobileChromeProps) {
  const hasVisibleControls =
    (activePanel !== null && uiMode === 'full') || activePanel === 'sliders';
  const moveControlsVisible = moveMode && uiMode === 'full';

  return (
    <>
      <header className="mobile-header">
        <button type="button" className="mobile-header-logo" onClick={onHide}>
          <strong>Mapshroom</strong>
          <span className="mobile-header-meta">{activeAssetName}</span>
        </button>
        <div className="mobile-header-actions">
          <button type="button" className="secondary-button" onClick={onOpenProjects}>
            Project
          </button>
          <button type="button" className="secondary-button" onClick={onOpenShare}>
            Share
          </button>
          <button type="button" className="secondary-button mobile-assets-button" onClick={onOpenAssets}>
            Assets
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSettings}>
            Settings
          </button>
          <InstallAppButton
            className="mobile-install-control"
            onOpenProBeta={onOpenProBeta}
          />
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
          onClick={() => onPanelChange(activePanel === 'sliders' ? null : 'sliders')}
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
          className={
            hasVisibleControls
              ? 'mobile-dock-button-active'
              : moveControlsVisible
                ? 'mobile-dock-button-active mobile-dock-move-button-active'
                : 'mobile-dock-move-button'
          }
          aria-pressed={hasVisibleControls ? undefined : moveControlsVisible}
          onClick={hasVisibleControls ? onHide : onToggleMapping}
        >
          {hasVisibleControls ? (
            'Hide'
          ) : (
            <>
              Move <small>{moveControlsVisible ? 'On' : 'Off'}</small>
            </>
          )}
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
