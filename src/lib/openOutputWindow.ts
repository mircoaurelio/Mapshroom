import type { OutputDisplayOption } from './screenDetails';

export const OUTPUT_WINDOW_NAME = 'mapshroom-output';

export interface OpenOutputWindowOptions {
  sessionId: string;
  display?: OutputDisplayOption | null;
  /** When true, open fullscreen on the current browser window's display. */
  fullscreenCurrent?: boolean;
  existingWindow?: Window | null;
}

export interface OpenOutputWindowResult {
  popup: Window | null;
  reused: boolean;
  message: string;
}

function buildOutputUrl(sessionId: string, requestFullscreen: boolean): string {
  const fullscreenQuery = requestFullscreen ? '?fullscreen=1' : '';
  return `${window.location.origin}${window.location.pathname}#/output/${sessionId}${fullscreenQuery}`;
}

function buildWindowFeatures(display: OutputDisplayOption | null | undefined): string {
  if (!display) {
    return 'popup,width=1440,height=900';
  }

  return [
    'popup',
    `left=${display.left}`,
    `top=${display.top}`,
    `width=${display.width}`,
    `height=${display.height}`,
  ].join(',');
}

function requestPopupFullscreen(popup: Window): void {
  const tryFullscreen = () => {
    const root = popup.document?.documentElement;
    if (!root || typeof root.requestFullscreen !== 'function') {
      return;
    }

    void root.requestFullscreen().catch(() => {
      // Browser may reject fullscreen outside a user gesture; bounds placement still covers the display.
    });
  };

  try {
    if (popup.document.readyState === 'complete') {
      tryFullscreen();
      return;
    }
  } catch {
    // Cross-document access can fail briefly while the popup boots.
  }

  try {
    popup.addEventListener('load', tryFullscreen, { once: true });
  } catch {
    window.setTimeout(tryFullscreen, 250);
  }

  window.setTimeout(tryFullscreen, 400);
  window.setTimeout(tryFullscreen, 1_200);
}

export function openOutputWindow({
  sessionId,
  display = null,
  fullscreenCurrent = false,
  existingWindow = null,
}: OpenOutputWindowOptions): OpenOutputWindowResult {
  const shouldFullscreen = Boolean(display) || fullscreenCurrent;
  const nextUrl = buildOutputUrl(sessionId, shouldFullscreen);

  if (existingWindow && !existingWindow.closed && !display && !fullscreenCurrent) {
    try {
      existingWindow.focus();
    } catch {
      // Ignore focus failures on locked popups.
    }
    return {
      popup: existingWindow,
      reused: true,
      message: 'Projection window focused.',
    };
  }

  if (existingWindow && !existingWindow.closed) {
    try {
      existingWindow.close();
    } catch {
      // Continue and open a fresh window.
    }
  }

  const currentFallback: OutputDisplayOption | null = fullscreenCurrent
    ? {
        id: 'current',
        label: 'This display',
        left: Math.round(window.screen.availLeft ?? window.screenX ?? 0),
        top: Math.round(window.screen.availTop ?? window.screenY ?? 0),
        width: Math.max(1, Math.round(window.screen.availWidth || window.outerWidth || 1440)),
        height: Math.max(1, Math.round(window.screen.availHeight || window.outerHeight || 900)),
        isCurrent: true,
        isPrimary: false,
        isSecondary: false,
      }
    : null;

  const features = buildWindowFeatures(display ?? currentFallback);
  const popup = window.open(nextUrl, OUTPUT_WINDOW_NAME, features);
  if (!popup) {
    return {
      popup: null,
      reused: false,
      message: 'Popup blocked. Allow popups to open the output window.',
    };
  }

  try {
    popup.focus();
  } catch {
    // Ignore focus failures.
  }

  if (shouldFullscreen) {
    requestPopupFullscreen(popup);
  }

  const message = display
    ? `Projection window opened fullscreen on ${display.label}.`
    : fullscreenCurrent
      ? 'Projection window opened fullscreen on this display.'
      : 'Projection window opened.';

  return {
    popup,
    reused: false,
    message,
  };
}
