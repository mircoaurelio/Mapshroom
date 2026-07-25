import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  MAX_MAPPING_ROTATION,
  MIN_MAPPING_ROTATION,
} from '../lib/mappingPosition';

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
  onImportPositionText?: (source: string) => string | null;
  onExportPosition?: (source?: string) => void;
  getPositionJson?: () => string;
  onRotationChange?: (value: number) => void;
  onToggleGrid?: () => void;
  onFirstStepDismiss?: () => void;
  precision?: number;
  rotationDegrees?: number;
  showGrid?: boolean;
  showFirstStep?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'overlay';
}

type PrecisionDirection = 'left' | 'right' | null;
type PositionPanel = 'import' | 'export' | null;
type PositionPanelMessage = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

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
const ROTATION_STEP = 0.1;

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

function clampRotation(value: number): number {
  const clamped = Math.max(
    MIN_MAPPING_ROTATION,
    Math.min(MAX_MAPPING_ROTATION, value),
  );
  return Math.round(clamped * 10) / 10;
}

function AddPositionIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 3v12" />
      <path d="M3 9h12" />
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

function GridIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2.5" y="2.5" width="13" height="13" rx="1.25" />
      <path d="M6.83 2.5v13M11.17 2.5v13M2.5 6.83h13M2.5 11.17h13" />
    </svg>
  );
}

