import { useRef, type PointerEvent } from 'react';
import type { StageDistortion, StageTransform } from '../types';
import { normalizeStageDistortion, nudgeStageDistortionPoint, STAGE_DISTORTION_CORNERS, type StageDistortionCorner } from '../lib/distortion';
import { projectionDistortionDelta, type ProjectionSize } from '../lib/projectionFraming';

const CORNERS = {
  topLeft: { label: 'top left', x: 0, y: 0 },
  topRight: { label: 'top right', x: 100, y: 0 },
  bottomRight: { label: 'bottom right', x: 100, y: 100 },
  bottomLeft: { label: 'bottom left', x: 0, y: 100 },
};
const DIRECTIONS = [
  { name: 'up', key: 'ArrowUp', symbol: '↑', x: 0, y: -1 },
  { name: 'left', key: 'ArrowLeft', symbol: '←', x: -1, y: 0 },
  { name: 'right', key: 'ArrowRight', symbol: '→', x: 1, y: 0 },
  { name: 'down', key: 'ArrowDown', symbol: '↓', x: 0, y: 1 },
];

interface ProjectionCornerControlsProps {
  transform: StageTransform;
  viewport: ProjectionSize;
  aspectRatio: number;
  previewScale: number;
  onChange: (distortion: StageDistortion) => void;
}

/** This overlay belongs to the output frame, outside the transformed renderer. */
export function ProjectionCornerControls({ transform, viewport, aspectRatio, previewScale, onChange }: ProjectionCornerControlsProps) {
  const drag = useRef<{
    pointerId: number; corner: StageDistortionCorner; x: number; y: number;
    transform: StageTransform; viewport: ProjectionSize; aspectRatio: number; previewScale: number;
  } | null>(null);

  const nudge = (corner: StageDistortionCorner, x: number, y: number) => {
    const step = Math.max(1, transform.precision);
    const delta = projectionDistortionDelta(transform, viewport, aspectRatio, { x: x * step, y: y * step });
    onChange(nudgeStageDistortionPoint(normalizeStageDistortion(transform.distortion), corner, delta.x, delta.y));
  };
  const stopDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div className="projection-corner-overlay" aria-label="Fixed distortion controls">
    {STAGE_DISTORTION_CORNERS.map((corner) => {
      const position = CORNERS[corner];
      return <div key={corner} className={`stage-distort-corner-controls stage-distort-corner-controls-${corner}`}
        style={{ left: `${position.x}%`, top: `${position.y}%` }} role="group" aria-label={`${position.label} corner precision controls`}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const direction = DIRECTIONS.find((item) => item.key === event.key);
          if (!direction) return;
          event.preventDefault(); event.stopPropagation();
          nudge(corner, direction.x, direction.y);
        }}>
        {DIRECTIONS.map((direction) => <button key={direction.name} type="button"
          className={`stage-distort-nudge stage-distort-nudge-${direction.name}`}
          aria-label={`Move ${position.label} corner ${direction.name}`} title={`Move ${position.label} corner ${direction.name}`}
          onClick={(event) => { event.stopPropagation(); nudge(corner, direction.x, direction.y); }}>{direction.symbol}</button>)}
        <button type="button" className="projection-corner-drag" data-distort-corner={corner}
          aria-label={`Drag ${position.label} distortion corner`} title={`Drag to adjust the ${position.label} corner`}
          aria-keyshortcuts="ArrowUp ArrowLeft ArrowRight ArrowDown"
          onPointerDown={(event) => {
            if (drag.current || event.button !== 0 || previewScale <= 0) return;
            event.preventDefault(); event.stopPropagation();
            drag.current = { pointerId: event.pointerId, corner, x: event.clientX, y: event.clientY, transform, viewport, aspectRatio, previewScale };
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const gesture = drag.current;
            if (!gesture || gesture.pointerId !== event.pointerId) return;
            const delta = projectionDistortionDelta(gesture.transform, gesture.viewport, gesture.aspectRatio, {
              x: (event.clientX - gesture.x) / gesture.previewScale,
              y: (event.clientY - gesture.y) / gesture.previewScale,
            });
            onChange(nudgeStageDistortionPoint(normalizeStageDistortion(gesture.transform.distortion), gesture.corner, delta.x, delta.y));
          }}
          onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { drag.current = null; }}><span aria-hidden="true" /></button>
      </div>;
    })}
  </div>;
}
