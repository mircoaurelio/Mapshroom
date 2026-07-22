/** Window Management / Screen Details API (Chromium). */

interface ScreenDetailed extends Screen {
  readonly availLeft: number;
  readonly availTop: number;
  readonly left: number;
  readonly top: number;
  readonly isPrimary: boolean;
  readonly isInternal: boolean;
  readonly devicePixelRatio: number;
  readonly label: string;
}

interface ScreenDetails extends EventTarget {
  readonly currentScreen: ScreenDetailed;
  readonly screens: ReadonlyArray<ScreenDetailed>;
  oncurrentscreenchange: ((this: ScreenDetails, ev: Event) => void) | null;
  onscreenschange: ((this: ScreenDetails, ev: Event) => void) | null;
}

interface Window {
  getScreenDetails?: () => Promise<ScreenDetails>;
}

interface Screen {
  readonly availLeft?: number;
  readonly availTop?: number;
}
