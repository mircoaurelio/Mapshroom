export interface OutputDisplayOption {
  id: string;
  label: string;
  screen: ScreenDetailed;
  left: number;
  top: number;
  width: number;
  height: number;
  isCurrent: boolean;
  isPrimary: boolean;
  isSecondary: boolean;
}

export type OutputDisplayQueryResult =
  | {
      status: 'ready';
      screens: OutputDisplayOption[];
      secondaryScreens: OutputDisplayOption[];
    }
  | {
      status: 'unsupported';
      screens: [];
      secondaryScreens: [];
      message: string;
    }
  | {
      status: 'denied';
      screens: [];
      secondaryScreens: [];
      message: string;
    }
  | {
      status: 'error';
      screens: [];
      secondaryScreens: [];
      message: string;
    };

function buildDisplayLabel(screen: ScreenDetailed, index: number): string {
  const trimmed = screen.label?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (screen.isPrimary) {
    return 'Primary display';
  }

  return `Display ${index + 1}`;
}

function toDisplayOption(
  screen: ScreenDetailed,
  index: number,
  currentScreen: ScreenDetailed,
): OutputDisplayOption {
  const isCurrent = screen === currentScreen;
  return {
    id: `${screen.left}:${screen.top}:${screen.width}x${screen.height}:${index}`,
    label: buildDisplayLabel(screen, index),
    screen,
    left: Math.round(screen.availLeft),
    top: Math.round(screen.availTop),
    width: Math.max(1, Math.round(screen.availWidth)),
    height: Math.max(1, Math.round(screen.availHeight)),
    isCurrent,
    isPrimary: Boolean(screen.isPrimary),
    isSecondary: !isCurrent,
  };
}

export function isScreenDetailsSupported(): boolean {
  return typeof window.getScreenDetails === 'function';
}

export async function queryOutputDisplays(): Promise<OutputDisplayQueryResult> {
  if (!isScreenDetailsSupported() || typeof window.getScreenDetails !== 'function') {
    return {
      status: 'unsupported',
      screens: [],
      secondaryScreens: [],
      message:
        'This browser cannot list secondary displays. You can still open output fullscreen on this screen, then drag it to a projector if needed.',
    };
  }

  try {
    const details = await window.getScreenDetails();
    const screens = details.screens.map((screen, index) =>
      toDisplayOption(screen, index, details.currentScreen),
    );
    const secondaryScreens = screens.filter((screen) => screen.isSecondary);

    return {
      status: 'ready',
      screens,
      secondaryScreens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const denied =
      /denied|permission|not allowed|security/i.test(message) ||
      (typeof message === 'string' && message.toLowerCase().includes('permission'));

    if (denied) {
      return {
        status: 'denied',
        screens: [],
        secondaryScreens: [],
        message:
          'Screen access was blocked. Allow window management / screen details for this site, or open output fullscreen on this display.',
      };
    }

    return {
      status: 'error',
      screens: [],
      secondaryScreens: [],
      message:
        'Unable to read connected displays. You can still open output fullscreen on this screen.',
    };
  }
}