export function MappingPad({
  onAction,
  onPrecisionChange,
  onImportPosition,
  onImportPositionText,
  onExportPosition,
  getPositionJson,
  onRotationChange,
  onToggleGrid,
  onFirstStepDismiss,
  precision = 12,
  rotationDegrees = 0,
  showGrid = false,
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
  const [positionPanel, setPositionPanel] = useState<PositionPanel>(null);
  const [positionPaste, setPositionPaste] = useState('');
  const [positionExportJson, setPositionExportJson] = useState('');
  const [positionPanelMessage, setPositionPanelMessage] =
    useState<PositionPanelMessage>(null);

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

  const handleRotationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    onRotationChange?.(
      clampRotation(rotationDegrees + direction * ROTATION_STEP),
    );
  };

  const closePositionPanel = () => {
    setPositionPanel(null);
    setPositionPanelMessage(null);
  };

  const toggleImportPanel = () => {
    if (positionPanel === 'import') {
      closePositionPanel();
      return;
    }

    setRotationExpanded(false);
    setPositionPanelMessage(null);
    setPositionPanel('import');
  };

  const toggleExportPanel = () => {
    if (positionPanel === 'export') {
      closePositionPanel();
      return;
    }

    setRotationExpanded(false);
    setPositionPanelMessage(null);
    setPositionExportJson(getPositionJson?.() ?? '');
    setPositionPanel('export');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setPositionPanelMessage({
          tone: 'error',
          text: 'The clipboard does not contain movement JSON.',
        });
        return;
      }

      setPositionPaste(clipboardText);
      setPositionPanelMessage({
        tone: 'info',
        text: 'JSON pasted. Review it, then apply the movement.',
      });
    } catch {
      setPositionPanelMessage({
        tone: 'error',
        text: 'Clipboard access was blocked. Paste the JSON into the field manually.',
      });
    }
  };

  const handleApplyPastedPosition = () => {
    const source = positionPaste.trim();
    if (!source) {
      setPositionPanelMessage({
        tone: 'error',
        text: 'Paste movement JSON before applying it.',
      });
      return;
    }

    if (!onImportPositionText) {
      return;
    }

    const errorMessage = onImportPositionText(source);
    setPositionPanelMessage(
      errorMessage
        ? { tone: 'error', text: errorMessage }
        : { tone: 'success', text: 'Movement imported successfully.' },
    );
  };

  const handleCopyPositionJson = async () => {
    if (!positionExportJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(positionExportJson);
      setPositionPanelMessage({
        tone: 'success',
        text: 'Movement JSON copied to the clipboard.',
      });
    } catch {
      setPositionPanelMessage({
        tone: 'error',
        text: 'Clipboard access was blocked. Select the JSON and copy it manually.',
      });
    }
  };

  return (
    <div
      className={`mapping-control-shell mapping-control-shell-${variant} ${
        rotationExpanded ? 'mapping-control-shell-rotation-open' : ''
      } ${positionPanel ? 'mapping-control-shell-position-open' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && positionPanel) {
          event.stopPropagation();
          closePositionPanel();
        }
      }}
    >
      {showFirstStep && !positionPanel ? (
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
            Import and export preserve this framing as JSON. Rotate gives you a −20° to +20°
            fine control; select its slider and use ← / → for 0.1° steps. Distort is reserved
            for a future update.
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

      {positionPanel ? (
        <section
          className={`mapping-position-panel mapping-position-panel-${positionPanel}`}
          role="dialog"
          aria-labelledby={`mapping-position-panel-${positionPanel}-title`}
        >
          <header className="mapping-position-panel-header">
            <div>
              <span className="mapping-position-panel-kicker">Movement JSON</span>
              <h2 id={`mapping-position-panel-${positionPanel}-title`}>
                {positionPanel === 'import'
                  ? 'Add saved movement'
                  : 'Save this movement'}
              </h2>
            </div>
            <button
              type="button"
              className="mapping-position-panel-close"
              aria-label={`Close movement ${positionPanel} panel`}
              onClick={closePositionPanel}
            >
              ×
            </button>
          </header>

          {positionPanel === 'import' ? (
            <>
              <p className="mapping-position-panel-copy">
                Load a Mapshroom <strong>.json</strong> position file, or paste JSON
                copied from the download panel. It changes only movement, size,
                precision, and rotation—your asset and shaders stay untouched.
              </p>
              <div className="mapping-position-panel-button-grid">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPositionPanelMessage(null);
                    onImportPosition?.();
                  }}
                  disabled={disabled || !onImportPosition}
                >
                  Choose JSON file
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handlePasteFromClipboard()}
                  disabled={disabled || !onImportPositionText}
                >
                  Paste clipboard
                </button>
              </div>
              <label className="mapping-position-text-field">
                <span>Paste movement JSON</span>
                <textarea
                  value={positionPaste}
                  rows={8}
                  spellCheck={false}
                  placeholder={'{\n  "format": "mapshroom-position",\n  "position": { ... }\n}'}
                  onChange={(event) => {
                    setPositionPaste(event.target.value);
                    setPositionPanelMessage(null);
                  }}
                  disabled={disabled || !onImportPositionText}
                />
              </label>
              <p className="mapping-position-panel-footnote">
                Accepted: Mapshroom position JSON, up to 128 KB.
              </p>
              <div className="mapping-position-panel-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleApplyPastedPosition}
                  disabled={
                    disabled ||
                    !onImportPositionText ||
                    positionPaste.trim().length === 0
                  }
                >
                  Apply movement
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mapping-position-panel-copy">
                This JSON stores the current movement, size, precision, and rotation.
                Copy it for another Mapshroom session or download it as a reusable file.
              </p>
              <label className="mapping-position-text-field">
                <span>Current movement JSON</span>
                <textarea
                  value={positionExportJson}
                  rows={10}
                  spellCheck={false}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <div className="mapping-position-panel-actions mapping-position-panel-actions-split">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCopyPositionJson()}
                  disabled={disabled || !positionExportJson}
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onExportPosition?.(positionExportJson)}
                  disabled={disabled || !onExportPosition || !positionExportJson}
                >
                  Download JSON
                </button>
              </div>
            </>
          )}

          {positionPanelMessage ? (
            <p
              className={`mapping-position-panel-message mapping-position-panel-message-${positionPanelMessage.tone}`}
              role={positionPanelMessage.tone === 'error' ? 'alert' : 'status'}
            >
              {positionPanelMessage.text}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mapping-tool-row" aria-label="Mapping position tools">
        <button
          type="button"
          className={`mapping-tool-button ${
            positionPanel === 'import' ? 'mapping-tool-button-active' : ''
          }`}
          title="Add or paste movement JSON"
          aria-label="Open movement import panel"
          aria-expanded={positionPanel === 'import'}
          onClick={toggleImportPanel}
          disabled={disabled || (!onImportPosition && !onImportPositionText)}
        >
          <AddPositionIcon />
        </button>
        <button
          type="button"
          className={`mapping-tool-button ${
            positionPanel === 'export' ? 'mapping-tool-button-active' : ''
          }`}
          title="Copy or download movement JSON"
          aria-label="Open movement download panel"
          aria-expanded={positionPanel === 'export'}
          onClick={toggleExportPanel}
          disabled={disabled || !onExportPosition || !getPositionJson}
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
          onClick={() => {
            closePositionPanel();
            setRotationExpanded((currentValue) => !currentValue);
          }}
          disabled={disabled || !onRotationChange}
        >
          <RotateIcon />
        </button>
        <button
          type="button"
          className={`mapping-tool-button ${
            showGrid ? 'mapping-tool-button-active' : ''
          }`}
          title={`${showGrid ? 'Hide' : 'Show'} grid on canvas and output`}
          aria-label={`${showGrid ? 'Hide' : 'Show'} alignment grid on canvas and output`}
          aria-pressed={showGrid}
          onClick={onToggleGrid}
          disabled={disabled || !onToggleGrid}
        >
          <GridIcon />
        </button>
      </div>

      {rotationExpanded ? (
        <div className="mapping-rotation-control">
          <label className="mapping-rotation-range">
            <span className="mapping-rotation-label-row">
              <span className="mapping-rotation-label">Rotate output</span>
              <span className="mapping-rotation-shortcut">
                ← / → 0.1°
              </span>
            </span>
            <input
              type="range"
              min={MIN_MAPPING_ROTATION}
              max={MAX_MAPPING_ROTATION}
              step={ROTATION_STEP}
              value={rotationDegrees}
              aria-label="Rotate output from minus 20 to plus 20 degrees"
              aria-valuetext={`${rotationDegrees.toFixed(1)} degrees`}
              aria-keyshortcuts="ArrowLeft ArrowRight"
              onChange={(event) =>
                onRotationChange?.(clampRotation(Number(event.target.value)))
              }
              onKeyDown={handleRotationKeyDown}
            />
          </label>
          <output>{rotationDegrees.toFixed(1)}°</output>
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
