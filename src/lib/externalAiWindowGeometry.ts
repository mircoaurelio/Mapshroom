interface ChatBounds { left: number; top: number; height: number }
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

export function getExternalAiPopupBounds(chat: ChatBounds, host: WindowBounds): ExternalAiPopupBounds | null {
  const gap = 8;
  const viewportLeft = host.screenX + Math.max(0, (host.outerWidth - host.innerWidth) / 2);
  const viewportTop = host.screenY + Math.max(0, host.outerHeight - host.innerHeight);
  const left = Math.max(viewportLeft + gap, host.availableLeft + gap);
  const right = Math.min(viewportLeft + chat.left - gap, host.availableLeft + host.availableWidth - gap);
  const top = Math.max(viewportTop + chat.top, host.availableTop + gap);
  const bottom = Math.min(viewportTop + Math.min(chat.top + chat.height, host.innerHeight), host.availableTop + host.availableHeight - gap);
  const width = Math.floor(right - left);
  const height = Math.floor(bottom - top);
  if (width < 320 || height < 240) return null;
  return { left: Math.round(left), top: Math.round(top), width, height };
}
