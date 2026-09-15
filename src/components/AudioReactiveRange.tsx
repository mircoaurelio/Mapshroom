import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { audioRangeBoundAtValue, clampAudioRangeBound, type AudioRangeBound } from '../lib/audioRange';
import { rangeValueAtPosition } from '../lib/rangeHover';

interface AudioReactiveRangeProps {
  name: string;
  min: number;
  max: number;
  step: number;
  lower: number;
  upper: number;
  liveValue: number;
  onBoundChange: (bound: AudioRangeBound, value: number) => void;
  onHoverValueChange?: (value: number | null) => void;
}

export function AudioReactiveRange({
  name, min, max, step, lower, upper, liveValue, onBoundChange, onHoverValueChange,
}: AudioReactiveRangeProps) {
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    pointerId: number; bound: AudioRangeBound | null; offset: number; startX: number;
  } | null>(null);
  const span = max - min || 1;
  // Match the 8px native endpoint thumbs, including their inset at both ends.
  const position = (value: number) => {
    const ratio = Math.max(0, Math.min(1, (value - min) / span));
    return `calc(${ratio * 100}% + ${4 - ratio * 8}px)`;
  };
  const updateBound = (bound: AudioRangeBound, value: number) => {
    const nextValue = clampAudioRangeBound(bound, value, lower, upper, min, max);
    if (nextValue !== (bound === 'min' ? lower : upper)) onBoundChange(bound, nextValue);
  };
  const pointerValue = (event: PointerEvent<HTMLDivElement>, offset = 0) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return rangeValueAtPosition(event.clientX - rect.left - offset, rect.width, min, max, step);
  };
  const clearHover = (element: HTMLDivElement) => {
    element.style.removeProperty('--audio-range-hover-position');
    element.style.removeProperty('--audio-range-hover-opacity');
    onHoverValueChange?.(null);
  };
  const updateHover = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--audio-range-hover-position',
      `${Math.max(1, Math.min(rect.width - 1, event.clientX - rect.left))}px`);
    event.currentTarget.style.setProperty('--audio-range-hover-opacity', '0.65');
    onHoverValueChange?.(pointerValue(event));
  };
  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearHover(event.currentTarget);
  };
  const moveBound = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.bound) {
      // When grabbing coincident thumbs, the first movement chooses the side.
      if (Math.abs(event.clientX - drag.startX) < 1) return;
      drag.bound = event.clientX < drag.startX ? 'min' : 'max';
      event.currentTarget.dataset.dragging = drag.bound;
      (drag.bound === 'min' ? minRef : maxRef).current?.focus({ preventScroll: true });
    }
    updateBound(drag.bound, pointerValue(event, drag.offset));
  };
  const handleKey = (event: KeyboardEvent<HTMLInputElement>, bound: AudioRangeBound) => {
    const current = bound === 'min' ? lower : upper;
    const page = Math.max(step, Math.round((max - min) / step / 10) * step);
    const values: Record<string, number> = {
      ArrowLeft: current - step, ArrowDown: current - step,
      ArrowRight: current + step, ArrowUp: current + step,
      PageDown: current - page, PageUp: current + page,
      Home: min, End: max,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    if (event.currentTarget.parentElement) clearHover(event.currentTarget.parentElement as HTMLDivElement);
    // Snap keyboard edits to the same grid as pointer edits before clamping.
    const value = min + Math.round((values[event.key] - min) / step) * step;
    updateBound(bound, Number(value.toFixed(12)));
  };

  return (
    <div
      className="audio-uniform-range-stack audio-uniform-range-interactive"
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || dragRef.current) return;
        event.preventDefault();
        const value = pointerValue(event);
        const targetBound = event.target === minRef.current ? 'min'
          : event.target === maxRef.current ? 'max' : null;
        // Coincident thumbs must be separable in either direction.
        const bound = lower === upper && targetBound ? null
          : targetBound ?? audioRangeBoundAtValue(value, lower, upper);
        const rect = event.currentTarget.getBoundingClientRect();
        const thumbX = 4 + ((bound === 'min' ? lower : upper) - min) / span * (rect.width - 8);
        const offset = targetBound ? event.clientX - rect.left - thumbX : 0;
        dragRef.current = { pointerId: event.pointerId, bound, offset, startX: event.clientX };
        event.currentTarget.dataset.dragging = bound ?? 'pending';
        (bound === 'min' ? minRef : maxRef).current?.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        if (!targetBound && bound) updateBound(bound, value);
      }}
      onPointerEnter={updateHover}
      onPointerMove={(event) => {
        updateHover(event);
        moveBound(event);
      }}
      onPointerUp={(event) => {
        moveBound(event);
        finishDrag(event);
      }}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onPointerLeave={(event) => clearHover(event.currentTarget)}
    >
      <span className="audio-uniform-active-zone" aria-hidden="true"
        style={{ left: position(lower), right: `calc(100% - ${position(upper)})` }} />
      <span className="audio-uniform-live-marker" role="meter"
        aria-label={`Live audio value for ${name}`} aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={liveValue} style={{ left: position(liveValue) }} />
      {(['min', 'max'] as const).map((bound) => (
        <input key={bound} ref={bound === 'min' ? minRef : maxRef} type="range"
          className={`audio-uniform-bound-range audio-uniform-bound-range-${bound}`}
          aria-label={`Audio ${bound === 'min' ? 'minimum' : 'maximum'} for ${name}`}
          aria-valuemin={bound === 'min' ? min : lower}
          aria-valuemax={bound === 'min' ? upper : max}
          min={min} max={max} step={step} value={bound === 'min' ? lower : upper}
          onKeyDown={(event) => handleKey(event, bound)}
          onChange={(event) => updateBound(bound, Number(event.currentTarget.value))}
        />
      ))}
    </div>
  );
}
