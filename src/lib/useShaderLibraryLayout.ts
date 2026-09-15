import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { DEFAULT_LIBRARY_WIDTHS, LIBRARY_PANE_MIN, SHADER_LIBRARY_LAYOUT_KEY, libraryPaneMaximum, readLibraryWidths, resolveLibraryWidths, type ShaderLibraryPane, type ShaderLibraryWidths } from './shaderLibraryLayout';

export function useShaderLibraryLayout(chatOpen: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const [preferred, setPreferred] = useState(() => {
    try { return readLibraryWidths(localStorage.getItem(SHADER_LIBRARY_LAYOUT_KEY)); }
    catch { return { ...DEFAULT_LIBRARY_WIDTHS }; }
  });
  const preferredRef = useRef(preferred);
  const [frame, setFrame] = useState(() => ({ width: window.innerWidth - 56, directory: window.innerWidth > 1100, chat: window.innerWidth > 700 }));
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ pane: ShaderLibraryPane; pointerId: number; x: number; widths: ShaderLibraryWidths; cursor: string; userSelect: string } | null>(null);
  const widths = resolveLibraryWidths(preferred, frame.width, frame.directory, chatOpen && frame.chat);

  useEffect(() => {
    const measure = () => {
      const width = containerRef.current?.getBoundingClientRect().width ?? 0;
      setFrame({ width, directory: window.innerWidth > 1100, chat: window.innerWidth > 700 });
    };
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      if (drag.current) {
        document.body.style.cursor = drag.current.cursor;
        document.body.style.userSelect = drag.current.userSelect;
      }
    };
  }, []);

  const persist = () => {
    try { localStorage.setItem(SHADER_LIBRARY_LAYOUT_KEY, JSON.stringify(preferredRef.current)); }
    catch { /* Resizing remains available when browser storage is unavailable. */ }
  };
  const change = (pane: ShaderLibraryPane, value: number, startingWidths = widths) => {
    const maximum = libraryPaneMaximum(pane, startingWidths, frame.width);
    const next = {
      ...preferredRef.current,
      ...(startingWidths.directory ? { directory: startingWidths.directory } : {}),
      ...(startingWidths.chat ? { chat: startingWidths.chat } : {}),
      [pane]: Math.round(Math.max(LIBRARY_PANE_MIN[pane], Math.min(maximum, value))),
    };
    preferredRef.current = next;
    setPreferred(next);
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    document.body.style.cursor = drag.current.cursor;
    document.body.style.userSelect = drag.current.userSelect;
    drag.current = null;
    setResizing(false);
    persist();
  };
  const separatorProps = (pane: ShaderLibraryPane) => ({
    role: 'separator',
    tabIndex: 0,
    'aria-label': pane === 'directory' ? 'Resize Library folders' : 'Resize Shader assistant',
    'aria-orientation': 'vertical' as const,
    'aria-valuemin': LIBRARY_PANE_MIN[pane],
    'aria-valuemax': libraryPaneMaximum(pane, widths, frame.width),
    'aria-valuenow': widths[pane],
    title: 'Drag to resize. Double-click to reset.',
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pane, pointerId: event.pointerId, x: event.clientX, widths, cursor: document.body.style.cursor, userSelect: document.body.style.userSelect };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      setResizing(true);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const delta = (event.clientX - current.x) * (pane === 'directory' ? 1 : -1);
      change(pane, current.widths[pane] + delta, current.widths);
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onDoubleClick: () => { change(pane, DEFAULT_LIBRARY_WIDTHS[pane]); persist(); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const delta = (event.key === 'ArrowRight' ? 1 : -1) * (pane === 'directory' ? 1 : -1) * (event.shiftKey ? 40 : 10);
      change(pane, event.key === 'Home' ? LIBRARY_PANE_MIN[pane] : event.key === 'End' ? libraryPaneMaximum(pane, widths, frame.width) : widths[pane] + delta);
      persist();
    },
  });
  const style = { '--shader-library-directory-width': `${widths.directory}px`, '--shader-library-chat-width': `${widths.chat}px` } as CSSProperties;
  return { containerRef, style, resizing, separatorProps };
}
