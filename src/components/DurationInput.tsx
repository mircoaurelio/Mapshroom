import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { accumulateDurationMotion, clampDurationInput, parseDurationInput } from '../lib/durationInput';
import './DurationInput.css';

interface DurationInputProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  className?: string;
  onCommit: (value: number) => void;
}

export function DurationInput({ label, description, value, min, max, className = '', onCommit }: DurationInputProps) {
  const inputId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<{ pointerId: number; y: number; remainder: number } | null>(null);
  const scrollMotion = useRef({ remainder: 0, at: 0 });
  const currentValue = useRef(value);
  const cancelBlurRef = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState<'hover' | 'pinned' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

  useLayoutEffect(() => { currentValue.current = value; }, [value]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const apply = (text: string) => {
    const parsed = parseDurationInput(text);
    setDraft(null);
    if (parsed === null) return;
    const next = clampDurationInput(parsed, min, max);
    currentValue.current = next;
    if (next !== value) onCommit(next);
  };
  const adjust = useCallback((seconds: number) => {
    const before = currentValue.current;
    const next = clampDurationInput(before + seconds, min, max);
    currentValue.current = next;
    setDraft(null);
    if (next !== before) onCommit(next);
    return next === min || next === max;
  }, [min, max, onCommit]);

  const show = (mode: 'hover' | 'pinned') => {
    clearTimeout(closeTimer.current);
    if (!trigger.current) return;
    const bounds = trigger.current.getBoundingClientRect();
    const height = 184;
    setPosition({
      left: Math.max(8, Math.min(bounds.right - 148, window.innerWidth - 156)),
      top: bounds.top >= height + 8 ? bounds.top - height - 6 : Math.min(bounds.bottom + 6, window.innerHeight - height - 8),
    });
    setOpen(current => current === 'pinned' ? current : mode);
  };
  const closeOnLeave = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!drag.current) setOpen(current => current === 'hover' ? null : current);
    }, 180);
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    drag.current = null;
    setDragging(false);
    setOpen(null);
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (supportsPopover && !popup.current?.matches(':popover-open')) popup.current?.showPopover();
    if (open === 'pinned') wheel.current?.focus({ preventScroll: true });
  }, [open, supportsPopover]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) close();
    };
    const dismissOnScroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Let an active text field handle its own draft cancellation.
      if (document.activeElement?.id === inputId) return;
      event.preventDefault();
      event.stopPropagation();
      const returnFocus = popup.current?.contains(document.activeElement);
      close();
      if (returnFocus) trigger.current?.focus({ preventScroll: true });
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', dismissOnScroll, true);
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', dismissOnScroll, true);
      window.removeEventListener('keydown', escape, true);
    };
  }, [open, inputId]);

  useEffect(() => {
    const element = wheel.current;
    if (!open || !element) return;
    const scroll = (event: WheelEvent) => {
      if (event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      const previous = now - scrollMotion.current.at < 180 ? scrollMotion.current.remainder : 0;
      // One mouse notch is one second; small trackpad deltas accumulate to a notch.
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const motion = accumulateDurationMotion(previous, Math.max(-40, Math.min(40, -pixels)), 40);
      scrollMotion.current = { remainder: motion.remainder, at: now };
      if (motion.steps && adjust(motion.steps)) scrollMotion.current.remainder = 0;
    };
    element.addEventListener('wheel', scroll, { passive: false });
    return () => element.removeEventListener('wheel', scroll);
  }, [open, adjust]);

  const panel = open ? (
    <div ref={popup} id={`${inputId}-wheel`} className="duration-wheel-popup"
      popover={supportsPopover ? 'manual' : undefined} style={position}
      onPointerEnter={() => clearTimeout(closeTimer.current)} onPointerLeave={closeOnLeave}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== trigger.current) close();
      }}>
      <div className="duration-wheel-heading">{label}<span>seconds</span></div>
      <div ref={wheel} role="slider" tabIndex={0} className={`duration-wheel${dragging ? ' is-dragging' : ''}`}
        aria-label={`Adjust ${label}`} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={value} aria-valuetext={`${value} seconds`} aria-describedby={`${inputId}-wheel-help`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, y: event.clientY, remainder: 0 };
          setOpen('pinned');
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active || active.pointerId !== event.pointerId) return;
          const motion = accumulateDurationMotion(active.remainder, active.y - event.clientY, 24);
          active.y = event.clientY;
          active.remainder = motion.remainder;
          if (motion.steps && adjust(motion.steps)) active.remainder = 0;
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          drag.current = null;
          setDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); event.stopPropagation();
            adjust(event.key === 'ArrowUp' ? 1 : -1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); event.stopPropagation();
            adjust((event.key === 'Home' ? min : max) - currentValue.current);
          } else if (event.key === 'Enter') {
            event.preventDefault(); event.stopPropagation();
            close(); trigger.current?.focus({ preventScroll: true });
          }
        }}>
        <svg className="duration-wheel-arrow" viewBox="0 0 16 8" aria-hidden="true"><path d="m4 6 4-4 4 4" /></svg>
        <span className="duration-wheel-neighbor" aria-hidden="true">{value < max ? clampDurationInput(value + 1, min, max) : '—'}</span>
        <span className="duration-wheel-current" aria-hidden="true"><i />{value}<small>s</small></span>
        <span className="duration-wheel-neighbor" aria-hidden="true">{value > min ? clampDurationInput(value - 1, min, max) : '—'}</span>
        <svg className="duration-wheel-arrow" viewBox="0 0 16 8" aria-hidden="true"><path d="m4 2 4 4 4-4" /></svg>
      </div>
      <span id={`${inputId}-wheel-help`} className="duration-wheel-hint">Drag or scroll · 1 s</span>
    </div>
  ) : null;

  return (
    <div className={`duration-input ${className}`} role="group" aria-label={label}>
      <label htmlFor={inputId} title={description}>{label}</label>
      <input id={inputId} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
        aria-label={`${label} in seconds`} aria-describedby={`${inputId}-help`}
        value={draft ?? String(value)}
        onFocus={(event) => { setDraft(String(value)); event.currentTarget.select(); }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (cancelBlurRef.current) { cancelBlurRef.current = false; return; }
          apply(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault(); event.stopPropagation(); event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation();
            cancelBlurRef.current = true; setDraft(null); event.currentTarget.blur(); close();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); event.stopPropagation();
            const current = parseDurationInput(event.currentTarget.value) ?? value;
            setDraft(String(clampDurationInput(current + (event.key === 'ArrowUp' ? 1 : -1), min, max)));
          }
        }} />
      <span className="duration-input-unit" aria-hidden="true">s</span>
      <button ref={trigger} type="button" className="duration-input-trigger" aria-label={`Adjust ${label}`}
        aria-expanded={Boolean(open)} aria-controls={open ? `${inputId}-wheel` : undefined}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') show('hover'); }}
        onPointerLeave={closeOnLeave}
        onClick={() => open === 'pinned' ? close() : show('pinned')}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); event.stopPropagation(); show('pinned');
          }
        }}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M5 3v4m0 4v6M10 3v8m0 4v2M15 3v2m0 4v8M3 7h4v4H3zM8 11h4v4H8zM13 5h4v4h-4z" />
        </svg>
      </button>
      <span id={`${inputId}-help`} className="duration-input-help">
        {description} Enter or leave the field to apply. Escape to cancel. Arrow keys adjust by one second. Range {min} to {max} seconds.
      </span>
      {supportsPopover ? panel : panel && createPortal(panel, document.body)}
    </div>
  );
}
