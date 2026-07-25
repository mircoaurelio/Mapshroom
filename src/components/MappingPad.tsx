import { useRef, useState, type PointerEvent } from 'react';

export type MappingAction =
  | 'move-up'
  | 'move-down'
  | 'move-left'
  | 'move-right'
  | 'width-plus'
  | 'width-minus'
  | 'height-plus'
  | 'height-minus';

interface MappingPadProps {
  onAction: (action: MappingAction) => void;
  onPrecisionChange?: (value: number) => void;
  onImportPosition?: () => void;
  onExportPosition?: () => void;
  onRotationChange?: (value: number) => void;
  onFirstStepDismiss?: () => void;
  precision?: number;
  rotationDegrees?: number;
  showFirstStep?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'overlay';
}

type PrecisionDirection = 'left' | 'right' | null;

interface MappingPadActionItem {
  key: string;
  label: string;
  action?: MappingAction;
  accent?: boolean;
  kind?: 'precision';
}

const MIN_PRECISION = 1;
const MAX_PRECISION = 40;
const PRECISION_DRAG_STEP = 14;
const PRECISION_DOT_SCALES = [0.52, 0.68, 0.84, 1, 0.84, 0.68, 0.52];

const MAPPING_PAD_ACTIONS: MappingPadActionItem[] = [
  { key: 'height-minus', label: 'H-', action: 'height-minus' },
  { key: 'move-up', label: 'Up', action: 'move-up', accent: true },
  { key: 'height-plus', label: 'H+', action: 'height-plus' },
  { key: 'move-left', label: 'Left', action: 'move-left', accent: true },
  { key: 'precision', label: 'Precision', kind: 'precision', accent: true },
  { key: 'move-right', label: 'Right', action: 'move-right', accent: true },
  { key: 'width-minus', label: 'W-', action: 'width-minus' },
  { key: 'move-down', label: 'Down', action: 'move-down', accent: true },
  { key: 'width-plus', label: 'W+', action: 'width-plus' },
];

function clampPrecision(value: number): number {
  return Math.max(MIN_PRECISION, Math.min(MAX_PRECISION, Math.round(value)));
}

function ImportPositionIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 2.5v8.2" />
      <path d="m5.9 7.7 3.1 3.1 3.1-3.1" />
      <path d="M3.5 12.1v2.4h11v-2.4" />
    </svg>
  );
}

function ExportPositionIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 11V2.8" />
      <path d="m5.9 5.8 3.1-3 3.1 3" />
      <path d="M3.5 12.1v2.4h11v-2.4" />
    </svg>
  );
}

function DistortIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3.2 4.2 14.8 3l-1.1 11.8-10.8-1.1Z" />
      <circle cx="3.2" cy="4.2" r=".8" />
      <circle cx="14.8" cy="3" r=".8" />
      <circle cx="13.7" cy="14.8" r=".8" />
      <circle cx="2.9" cy="13.7" r=".8" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M14.2 6.5A5.8 5.8 0 1 0 14 12" />
      <path d="M14.2 2.9v3.7h-3.7" />
    </svg>
  );
}

