export type ExternalAiWindowResult = 'popup' | 'tab' | 'blocked';

const DESKTOP_MIN_SCREEN_WIDTH = 1280;
const POPUP_MIN_WIDTH = 640;
const POPUP_MAX_WIDTH = 1600;
const POPUP_WIDTH_RATIO = 7 / 12;
const POPUP_MIN_HEIGHT = 600;
const POPUP_MAX_HEIGHT = 820;
const POPUP_HEIGHT_RATIO = 0.76;
const POPUP_MARGIN = 16;
const AI_POPUP_NAME = 'mapshroom-ai-chat';
let activeExternalAiWindow: Window | null = null;
let activePopupGeometry: { width: number; left: number } | null = null;

function resolvePopupWidth(hostWindowWidth: number, availableWidth: number): number {
  const usableHostWidth = Math.max(320, hostWindowWidth - POPUP_MARGIN * 2);
  const usableScreenWidth = Math.max(320, availableWidth - POPUP_MARGIN * 2);

  return Math.min(
    POPUP_MAX_WIDTH,
    usableScreenWidth,
    Math.max(POPUP_MIN_WIDTH, Math.round(usableHostWidth * POPUP_WIDTH_RATIO)),
  );
}

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
  activeExternalAiWindow = openedTab;
  activePopupGeometry = null;
  return 'tab';
}

export function focusExternalAiWindow(): boolean {
  try {
    if (!activeExternalAiWindow || activeExternalAiWindow.closed) {
      activeExternalAiWindow = null;
      activePopupGeometry = null;
      return false;
    }

    activeExternalAiWindow.focus();
    return true;
  } catch {
    activeExternalAiWindow = null;
    activePopupGeometry = null;
    return false;
  }
}

export function closeExternalAiWindow(): void {
  try {
    if (activeExternalAiWindow && !activeExternalAiWindow.closed) {
      activeExternalAiWindow.close();
    }
  } catch {
    // Closing a browser-managed cross-origin window is best-effort.
  } finally {
    activeExternalAiWindow = null;
    activePopupGeometry = null;
  }
}

export function alignExternalAiWindowToElement(element: HTMLElement): boolean {
  try {
    if (
      !activeExternalAiWindow ||
      activeExternalAiWindow.closed ||
      !activePopupGeometry
    ) {
      return false;
    }

    const panelRect = element.getBoundingClientRect();
    const availableWidth = window.screen.availWidth;
    const availableTop = window.screen.availTop ?? window.screenY;
    const availableHeight = window.screen.availHeight;
    const hostWindowWidth = Math.min(availableWidth, window.outerWidth || availableWidth);
    const browserChromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
    const browserViewportTop = window.screenY + browserChromeHeight;
    const width = resolvePopupWidth(hostWindowWidth, availableWidth);
    const height = Math.min(
      Math.round(panelRect.height),
      Math.max(320, availableHeight - POPUP_MARGIN * 2),
    );
    const desiredTop = browserViewportTop + Math.round(panelRect.top);
    const top = Math.min(
      Math.max(desiredTop, availableTop),
      availableTop + availableHeight - height,
    );

    activePopupGeometry.width = width;
    activeExternalAiWindow.resizeTo(width, height);
    activeExternalAiWindow.moveTo(activePopupGeometry.left, top);
    return true;
  } catch {
    return false;
  }
}

export function openExternalAiWindow(url: string): ExternalAiWindowResult {
  const hasDesktopPointer = window.matchMedia('(pointer: fine)').matches;
  const availableWidth = window.screen.availWidth;
  const availableHeight = window.screen.availHeight;
  const hostWindowWidth = Math.min(availableWidth, window.outerWidth || availableWidth);

  if (
    !hasDesktopPointer ||
    hostWindowWidth < DESKTOP_MIN_SCREEN_WIDTH ||
    window.innerWidth < DESKTOP_MIN_SCREEN_WIDTH
  ) {
    return openRegularTab(url);
  }

  const width = resolvePopupWidth(hostWindowWidth, availableWidth);
  const height = Math.min(
    POPUP_MAX_HEIGHT,
    Math.max(POPUP_MIN_HEIGHT, Math.round(window.innerHeight * POPUP_HEIGHT_RATIO)),
    Math.max(320, window.innerHeight - POPUP_MARGIN * 2),
    Math.max(320, availableHeight - POPUP_MARGIN * 2),
  );
  const availableLeft = window.screen.availLeft ?? window.screenX;
  const availableTop = window.screen.availTop ?? window.screenY;
  const hostWindowLeft = Math.min(
    Math.max(window.screenX, availableLeft),
    availableLeft + availableWidth - hostWindowWidth,
  );
  const desiredLeft = hostWindowLeft + POPUP_MARGIN;
  const browserChromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
  const browserViewportTop = window.screenY + browserChromeHeight;
  const desiredTop = browserViewportTop + Math.round((window.innerHeight - height) / 2);
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

  activePopupGeometry = { width: Math.round(width), left: Math.round(left) };
  try {
    popup.resizeTo(Math.round(width), Math.round(height));
    popup.moveTo(Math.round(left), Math.round(top));
  } catch {
    // Browser window geometry is best-effort when popup controls are restricted.
  }
  detachOpener(popup);
  activeExternalAiWindow = popup;
  popup.focus();
  return 'popup';
}
