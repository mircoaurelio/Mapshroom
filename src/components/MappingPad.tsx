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
  precision?: number;
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

export function MappingPad({
  onAction,
  onPrecisionChange,
  precision = 12,
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
                  -
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
  );
}
