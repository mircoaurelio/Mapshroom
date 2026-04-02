import type { StageTransform } from '../types';
import { type MappingAction, MappingPad } from './MappingPad';
import { PanelSection } from './PanelSection';

interface MappingPanelProps {
  stageTransform: StageTransform;
  onToggleMoveMode: () => void;
  onReset: () => void;
  onPrecisionChange: (value: number) => void;
  onToggleRotationLock: () => void;
  onAction: (action: MappingAction) => void;
}

export function MappingPanel({
  stageTransform,
  onToggleMoveMode,
  onReset,
  onPrecisionChange,
  onToggleRotationLock,
  onAction,
}: MappingPanelProps) {
  return (
    <>
      <PanelSection title="Stage Mapping" eyebrow="Mapping">
        <div className="stack gap-md">
          <div className="button-row">
            <button
              type="button"
              className={`toggle-chip ${stageTransform.moveMode ? 'toggle-chip-active' : ''}`}
              onClick={onToggleMoveMode}
            >
              {stageTransform.moveMode ? 'Move Mode On' : 'Move Mode Off'}
            </button>
            <button type="button" className="secondary-button" onClick={onReset}>
              Reset Framing
            </button>
          </div>
          <label className="field">
            <span>Precision</span>
            <input
              type="range"
              min={1}
              max={40}
              value={stageTransform.precision}
              onChange={(event) => onPrecisionChange(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className={`toggle-chip ${stageTransform.rotationLocked ? 'toggle-chip-active' : ''}`}
            onClick={onToggleRotationLock}
          >
            {stageTransform.rotationLocked ? 'Rotation Locked' : 'Lock Rotation'}
          </button>
          <p className="helper-copy">
            V3 keeps mapping intentionally simple: move and resize now, distort later.
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Tap Grid" eyebrow="Adjust">
        <MappingPad onAction={onAction} disabled={!stageTransform.moveMode} />
      </PanelSection>
    </>
  );
}
