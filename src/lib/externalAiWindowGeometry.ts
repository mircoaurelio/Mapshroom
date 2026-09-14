interface CanvasBounds { left: number; top: number; width: number; height: number }
interface WindowBounds {
  screenX: number;
  screenY: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  availableLeft: number;
  availableTop: number;
  availableWidth: number;
  availableHeight: number;
}

export interface ExternalAiPopupBounds { left: number; top: number; width: number; height: number }

export function getExternalAiPopupBounds(canvas: CanvasBounds, host: WindowBounds): ExternalAiPopupBounds | null {
  const gap = 8;
  // DOM rectangles follow page zoom; outer window coordinates use screen units.
  // A small width difference is the native window frame, not page zoom.
  const frameWidth = host.outerWidth - host.innerWidth;
  const unzoomed = Math.abs(frameWidth) <= 24;
  const scale = unzoomed || host.innerWidth <= 0 ? 1 : host.outerWidth / host.innerWidth;
  const viewportLeft = host.screenX + (unzoomed ? Math.max(0, frameWidth / 2) : 0);
  const viewportTop = host.screenY + Math.max(0, host.outerHeight - host.innerHeight * scale);
  const left = Math.max(viewportLeft + canvas.left * scale, host.availableLeft + gap);
  const right = Math.min(viewportLeft + (canvas.left + canvas.width) * scale, host.availableLeft + host.availableWidth - gap);
  const top = Math.max(viewportTop + canvas.top * scale, host.availableTop + gap);
  const bottom = Math.min(viewportTop + Math.min(canvas.top + canvas.height, host.innerHeight) * scale, host.availableTop + host.availableHeight - gap);
  const width = Math.floor(right - left);
  const height = Math.floor(bottom - top);
  if (width < 320 || height < 240) return null;
  return { left: Math.round(left), top: Math.round(top), width, height };
}
