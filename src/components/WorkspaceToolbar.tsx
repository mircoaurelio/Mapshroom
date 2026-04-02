import type { WorkspaceMode } from '../types';

interface WorkspaceToolbarProps {
  isPlaying: boolean;
  workspaceMode: WorkspaceMode;
  onLoadAsset: () => void;
  onPlayToggle: () => void;
  onOpenOutput: () => void;
  onToggleWorkspaceMode: () => void;
}

export function WorkspaceToolbar({
  isPlaying,
  workspaceMode,
  onLoadAsset,
  onPlayToggle,
  onOpenOutput,
  onToggleWorkspaceMode,
}: WorkspaceToolbarProps) {
  return (
    <header className="workspace-toolbar">
      <div className="toolbar-brand">
        <span className="panel-eyebrow">Mapshroom V3</span>
        <strong>React platform rewrite</strong>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="secondary-button" onClick={onLoadAsset}>
          Load Asset
        </button>
        <button type="button" className="secondary-button" onClick={onPlayToggle}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="secondary-button" onClick={onOpenOutput}>
          Open Output Window
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
