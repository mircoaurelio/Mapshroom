export type ExternalAiWindowResult = 'popup' | 'tab' | 'blocked';

const DESKTOP_MIN_SCREEN_WIDTH = 900;
const POPUP_MAX_WIDTH = 720;
const POPUP_MAX_HEIGHT = 820;
const POPUP_MARGIN = 24;
const AI_POPUP_NAME = 'mapshroom-ai-chat';

function detachOpener(openedWindow: Window): void {
  try {
    openedWindow.opener = null;
  } catch {
    // Cross-window hardening is best-effort on older browsers.
  }
}

function openRegularTab(url: string): ExternalAiWindowResult {
  const openedTab = window.open(url, '_blank');
  if (!openedTab) {
    return 'blocked';
  }

  detachOpener(openedTab);
  return 'tab';
}

export function openExternalAiWindow(url: string): ExternalAiWindowResult {
  const hasDesktopPointer = window.matchMedia('(pointer: fine)').matches;
  const availableWidth = window.screen.availWidth;
  const availableHeight = window.screen.availHeight;

  if (!hasDesktopPointer || availableWidth < DESKTOP_MIN_SCREEN_WIDTH) {
    return openRegularTab(url);
  }

  const width = Math.min(POPUP_MAX_WIDTH, Math.max(520, availableWidth - POPUP_MARGIN * 2));
  const height = Math.min(POPUP_MAX_HEIGHT, Math.max(600, availableHeight - POPUP_MARGIN * 2));
  const availableLeft = window.screen.availLeft ?? window.screenX;
  const availableTop = window.screen.availTop ?? window.screenY;
  const desiredLeft = window.screenX + window.outerWidth - width - POPUP_MARGIN;
  const desiredTop = window.screenY + Math.round((window.outerHeight - height) / 2);
  const left = Math.min(
    Math.max(desiredLeft, availableLeft),
    availableLeft + availableWidth - width,
  );
  const top = Math.min(
    Math.max(desiredTop, availableTop),
    availableTop + availableHeight - height,
  );
  const features = [
    'popup=yes',
    `width=${Math.round(width)}`,
    `height=${Math.round(height)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
  const popup = window.open(url, AI_POPUP_NAME, features);

  if (!popup) {
    return openRegularTab(url);
  }

  detachOpener(popup);
  popup.focus();
  return 'popup';
}