export function MappingPad({
  onAction,
  onPrecisionChange,
  onImportPosition,
  onExportPosition,
  onRotationChange,
  onFirstStepDismiss,
  precision = 12,
  rotationDegrees = 0,
  showFirstStep = false,
  disabled = false,
  variant = 'default',
}: MappingPadProps) {
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startPrecision: number;
    dragged: boolean;
  } | null>(null);
  const [previewPrecision, setPreviewPrecision] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<PrecisionDirection>(null);
  const [rotationExpanded, setRotationExpanded] = useState(false);

  const displayPrecision = clampPrecision(previewPrecision ?? precision);
  const filledDots = Math.max(
    1,
    Math.round((displayPrecision / MAX_PRECISION) * PRECISION_DOT_SCALES.length),
  );

  const commitPrecision = (value: number) => {
    if (!onPrecisionChange) {
      return;
    }

    const next = clampPrecision(value);
    setPreviewPrecision(next);
    onPrecisionChange(next);
  };

  const resetPrecisionGesture = () => {
    dragStateRef.current = null;
    setPreviewPrecision(null);
    setDragDirection(null);
  };

  const handlePrecisionPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !onPrecisionChange) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPrecision: precision,
      dragged: false,
    };

    setPreviewPrecision(precision);
    setDragDirection(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePrecisionPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || disabled || !onPrecisionChange) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const nextPrecision = clampPrecision(
      dragState.startPrecision + Math.round(deltaX / PRECISION_DRAG_STEP),
    );

    if (Math.abs(deltaX) >= 6) {
      dragState.dragged = true;
    }

    setDragDirection(deltaX === 0 ? null : deltaX < 0 ? 'left' : 'right');
    commitPrecision(nextPrecision);
  };

  const handlePrecisionPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || disabled || !onPrecisionChange) {
      resetPrecisionGesture();
      return;
    }

    if (!dragState.dragged) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const half = bounds.left + bounds.width / 2;
      const step = event.clientX < half ? -1 : 1;
      commitPrecision(precision + step);
      setDragDirection(step < 0 ? 'left' : 'right');
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => {
      resetPrecisionGesture();
    }, 140);
  };

  return (
    <div
      className={`mapping-control-shell mapping-control-shell-${variant} ${
        rotationExpanded ? 'mapping-control-shell-rotation-open' : ''
      }`}
    >
      {showFirstStep ? (
        <aside
          className="mapping-first-step-callout"
          role="dialog"
          aria-labelledby="mapping-first-step-title"
          aria-describedby="mapping-first-step-description"
        >
          <button
            type="button"
            className="mapping-first-step-close"
            aria-label="Close move and precision guide"
            onClick={onFirstStepDismiss}
          >
            ×
          </button>
          <span className="mapping-first-step-kicker">Move &amp; precision</span>
          <h2 id="mapping-first-step-title">Align the projector output</h2>
          <p id="mapping-first-step-description">
            Use the arrows to position the image and W/H to resize it. Click either side of
            Precision for a one-step change, or drag it horizontally to change speed.
          </p>
          <div className="mapping-first-step-flow" aria-hidden="true">
            <span>Arrows</span>
            <i>→</i>
            <span>Position</span>
            <i>·</i>
            <span>W / H</span>
            <i>→</i>
            <span>Size</span>
          </div>
          <p className="mapping-first-step-note">
            Import and export preserve this framing as JSON. Rotate opens the output angle;
            Distort is reserved for a future update.
          </p>
          <button
            type="button"
            className="primary-button mapping-first-step-cta"
            onClick={onFirstStepDismiss}
          >
            Got it
          </button>
        </aside>
      ) : null}

      <div className="mapping-tool-row" aria-label="Mapping position tools">
        <button
          type="button"
          className="mapping-tool-button"
          title="Import position JSON"
          aria-label="Import position JSON"
          onClick={onImportPosition}
          disabled={disabled || !onImportPosition}
        >
          <ImportPositionIcon />
        </button>
        <button
          type="button"
          className="mapping-tool-button"
          title="Export position JSON"
          aria-label="Export position JSON"
          onClick={onExportPosition}
          disabled={disabled || !onExportPosition}
        >
          <ExportPositionIcon />
        </button>
        <button
          type="button"
          className="mapping-tool-button mapping-tool-button-future"
          title="Distort — coming in a future update"
          aria-label="Distort, coming in a future update"
          disabled
        >
          <DistortIcon />
        </button>
        <button
          type="button"
          className={`mapping-tool-button ${
            rotationExpanded ? 'mapping-tool-button-active' : ''
          }`}
          title={rotationExpanded ? 'Close rotation control' : 'Rotate output'}
          aria-label={rotationExpanded ? 'Close rotation control' : 'Rotate output'}
          aria-expanded={rotationExpanded}
          onClick={() => setRotationExpanded((currentValue) => !currentValue)}
          disabled={disabled || !onRotationChange}
        >
          <RotateIcon />
        </button>
      </div>

      {rotationExpanded ? (
        <div className="mapping-rotation-control">
          <label className="mapping-rotation-range">
            <span className="mapping-rotation-label">Rotate output</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotationDegrees}
              onChange={(event) => onRotationChange?.(Number(event.target.value))}
            />
          </label>
          <output>{Math.round(rotationDegrees)}°</output>
          <button
            type="button"
            className="mapping-rotation-reset"
            onClick={(event) => {
              event.preventDefault();
              onRotationChange?.(0);
            }}
          >
            Reset
          </button>
        </div>
      ) : null}

      <div className={`mapping-pad mapping-pad-${variant}`}>
        {MAPPING_PAD_ACTIONS.map((item) => {
          if (item.kind === 'precision') {
            return (
              <button
                key={item.key}
                type="button"
                className={`mapping-pad-button mapping-pad-button-${variant} mapping-precision-pad ${
                  item.accent ? 'mapping-pad-button-accent' : ''
                } ${previewPrecision !== null ? 'mapping-precision-pad-dragging' : ''}`}
                aria-label="Adjust precision. Click a side or drag horizontally."
                onPointerDown={handlePrecisionPointerDown}
                onPointerMove={handlePrecisionPointerMove}
                onPointerUp={handlePrecisionPointerUp}
                onPointerCancel={resetPrecisionGesture}
                onPointerLeave={() => {
                  if (previewPrecision !== null) {
                    setDragDirection(null);
                  }
                }}
                disabled={disabled || !onPrecisionChange}
              >
                <span className="mapping-precision-hint-row">
                  <span
                    className={`mapping-precision-hint ${
                      dragDirection === 'left' ? 'mapping-precision-hint-active' : ''
                    }`}
                  >
                    −
                  </span>
                  <span className="mapping-precision-title">Precision</span>
                  <span
                    className={`mapping-precision-hint ${
                      dragDirection === 'right' ? 'mapping-precision-hint-active' : ''
                    }`}
                  >
                    +
                  </span>
                </span>
                <span className="mapping-precision-value">{displayPrecision}</span>
                <span className="mapping-precision-dots" aria-hidden="true">
                  {PRECISION_DOT_SCALES.map((scale, index) => (
                    <span
                      key={`${item.key}-dot-${index}`}
                      className={`mapping-precision-dot ${
                        index < filledDots ? 'mapping-precision-dot-active' : ''
                      }`}
                      style={{ transform: `scale(${scale})` }}
                    />
                  ))}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`mapping-pad-button mapping-pad-button-${variant} ${
                item.accent ? 'mapping-pad-button-accent' : ''
              }`}
              onClick={() => {
                if (!item.action) {
                  return;
                }
                onAction(item.action);
              }}
              disabled={disabled || !item.action}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
