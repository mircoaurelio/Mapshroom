import { useLayoutEffect, type RefObject } from 'react';

/** Follow the canvas as the workspace panels resize, without moving the timing controls. */
export function useTimelineToolbarLayout(
  toolbarRef: RefObject<HTMLDivElement | null>,
  stageRef?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    const stage = stageRef?.current;
    const transport = toolbar?.querySelector<HTMLElement>('.timeline-sequence-transport');
    const actions = toolbar?.querySelector<HTMLElement>('.timeline-sequence-toolbar-actions');
    if (!toolbar || !transport || !actions) return;

    const update = () => {
      const bounds = toolbar.getBoundingClientRect();
      const canvasBounds = stage?.getBoundingClientRect();
      const center = canvasBounds?.width
        ? canvasBounds.left + canvasBounds.width / 2 - bounds.left
        : bounds.width / 2;
      const halfPlayer = transport.getBoundingClientRect().width / 2;
      toolbar.style.setProperty('--timeline-transport-center', `${center}px`);
      toolbar.style.setProperty('--timeline-copy-max-width', `${Math.max(0, center - halfPlayer - 12)}px`);
      // Keep the player on the canvas axis; put the whole settings group on a second row if needed.
      const needsRow = bounds.width - actions.getBoundingClientRect().width < center + halfPlayer + 8;
      toolbar.dataset.stacked = String(needsRow);
    };

    update();
    const observer = new ResizeObserver(update);
    for (const element of [toolbar, stage, actions, transport]) {
      if (element) observer.observe(element);
    }
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [toolbarRef, stageRef]);
}
