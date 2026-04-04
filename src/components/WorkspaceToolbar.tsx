import { useEffect, useRef, useState } from 'react';
import type { WorkspaceMode } from '../types';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  sidebarVisible: boolean;
  desktopSlidersWindowEnabled: boolean;
  onOpenAssets: () => void;
  onOpenSettings: () => void;
  onPlayToggle: () => void;
  onOpenOutput: () => void;
  onToggleWorkspaceMode: () => void;
  onToggleSidebarVisibility: () => void;
  onToggleDesktopSlidersWindow: () => void;
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  sidebarVisible,
  desktopSlidersWindowEnabled,
  onOpenAssets,
  onOpenSettings,
  onPlayToggle,
  onOpenOutput,
  onToggleWorkspaceMode,
  onToggleSidebarVisibility,
  onToggleDesktopSlidersWindow,
}: WorkspaceToolbarProps) {
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isViewMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (viewMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsViewMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsViewMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewMenuOpen]);

  return (
    <header className="workspace-toolbar">
      <strong className="toolbar-brand">Mapshroom</strong>
      <div className="toolbar-actions">
        <div className="toolbar-menu-shell" ref={viewMenuRef}>
          <button
            type="button"
            className={`secondary-button toolbar-menu-button ${
              isViewMenuOpen ? 'toolbar-menu-button-active' : ''
            }`}
            aria-haspopup="menu"
            aria-expanded={isViewMenuOpen}
            onClick={() => setIsViewMenuOpen((currentValue) => !currentValue)}
          >
            View
          </button>

          {isViewMenuOpen ? (
            <div className="toolbar-menu-panel" role="menu" aria-label="View options">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={sidebarVisible}
                className="toolbar-menu-item"
                onClick={() => {
                  onToggleSidebarVisibility();
                  setIsViewMenuOpen(false);
                }}
              >
                <span>{sidebarVisible ? 'On' : 'Off'}</span>
                Panels
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={desktopSlidersWindowEnabled}
                className="toolbar-menu-item"
                onClick={() => {
                  onToggleDesktopSlidersWindow();
                  setIsViewMenuOpen(false);
                }}
              >
                <span>{desktopSlidersWindowEnabled ? 'On' : 'Off'}</span>
                Sliders Window
              </button>
            </div>
          ) : null}
        </div>

        <button type="button" className="secondary-button" onClick={onOpenAssets}>
          Assets
        </button>
        <button type="button" className="secondary-button" onClick={onOpenSettings}>
          Settings
        </button>
        <button type="button" className="secondary-button" onClick={onPlayToggle}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="secondary-button" onClick={onOpenOutput}>
          Output
        </button>
        <button
          type="button"
          className={`toggle-chip ${workspaceMode === 'immersive' ? 'toggle-chip-active' : ''}`}
          onClick={onToggleWorkspaceMode}
        >
          {workspaceMode === 'immersive' ? 'Immersive' : 'Split'}
        </button>
      </div>
    </header>
  );
}
