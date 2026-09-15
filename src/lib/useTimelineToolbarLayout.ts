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
    let frame = 0;

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
      if (toolbar.dataset.stacked !== String(needsRow)) toolbar.dataset.stacked = String(needsRow);
    };

    update();
    // Updating the grid from inside a resize notification can resize an observed ancestor.
    // Apply the measurement on the next frame so all observers can finish first.
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    for (const element of [toolbar, stage, actions, transport]) {
      if (element) observer.observe(element);
    }
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [toolbarRef, stageRef]);
}
