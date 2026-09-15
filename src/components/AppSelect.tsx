import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AppSelect.css';

interface Option<T extends string | number> { value: T; label: string }
interface Props<T extends string | number> {
  label: string;
  className?: string;
  value: T;
  options: readonly Option<T>[];
  disabled?: boolean;
  openOnHover?: boolean;
  onChange: (value: T) => void;
}

/** The app's dark menu treatment, with keyboard selection and no operating-system popup. */
export function AppSelect<T extends string | number>({ label, className, value, options, disabled, openOnHover = false, onChange }: Props<T>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', at: 0 });
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 200, maxHeight: 280 });
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

  const dismiss = () => {
    clearTimeout(closeTimer.current);
    pinned.current = false;
    setOpen(false);
  };
  const closeOnLeave = () => {
    if (!openOnHover) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { if (!pinned.current) dismiss(); }, 180);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const show = (pin = true) => {
    clearTimeout(closeTimer.current);
    if (disabled || !options.length || !trigger.current) return;
    if (pin) pinned.current = true;
    if (open) return;
    const bounds = trigger.current.getBoundingClientRect();
    const width = Math.min(Math.max(200, bounds.width), window.innerWidth - 16);
    const below = window.innerHeight - bounds.bottom - 12, above = bounds.top - 12;
    const height = Math.min(280, options.length * 38 + 10);
    const upwards = below < height && above > below;
    const maxHeight = Math.max(40, Math.min(height, upwards ? above : below));
    setPosition({ width, maxHeight, left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)), top: upwards ? bounds.top - maxHeight - 4 : bounds.bottom + 4 });
    setActive(selected); setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (supportsPopover) menu.current?.showPopover();
  }, [open, supportsPopover]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) dismiss();
    };
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) dismiss(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useLayoutEffect(() => {
    const option = menu.current?.children[active] as HTMLElement | undefined;
    if (!option || !menu.current) return;
    // Scroll only the menu: scrollIntoView would also move the editor underneath it.
    if (option.offsetTop < menu.current.scrollTop) menu.current.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > menu.current.scrollTop + menu.current.clientHeight) {
      menu.current.scrollTop = option.offsetTop + option.offsetHeight - menu.current.clientHeight;
    }
  }, [active, open]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    dismiss();
    if (option.value !== value) onChange(option.value);
    trigger.current?.focus({ preventScroll: true });
  };
  const popup = open && !disabled ? <div ref={menu} id={`${id}-menu`} role="listbox" aria-labelledby={`${id}-label`}
    popover={supportsPopover ? 'manual' : undefined} className="app-select-menu" style={position}
    onPointerEnter={() => clearTimeout(closeTimer.current)} onPointerLeave={closeOnLeave}>
    {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value}
      className={`app-select-option${active === index ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
      onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
      <span>{option.label}</span><span aria-hidden="true">{option.value === value ? '✓' : ''}</span>
    </div>)}
  </div> : null;

  return <div className={className ? `app-select ${className}` : 'app-select'}
    onPointerEnter={event => { if (openOnHover && event.pointerType === 'mouse') show(false); }}
    onPointerLeave={closeOnLeave}>
    <span id={`${id}-label`} className="app-select-label">{label}</span>
    <button ref={trigger} type="button" role="combobox" className="app-select-trigger" disabled={disabled}
      aria-labelledby={`${id}-label`} aria-haspopup="listbox" aria-expanded={open && !disabled}
      aria-controls={open ? `${id}-menu` : undefined} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      onClick={() => open && pinned.current ? dismiss() : show()}
      onBlur={event => { if (!menu.current?.contains(event.relatedTarget as Node)) dismiss(); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); dismiss(); return; }
        if (event.key === 'Tab') { dismiss(); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); event.stopPropagation();
          pinned.current = true;
          if (!open) show();
          else setActive(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); event.stopPropagation();
          if (open) choose(active); else show();
        } else if (open && (event.key === 'Home' || event.key === 'End')) {
          event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = performance.now();
          search.current = { text: (now - search.current.at < 600 ? search.current.text : '') + event.key.toLowerCase(), at: now };
          const found = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text));
          if (!open) show();
          if (found >= 0) setActive(found);
        }
      }}><span>{options[selected]?.label ?? 'Choose an option'}</span>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {supportsPopover ? popup : popup && createPortal(popup, document.body)}
  </div>;
}
