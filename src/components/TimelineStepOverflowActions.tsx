import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface StepAction {
  label: string;
  accessibleLabel: string;
  icon: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: (trigger: HTMLButtonElement) => void;
}

/** Keep the same actions in the full toolbar and its compact overflow menu. */
export function TimelineStepOverflowActions({ shaderName, actions }: {
  shaderName: string;
  actions: StepAction[];
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLastRef = useRef(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const close = (restoreFocus = false) => {
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const show = (focusLast = false) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const bounds = trigger.getBoundingClientRect();
    const height = actions.length * 36 + 10;
    const below = window.innerHeight - bounds.bottom;
    focusLastRef.current = focusLast;
    setPosition({
      left: Math.max(8, Math.min(bounds.right - 180, window.innerWidth - 188)),
      top: below < height + 12 && bounds.top > below
        ? Math.max(8, bounds.top - height - 4)
        : bounds.bottom + 4,
    });
  };

  useLayoutEffect(() => {
    if (!position) return;
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const target = focusLastRef.current ? buttons?.[buttons.length - 1] : buttons?.[0];
    target?.focus({ preventScroll: true });
  }, [position]);

  useEffect(() => {
    if (!position) return;
    const anchor = triggerRef.current?.getBoundingClientRect();
    const dismiss = () => setPosition(null);
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) dismiss();
    };
    const scroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      const current = triggerRef.current?.getBoundingClientRect();
      if (!anchor || !current || Math.abs(current.top - anchor.top) > .5 || Math.abs(current.left - anchor.left) > .5) dismiss();
    };
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [position]);

  return <>
    {actions.map((action) => <button key={action.label} type="button"
      className={`icon-button timeline-step-action-button timeline-step-action-secondary${action.danger ? ' timeline-step-action-button-danger' : ''}`}
      aria-label={action.accessibleLabel} title={action.label} disabled={action.disabled}
      onClick={(event) => { event.stopPropagation(); action.onSelect(event.currentTarget); }}>
      {action.icon}
    </button>)}
    <button ref={triggerRef} type="button"
      className="icon-button timeline-step-action-button timeline-step-overflow-trigger"
      aria-label={`More actions for ${shaderName}`} title="More actions"
      aria-haspopup="menu" aria-expanded={position !== null} aria-controls={position ? menuId : undefined}
      onClick={(event) => { event.stopPropagation(); if (position) close(); else show(); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); event.stopPropagation(); show(event.key === 'ArrowUp');
        }
      }}>
      <svg viewBox="0 0 16 16" aria-hidden="true" className="timeline-step-more-icon">
        <circle cx="3" cy="8" r="1.25" /><circle cx="8" cy="8" r="1.25" /><circle cx="13" cy="8" r="1.25" />
      </svg>
    </button>
    {position && createPortal(<div ref={menuRef} id={menuId} role="menu"
      aria-label={`More actions for ${shaderName}`} className="timeline-step-overflow-menu" style={position}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); close(true); return;
        }
        if (event.key === 'Tab') { close(true); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[index]?.focus();
      }}>
      {actions.map((action) => <button key={action.label} type="button" role="menuitem"
        className={action.danger ? 'timeline-step-menu-danger' : undefined}
        aria-label={action.accessibleLabel} disabled={action.disabled}
        onClick={(event) => { close(true); action.onSelect(event.currentTarget); }}>
        {action.icon}<span>{action.label}</span>
      </button>)}
    </div>, document.body)}
  </>;
}
