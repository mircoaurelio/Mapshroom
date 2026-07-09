import { useEffect, useRef, useState } from 'react';
import type { WorkspaceMode } from '../types';

type ToolbarMenuKey = 'file' | 'shader' | 'view';

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
  const [openMenu, setOpenMenu] = useState<ToolbarMenuKey | null>(null);
  const toolbarMenusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (toolbarMenusRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpenMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const toggleMenu = (menu: ToolbarMenuKey) => {
    setOpenMenu((currentMenu) => (currentMenu === menu ? null : menu));
  };

  const closeMenu = () => setOpenMenu(null);

  return (
    <header className="workspace-toolbar">
      <strong className="toolbar-brand">Mapshroom</strong>
      <div className="toolbar-actions">
        <div className="toolbar-menu-group toolbar-menu-group-right" ref={toolbarMenusRef}>
          <div className="toolbar-menu-shell toolbar-menu-shell-align-right">
            <button
              type="button"
              className={`secondary-button toolbar-menu-button ${
                openMenu === 'file' ? 'toolbar-menu-button-active' : ''
              }`}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'file'}
              onClick={() => toggleMenu('file')}
            >
              File
            </button>

            {openMenu === 'file' ? (
              <div className="toolbar-menu-panel" role="menu" aria-label="File options">
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenProjects();
                    closeMenu();
                  }}
                >
                  Projects
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenAssets();
                    closeMenu();
                  }}
                >
                  Assets
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenShare();
                    closeMenu();
                  }}
                >
                  Share
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenExport();
                    closeMenu();
                  }}
                >
                  Export
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenSettings();
                    closeMenu();
                  }}
                >
                  Settings
                </button>
              </div>
            ) : null}
          </div>

          <div className="toolbar-menu-shell toolbar-menu-shell-align-right">
            <button
              type="button"
              className={`secondary-button toolbar-menu-button ${
                openMenu === 'shader' ? 'toolbar-menu-button-active' : ''
              }`}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'shader'}
              onClick={() => toggleMenu('shader')}
            >
              Shader
            </button>

            {openMenu === 'shader' ? (
              <div className="toolbar-menu-panel" role="menu" aria-label="Shader options">
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onNewShader();
                    closeMenu();
                  }}
                >
                  New Shader
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenPresetBrowser();
                    closeMenu();
                  }}
                >
                  Presets
                </button>
              </div>
            ) : null}
          </div>

          <div className="toolbar-menu-shell toolbar-menu-shell-align-right">
            <button
              type="button"
              className={`secondary-button toolbar-menu-button ${
                openMenu === 'view' ? 'toolbar-menu-button-active' : ''
              }`}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'view'}
              onClick={() => toggleMenu('view')}
            >
              View
            </button>

            {openMenu === 'view' ? (
              <div className="toolbar-menu-panel" role="menu" aria-label="View options">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={sidebarVisible}
                  className="toolbar-menu-item"
                  onClick={() => {
                    onToggleSidebarVisibility();
                    closeMenu();
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
                    closeMenu();
                  }}
                >
                  <span>{desktopSlidersWindowEnabled ? 'On' : 'Off'}</span>
                  Sliders
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={workspaceMode === 'immersive'}
                  className="toolbar-menu-item"
                  onClick={() => {
                    onToggleWorkspaceMode();
                    closeMenu();
                  }}
                >
                  <span>{workspaceMode === 'immersive' ? 'On' : 'Off'}</span>
                  Immersive
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={midiEnabled}
                  className="toolbar-menu-item"
                  title={
                    midiEnabled
                      ? midiPanelVisible
                        ? 'Disable MIDI controller'
                        : 'Show MIDI monitor'
                      : 'Enable MIDI controller'
                  }
                  onClick={() => {
                    onToggleMidi();
                    closeMenu();
                  }}
                >
                  <span>{midiEnabled ? 'On' : 'Off'}</span>
                  MIDI
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="toolbar-runtime-actions">
          <button type="button" className="primary-button" onClick={onOpenOutput}>
            Output
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
        </div>
      </div>
    </header>
  );
}
