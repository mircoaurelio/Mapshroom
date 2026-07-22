export const OUTPUT_WINDOW_NAME = 'mapshroom-output';

export interface OpenOutputWindowOptions {
  sessionId: string;
  existingWindow?: Window | null;
}

export interface OpenOutputWindowResult {
  popup: Window | null;
  reused: boolean;
  message: string;
}

function buildOutputUrl(sessionId: string): string {
  return `${window.location.origin}${window.location.pathname}#/output/${sessionId}?chooseScreen=1`;
}

function buildWindowFeatures(): string {
  const availableWidth = window.screen.availWidth || window.outerWidth || 1440;
  const availableHeight = window.screen.availHeight || window.outerHeight || 900;
  const width = Math.min(1440, Math.max(720, Math.round(availableWidth * 0.8)));
  const height = Math.min(900, Math.max(540, Math.round(availableHeight * 0.8)));
  const left = Math.round(
    (window.screen.availLeft ?? window.screenX ?? 0) + (availableWidth - width) / 2,
  );
  const top = Math.round(
    (window.screen.availTop ?? window.screenY ?? 0) + (availableHeight - height) / 2,
  );
  return [
    'popup',
    `left=${left}`,
    `top=${top}`,
    `width=${width}`,
    `height=${height}`,
  ].join(',');
}

export function openOutputWindow({
  sessionId,
  existingWindow = null,
}: OpenOutputWindowOptions): OpenOutputWindowResult {
  const nextUrl = buildOutputUrl(sessionId);

  if (existingWindow && !existingWindow.closed) {
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

  const popup = window.open(nextUrl, OUTPUT_WINDOW_NAME, buildWindowFeatures());
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

  return {
    popup,
    reused: false,
    message: 'Projection window opened. Choose its display to enter fullscreen.',
  };
}
