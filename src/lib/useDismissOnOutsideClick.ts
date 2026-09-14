import { useEffect, type RefObject } from 'react';

/** Capture clicks even when workspace controls stop propagation. */
export function useDismissOnOutsideClick(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onDismiss: (() => void) | undefined,
) {
  useEffect(() => {
    if (!enabled || !onDismiss) return;

    const handleClick = (event: MouseEvent) => {
      const panel = panelRef.current;
      if (panel && !event.composedPath().includes(panel)) {
        onDismiss();
      }
    };

    // Use click so the opening gesture is already over and outside controls
    // keep their own click actions (including advancing the Assets guide).
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [enabled, onDismiss, panelRef]);
}
