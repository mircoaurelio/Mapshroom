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

function buildOutputUrl(sessionId: string, requestFullscreen = false): string {
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

function writeFullscreenShell(popup: Window, outputUrl: string): boolean {
  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mapshroom Output</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
      iframe { display: block; width: 100%; height: 100%; border: 0; background: #000; }
    </style>
  </head>
  <body>
    <iframe
      id="mapshroom-output-frame"
      title="Mapshroom output"
      allow="fullscreen; autoplay; clipboard-read; clipboard-write"
      allowfullscreen
      src="${outputUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"
    ></iframe>
  </body>
</html>`);
    popup.document.close();
    return true;
  } catch {
    return false;
  }
}

function requestShellFullscreen(popup: Window): void {
  try {
    const root = popup.document?.documentElement;
    if (!root || typeof root.requestFullscreen !== 'function') {
      return;
    }
    if (popup.document.fullscreenElement) {
      return;
    }
    void root.requestFullscreen().catch(() => {
      // Gesture may be rejected on some browsers; the window is still sized to the display.
    });
  } catch {
    // Ignore cross-document races while the popup boots.
  }
}

export function openOutputWindow({
  sessionId,
  display = null,
  fullscreenCurrent = false,
  existingWindow = null,
}: OpenOutputWindowOptions): OpenOutputWindowResult {
  const shouldFullscreen = Boolean(display) || fullscreenCurrent;
  const nextUrl = buildOutputUrl(sessionId, false);
  const fallbackUrl = buildOutputUrl(sessionId, true);

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

  const targetDisplay = display ?? currentFallback;
  const features = buildWindowFeatures(targetDisplay);

  // Open about:blank first so fullscreen can start in the same user gesture.
  // Host the SPA in an iframe so a later navigation does not exit fullscreen.
  const popup = window.open(shouldFullscreen ? 'about:blank' : nextUrl, OUTPUT_WINDOW_NAME, features);
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
    if (writeFullscreenShell(popup, nextUrl)) {
      requestShellFullscreen(popup);
      window.requestAnimationFrame(() => requestShellFullscreen(popup));
      window.setTimeout(() => requestShellFullscreen(popup), 0);
    } else {
      try {
        popup.location.replace(fallbackUrl);
      } catch {
        try {
          popup.location.href = fallbackUrl;
        } catch {
          // Ignore navigation failures.
        }
      }
    }
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
