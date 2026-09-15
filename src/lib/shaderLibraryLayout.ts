export interface ShaderLibraryWidths { directory: number; chat: number }
export type ShaderLibraryPane = keyof ShaderLibraryWidths;
export const SHADER_LIBRARY_LAYOUT_KEY = 'mapshroom-v3:shader-library-layout';
export const DEFAULT_LIBRARY_WIDTHS: ShaderLibraryWidths = { directory: 280, chat: 340 };
export const LIBRARY_PANE_MIN = { directory: 220, chat: 280 };
export const LIBRARY_PANE_MAX = { directory: 480, chat: 560 };
export const LIBRARY_CATALOG_MIN = 340;
export const LIBRARY_SEPARATOR_WIDTH = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function readLibraryWidths(raw: string | null): ShaderLibraryWidths {
  try {
    const value = JSON.parse(raw ?? 'null');
    const read = (pane: ShaderLibraryPane) => typeof value?.[pane] === 'number' && Number.isFinite(value[pane])
        ? clamp(value[pane], LIBRARY_PANE_MIN[pane], LIBRARY_PANE_MAX[pane])
        : DEFAULT_LIBRARY_WIDTHS[pane];
    return { directory: read('directory'), chat: read('chat') };
  } catch { return { ...DEFAULT_LIBRARY_WIDTHS }; }
}

export function resolveLibraryWidths(preferred: ShaderLibraryWidths, width: number, directoryVisible: boolean, chatVisible: boolean): ShaderLibraryWidths {
  const directory = directoryVisible ? preferred.directory : 0;
  const chat = chatVisible ? preferred.chat : 0;
  const available = Math.max(0, width - LIBRARY_CATALOG_MIN - (Number(directoryVisible) + Number(chatVisible)) * LIBRARY_SEPARATOR_WIDTH);
  const minimum = (directoryVisible ? LIBRARY_PANE_MIN.directory : 0) + (chatVisible ? LIBRARY_PANE_MIN.chat : 0);
  const excess = Math.max(0, directory + chat - available);
  const shrinkable = directory + chat - minimum;
  const scale = shrinkable > 0 ? Math.max(0, 1 - excess / shrinkable) : 1;
  return {
    directory: directoryVisible ? Math.floor(LIBRARY_PANE_MIN.directory + (directory - LIBRARY_PANE_MIN.directory) * scale) : 0,
    chat: chatVisible ? Math.floor(LIBRARY_PANE_MIN.chat + (chat - LIBRARY_PANE_MIN.chat) * scale) : 0,
  };
}

export function libraryPaneMaximum(pane: ShaderLibraryPane, widths: ShaderLibraryWidths, width: number): number {
  const other = widths[pane === 'directory' ? 'chat' : 'directory'];
  return Math.max(LIBRARY_PANE_MIN[pane], Math.floor(Math.min(LIBRARY_PANE_MAX[pane],
    width - LIBRARY_CATALOG_MIN - LIBRARY_SEPARATOR_WIDTH - (other ? other + LIBRARY_SEPARATOR_WIDTH : 0))));
}
