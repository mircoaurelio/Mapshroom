import type { ReactNode } from 'react';
import type { MobileUiMode } from '../types';

export type MobilePanelKey = 'studio' | 'mapping' | 'sliders' | null;

interface MobileChromeProps {
  activeAssetName: string;
  isPlaying: boolean;
  isTimelineOpen: boolean;
  isShaderEditing: boolean;
  uiMode: Exclude<MobileUiMode, 'hidden'>;
  activePanel: MobilePanelKey;
  onOpenProjects: () => void;
  onOpenShare: () => void;
  onOpenAssets: () => void;
  onOpenSettings: () => void;
  onOpenTimeline: () => void;
  onToggleMapping: () => void;
  onHide: () => void;
  onPlayToggle: () => void;
  onFinishShaderEditing: () => void;
  onPreviousShader: () => void;
  onNextShader: () => void;
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
  isShaderEditing,
  uiMode,
  activePanel,
  onOpenProjects,
  onOpenShare,
  onOpenAssets,
  onOpenSettings,
  onOpenTimeline,
  onToggleMapping,
  onHide,
  onPlayToggle,
  onFinishShaderEditing,
  onPreviousShader,
  onNextShader,
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
        </div>
      </header>

      {isShaderEditing ? (
        <div className="mobile-shader-dot-controls" aria-label="Held shader controls">
          <button type="button" onClick={onPreviousShader} aria-label="Previous timeline shader" title="Previous">‹</button>
          <button type="button" className="mobile-shader-dot-control-active" onClick={onFinishShaderEditing} aria-label="Resume timeline playback" title="Play timeline">▶</button>
          <button type="button" onClick={onNextShader} aria-label="Next timeline shader" title="Next">›</button>
        </div>
      ) : null}

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
          className={hasVisibleControls ? 'mobile-dock-button-active' : ''}
          onClick={hasVisibleControls ? onHide : onToggleMapping}
        >
          {hasVisibleControls ? 'Hide' : 'Map'}
        </button>
        <button
          type="button"
          className={isShaderEditing ? 'mobile-dock-button-editing' : isPlaying ? 'mobile-dock-button-active' : ''}
          onClick={isShaderEditing ? onFinishShaderEditing : onPlayToggle}
          aria-label={isShaderEditing ? 'Finish editing shader and resume timeline' : isPlaying ? 'Pause timeline' : 'Play timeline'}
        >
          {isShaderEditing ? <><span className="mobile-circular-mode-icon" aria-hidden="true">↻</span>Resume</> : isPlaying ? 'Pause' : 'Play'}
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
