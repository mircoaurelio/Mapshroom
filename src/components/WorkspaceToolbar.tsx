import type { WorkspaceMode } from '../types';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  onLoadAsset: () => void;
  onOpenSettings: () => void;
  onPlayToggle: () => void;
  onOpenOutput: () => void;
  onToggleWorkspaceMode: () => void;
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  onLoadAsset,
  onOpenSettings,
  onPlayToggle,
  onOpenOutput,
  onToggleWorkspaceMode,
}: WorkspaceToolbarProps) {
  return (
    <header className="workspace-toolbar">
      <strong className="toolbar-brand">Mapshroom</strong>
      <div className="toolbar-actions">
        <button type="button" className="secondary-button" onClick={onLoadAsset}>
          Load
        </button>
        <button type="button" className="secondary-button" onClick={onOpenSettings}>
          APIs
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
