import { useEffect, useRef, useState } from 'react';
import type { WorkspaceMode } from '../types';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  sidebarVisible: boolean;
  desktopSlidersWindowEnabled: boolean;
  onOpenProjects: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenAssets: () => void;
  onOpenSettings: () => void;
  onNewShader: () => void;
  onOpenPresetBrowser: () => void;
  onPlayToggle: () => void;
  onOpenOutput: () => void;
  onToggleWorkspaceMode: () => void;
  onToggleSidebarVisibility: () => void;
  onToggleDesktopSlidersWindow: () => void;
  midiEnabled: boolean;
  midiPanelVisible: boolean;
  onToggleMidi: () => void;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.75v8.5L12 8Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.25 3.5v9" />
      <path d="M10.75 3.5v9" />
    </svg>
  );
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  sidebarVisible,
  desktopSlidersWindowEnabled,
  onOpenProjects,
  onOpenShare,
  onOpenExport,
  onOpenAssets,
  onOpenSettings,
  onNewShader,
  onOpenPresetBrowser,
  onPlayToggle,
  onOpenOutput,
  onToggleWorkspaceMode,
  onToggleSidebarVisibility,
  onToggleDesktopSlidersWindow,
  midiEnabled,
  midiPanelVisible,
  onToggleMidi,
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
        <button type="button" className="primary-button" onClick={onNewShader}>
          New Shader
        </button>

        <button type="button" className="secondary-button" onClick={onOpenPresetBrowser}>
          Add Shader
        </button>

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

        <button type="button" className="secondary-button" onClick={onOpenProjects}>
          Project
        </button>
        <button type="button" className="secondary-button" onClick={onOpenShare}>
          Share
        </button>
        <button type="button" className="secondary-button" onClick={onOpenExport}>
          Export
        </button>
        <button type="button" className="secondary-button" onClick={onOpenAssets}>
          Assets
        </button>
        <button type="button" className="secondary-button" onClick={onOpenSettings}>
          Settings
        </button>
        <button
          type="button"
          className={`toggle-chip ${midiEnabled ? 'toggle-chip-active' : ''}`}
          aria-pressed={midiEnabled}
          title={
            midiEnabled
              ? midiPanelVisible
                ? 'Disable MIDI controller'
                : 'Show MIDI monitor'
              : 'Enable MIDI controller'
          }
          onClick={onToggleMidi}
        >
          MIDI
        </button>
        <button
          type="button"
          className="icon-button toolbar-transport-button"
          aria-label={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
          title={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
          onClick={onPlayToggle}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
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
