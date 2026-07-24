import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceMode } from '../types';
import { InstallAppButton } from './InstallAppCallout';
import {
  advanceAssetsFirstStepToImport,
  ASSETS_FIRST_STEP_DELAY_MS,
  dismissAssetsFirstStepPermanently,
  isAssetsFirstStepDismissed,
  isAssetsImportStepPending,
  persistAssetsFirstStepElapsedMs,
  readAssetsFirstStepElapsedMs,
} from '../lib/assetsFirstStep';

type ToolbarMenuKey = 'file' | 'shader';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  sidebarVisible: boolean;
  desktopSlidersWindowEnabled: boolean;
  colorTheme: 'green' | 'pink';
  moveMode: boolean;
  onOpenProjects: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenAssets: () => void;
  onOpenSettings: () => void;
  onOpenProBeta: () => void;
  onNewShader: () => void;
  onOpenPresetBrowser: () => void;
  onPlayToggle: () => void;
  onOpenOutput: () => void;
  onToggleMoveMode: () => void;
  onToggleWorkspaceMode: () => void;
  onToggleSidebarVisibility: () => void;
  onToggleDesktopSlidersWindow: () => void;
  onToggleColorTheme: () => void;
  midiEnabled: boolean;
  midiPanelVisible: boolean;
  onToggleMidi: () => void;
  onOpenSliceStudio: () => void;
  assetsFirstStepEligible: boolean;
  onboardingActive: boolean;
  onAssetsFirstStepAdvance: () => void;
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

function AssetsIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.25" y="3.25" width="10.5" height="10.5" rx="1.8" />
      <path d="m4.5 11 2.15-2.3 1.7 1.65 1.3-1.25 1.1 1.15" />
      <circle cx="9.6" cy="6.45" r=".9" />
      <path d="M6.2 15.25h7.05a2.5 2.5 0 0 0 2.5-2.5V6.2" />
    </svg>
  );
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  sidebarVisible,
  desktopSlidersWindowEnabled,
  colorTheme,
  moveMode,
  onOpenProjects,
  onOpenShare,
  onOpenExport,
  onOpenAssets,
  onOpenSettings,
  onOpenProBeta,
  onNewShader,
  onOpenPresetBrowser,
  onPlayToggle,
  onOpenOutput,
  onToggleMoveMode,
  onToggleWorkspaceMode,
  onToggleSidebarVisibility,
  onToggleDesktopSlidersWindow,
  onToggleColorTheme,
  midiEnabled,
  midiPanelVisible,
  onToggleMidi,
  onOpenSliceStudio,
  assetsFirstStepEligible,
  onboardingActive,
  onAssetsFirstStepAdvance,
}: WorkspaceToolbarProps) {
  const [openMenu, setOpenMenu] = useState<ToolbarMenuKey | null>(null);
  const [assetsFirstStepVisible, setAssetsFirstStepVisible] = useState(false);
  const [assetsFirstStepAdvanced, setAssetsFirstStepAdvanced] = useState(() =>
    isAssetsImportStepPending(),
  );
  const toolbarMenusRef = useRef<HTMLDivElement | null>(null);
  const assetsFirstStepRemainingMsRef = useRef(
    Math.max(
      0,
      ASSETS_FIRST_STEP_DELAY_MS - readAssetsFirstStepElapsedMs(),
    ),
  );

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

  useEffect(() => {
    if (
      !assetsFirstStepEligible ||
      onboardingActive ||
      assetsFirstStepVisible ||
      assetsFirstStepAdvanced ||
      isAssetsFirstStepDismissed()
    ) {
      return;
    }

    let activeStartedAt: number | null = null;
    let timeoutId: number | null = null;

    const persistElapsedTime = () => {
      const elapsedMs = Math.max(
        0,
        ASSETS_FIRST_STEP_DELAY_MS - assetsFirstStepRemainingMsRef.current,
      );
      persistAssetsFirstStepElapsedMs(elapsedMs);
    };

    const pauseTimer = () => {
      if (activeStartedAt !== null) {
        assetsFirstStepRemainingMsRef.current = Math.max(
          0,
          assetsFirstStepRemainingMsRef.current - (performance.now() - activeStartedAt),
        );
        activeStartedAt = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      persistElapsedTime();
    };

    const revealFirstStep = () => {
      assetsFirstStepRemainingMsRef.current = 0;
      activeStartedAt = null;
      timeoutId = null;
      persistElapsedTime();
      setAssetsFirstStepVisible(true);
    };

    const startTimer = () => {
      if (document.hidden || activeStartedAt !== null) {
        return;
      }

      if (assetsFirstStepRemainingMsRef.current <= 0) {
        revealFirstStep();
        return;
      }

      activeStartedAt = performance.now();
      timeoutId = window.setTimeout(
        revealFirstStep,
        assetsFirstStepRemainingMsRef.current,
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      pauseTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    assetsFirstStepAdvanced,
    assetsFirstStepEligible,
    assetsFirstStepVisible,
    onboardingActive,
  ]);

  useEffect(() => {
    if (!assetsFirstStepVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissAssetsFirstStepPermanently();
        setAssetsFirstStepVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assetsFirstStepVisible]);

  const toggleMenu = (menu: ToolbarMenuKey) => {
    setOpenMenu((currentMenu) => (currentMenu === menu ? null : menu));
  };

  const closeMenu = () => setOpenMenu(null);
  const dismissAssetsFirstStep = () => {
    dismissAssetsFirstStepPermanently();
    assetsFirstStepRemainingMsRef.current = 0;
    setAssetsFirstStepVisible(false);
  };
  const openAssets = () => {
    if (assetsFirstStepVisible) {
      advanceAssetsFirstStepToImport();
      assetsFirstStepRemainingMsRef.current = 0;
      setAssetsFirstStepAdvanced(true);
      setAssetsFirstStepVisible(false);
      onAssetsFirstStepAdvance();
      onOpenAssets();
      return;
    }

    dismissAssetsFirstStep();
    onOpenAssets();
  };

  return (
    <header className="workspace-toolbar">
      <strong className="toolbar-brand">Mapshroom</strong>
      <div className="toolbar-actions">
        <div className="toolbar-menu-group toolbar-menu-group-right" ref={toolbarMenusRef}>
          <InstallAppButton
            className="workspace-install-control"
            onOpenProBeta={onOpenProBeta}
          />

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
                    openAssets();
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
                <Link
                  to="/download"
                  role="menuitem"
                  className="toolbar-menu-item"
                  onClick={closeMenu}
                >
                  Install help
                </Link>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            data-onboarding-area="mapping"
            className={`secondary-button toolbar-menu-button toolbar-move-button ${
              moveMode ? 'toolbar-menu-button-active toolbar-move-button-active' : ''
            }`}
            aria-pressed={moveMode}
            title={moveMode ? 'Turn move mode off' : 'Turn move mode on'}
            onClick={onToggleMoveMode}
          >
            <span className="toolbar-move-indicator" aria-hidden="true" />
            <span>Move</span>
            <small>{moveMode ? 'On' : 'Off'}</small>
          </button>

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

        </div>

        <div className="toolbar-runtime-actions" data-onboarding-area="topbar">
          <div className="toolbar-assets-shell">
            <button
              type="button"
              className="primary-button toolbar-assets-button asset-browser-shine"
              aria-describedby={assetsFirstStepVisible ? 'assets-first-step-title' : undefined}
              onClick={openAssets}
            >
              <AssetsIcon />
              <span>Assets</span>
            </button>
            {assetsFirstStepVisible ? (
              <aside
                className="toolbar-assets-callout"
                role="dialog"
                aria-labelledby="assets-first-step-title"
                aria-describedby="assets-first-step-description"
              >
                <span className="toolbar-assets-callout-arrow" aria-hidden="true" />
                <button
                  type="button"
                  className="toolbar-assets-callout-close"
                  aria-label="Close first step tip"
                  onClick={dismissAssetsFirstStep}
                >
                  ×
                </button>
                <div className="toolbar-assets-callout-icon" aria-hidden="true">
                  <AssetsIcon />
                  <span>✦</span>
                </div>
                <span className="toolbar-assets-callout-kicker">Start here</span>
                <h1 id="assets-first-step-title">First step: load your content here</h1>
                <p id="assets-first-step-description">
                  Add the image or video you want to transform, mask, and map.
                </p>
                <button
                  type="button"
                  className="primary-button toolbar-assets-callout-cta asset-browser-shine"
                  onClick={openAssets}
                >
                  <AssetsIcon />
                  <span>Open assets</span>
                </button>
              </aside>
            ) : null}
          </div>
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
    </header>
  );
}
