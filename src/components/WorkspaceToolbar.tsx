import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceMode } from '../types';
import type { AudioCaptureSource } from '../lib/audioReactivity';
import { FeedbackDialog } from './FeedbackDialog';
type ToolbarMenuKey = 'file' | 'audio';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  sidebarVisible: boolean;
  desktopSlidersWindowEnabled: boolean;
  colorTheme: 'green' | 'pink';
  showMoveButton: boolean;
  moveMode: boolean;
  audioReactiveEnabled: boolean;
  audioReactiveListening: boolean;
  audioReactiveSource: AudioCaptureSource;
  onOpenProjects: () => void;
  onSaveProjectFile: () => void;
  onOpenProjectFile: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onNewShader: () => void;
  onOpenPresetBrowser: () => void;
  onPlayToggle: () => void;
  onToggleMoveMode: () => void;
  onToggleAudioReactive: () => void;
  onStartAudioReactive: (source: AudioCaptureSource) => void;
  onToggleWorkspaceMode: () => void;
  onToggleSidebarVisibility: () => void;
  onToggleDesktopSlidersWindow: () => void;
  onToggleColorTheme: () => void;
  midiEnabled: boolean;
  midiPanelVisible: boolean;
  onToggleMidi: () => void;
  onOpenSliceStudio: () => void;
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 2.4v1.3M8 12.3v1.3M2.4 8h1.3M12.3 8h1.3M4.05 4.05l.92.92M11.03 11.03l.92.92M11.95 4.05l-.92.92M4.97 11.03l-.92.92" />
    </svg>
  );
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  sidebarVisible,
  desktopSlidersWindowEnabled,
  colorTheme,
  showMoveButton,
  moveMode,
  audioReactiveEnabled,
  audioReactiveListening,
  audioReactiveSource,
  onOpenProjects,
  onSaveProjectFile,
  onOpenProjectFile,
  onOpenShare,
  onOpenExport,
  onOpenSettings,
  onNewShader,
  onOpenPresetBrowser,
  onPlayToggle,
  onToggleMoveMode,
  onToggleAudioReactive,
  onStartAudioReactive,
  onToggleWorkspaceMode,
  onToggleSidebarVisibility,
  onToggleDesktopSlidersWindow,
  onToggleColorTheme,
  midiEnabled,
  midiPanelVisible,
  onToggleMidi,
  onOpenSliceStudio,
}: WorkspaceToolbarProps) {
  const [openMenu, setOpenMenu] = useState<ToolbarMenuKey | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
                    onOpenProjectFile();
                    closeMenu();
                  }}
                >
                  Open File
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onSaveProjectFile();
                    closeMenu();
                  }}
                >
                  Export JSON (without media)
                </button>
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
                <div className="toolbar-menu-divider" role="separator" />
                <span className="toolbar-menu-section-label">Shader</span>
                <button type="button" role="menuitem" className="toolbar-menu-item" onClick={() => { onNewShader(); closeMenu(); }}>New Shader</button>
                <button type="button" role="menuitem" className="toolbar-menu-item" onClick={() => { onOpenPresetBrowser(); closeMenu(); }}>Presets</button>
                <div className="toolbar-menu-divider" role="separator" />
                <span className="toolbar-menu-section-label">View</span>
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
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={colorTheme === 'pink'}
                  className="toolbar-menu-item toolbar-menu-item-pink-theme"
                  onClick={() => {
                    onToggleColorTheme();
                    closeMenu();
                  }}
                >
                  <span aria-hidden="true">♥</span>
                  Pink mode
                </button>
                <div className="toolbar-menu-divider" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    onOpenSliceStudio();
                    closeMenu();
                  }}
                >
                  Slicer OBJ
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
                <div className="toolbar-menu-divider" role="separator" />
                <span className="toolbar-menu-section-label">Help</span>
                <Link
                  to="/why"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Why Mapshroom?
                </Link>
                <Link
                  to="/tutorial"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Tutorial &amp; help
                </Link>
                <Link
                  to="/creatorchallenge"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Creator Challenge
                </Link>
                <Link
                  to="/download"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Download / install
                </Link>
                <Link
                  to="/profile"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Email profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={() => {
                    setFeedbackOpen(true);
                    closeMenu();
                  }}
                >
                  Send feedback
                </button>
                <Link
                  to="/privacy"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Privacy
                </Link>
              </div>
            ) : null}
          </div>

          <div className="toolbar-menu-shell toolbar-menu-shell-align-right toolbar-audio-reactive-shell">
            <button
              type="button"
              className={`secondary-button toolbar-menu-button toolbar-audio-reactive-button ${
                audioReactiveEnabled ? 'toolbar-audio-reactive-button-active' : ''
              } ${openMenu === 'audio' ? 'toolbar-menu-button-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'audio'}
              aria-controls="toolbar-audio-menu"
              onClick={() => toggleMenu('audio')}
            >
              Audio Reactive
              {audioReactiveListening ? <small>Live</small> : null}
            </button>
            {openMenu === 'audio' ? (
              <div id="toolbar-audio-menu" className="toolbar-menu-panel toolbar-audio-source-menu" role="menu" aria-label="Audio Reactive sources">
                <button type="button" role="menuitemradio"
                  aria-checked={audioReactiveEnabled && audioReactiveSource === 'microphone'}
                  className="toolbar-menu-item"
                  onClick={() => { closeMenu(); onStartAudioReactive('microphone'); }}>
                  Microphone
                </button>
                <button type="button" role="menuitemradio"
                  aria-checked={audioReactiveEnabled && audioReactiveSource === 'system'}
                  className="toolbar-menu-item"
                  onClick={() => { closeMenu(); onStartAudioReactive('system'); }}>
                  Computer audio
                </button>
                {audioReactiveEnabled ? (
                  <button type="button" role="menuitem" className="toolbar-menu-item"
                    onClick={() => { closeMenu(); onToggleAudioReactive(); }}>
                    Turn audio reactive off
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {showMoveButton ? (
            <button
              type="button"
              className={`secondary-button toolbar-menu-button toolbar-move-button ${
                moveMode ? 'toolbar-menu-button-active toolbar-move-button-active' : ''
              }`}
              aria-pressed={moveMode}
              title={moveMode ? 'Hide Move controls' : 'Show Move controls in workspace'}
              onClick={() => {
                closeMenu();
                onToggleMoveMode();
              }}
            >
              <span className="toolbar-move-indicator" aria-hidden="true" />
              <span>Move</span>
              {moveMode ? <small>Off</small> : null}
            </button>
          ) : null}
        </div>

        <div className="toolbar-runtime-actions" data-onboarding-area="topbar">
          <button
            type="button"
            className="icon-button toolbar-transport-button"
            aria-label={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
            title={isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
            onClick={onPlayToggle}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="icon-button toolbar-settings-button"
            aria-label="Open settings"
            title="Settings"
            onClick={onOpenSettings}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </header>
  );
}
