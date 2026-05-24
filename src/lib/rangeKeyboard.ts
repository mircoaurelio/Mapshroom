import type { KeyboardEvent } from 'react';

export function handleVerticalRangeKey(
  event: KeyboardEvent<HTMLInputElement>,
  _onValueChange?: (value: number) => void,
) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }

  event.preventDefault();

  const scope = event.currentTarget.closest('[data-slider-key-scope="true"]');
  if (!scope) {
    return;
  }

  const visibleRanges = Array.from(
    scope.querySelectorAll<HTMLInputElement>('input[type="range"]:not(:disabled)'),
  ).filter((range) => range.getClientRects().length > 0);
  const currentIndex = visibleRanges.indexOf(event.currentTarget);
  if (currentIndex === -1 || visibleRanges.length <= 1) {
    return;
  }

  const direction = event.key === 'ArrowUp' ? -1 : 1;
  const nextIndex = (currentIndex + direction + visibleRanges.length) % visibleRanges.length;
  visibleRanges[nextIndex].focus({ preventScroll: true });
}
