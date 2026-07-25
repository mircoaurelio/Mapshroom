export type ExternalAiWindowResult = 'popup' | 'tab' | 'blocked';

const DESKTOP_MIN_SCREEN_WIDTH = 1280;
const POPUP_MIN_WIDTH = 480;
const POPUP_MAX_WIDTH = 620;
const POPUP_WIDTH_RATIO = 0.37;
const POPUP_MIN_HEIGHT = 540;
const POPUP_MAX_HEIGHT = 680;
const POPUP_HEIGHT_RATIO = 0.6;
const POPUP_MARGIN = 24;
const POPUP_EDGE_INSET_RATIO = 0.05;
const AI_POPUP_NAME = 'mapshroom-ai-chat';
let activeExternalAiWindow: Window | null = null;
let activePopupGeometry: { width: number; left: number } | null = null;

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
    const availableTop = window.screen.availTop ?? window.screenY;
    const availableHeight = window.screen.availHeight;
    const browserChromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
    const browserViewportTop = window.screenY + browserChromeHeight;
    const height = Math.min(
      Math.round(panelRect.height),
      Math.max(320, availableHeight - POPUP_MARGIN * 2),
    );
    const desiredTop = browserViewportTop + Math.round(panelRect.top);
    const top = Math.min(
      Math.max(desiredTop, availableTop),
      availableTop + availableHeight - height,
    );

    activeExternalAiWindow.resizeTo(activePopupGeometry.width, height);
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

  const width = Math.min(
    POPUP_MAX_WIDTH,
    Math.max(POPUP_MIN_WIDTH, Math.round(hostWindowWidth * POPUP_WIDTH_RATIO)),
  );
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
  const edgeInset = Math.max(POPUP_MARGIN, Math.round(hostWindowWidth * POPUP_EDGE_INSET_RATIO));
  const desiredLeft = hostWindowLeft + hostWindowWidth - width - edgeInset;
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
