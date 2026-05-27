export function bindHorizontalWheelScroll(element: HTMLElement): () => void {
  const handleWheel = (event: WheelEvent) => {
    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (delta === 0) {
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, element.scrollLeft + delta));

    if (nextScrollLeft === element.scrollLeft) {
      return;
    }

    element.scrollLeft = nextScrollLeft;
    event.preventDefault();
  };

  element.addEventListener('wheel', handleWheel, { passive: false });
  return () => element.removeEventListener('wheel', handleWheel);
}
