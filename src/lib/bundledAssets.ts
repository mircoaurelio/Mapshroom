import type { AssetRecord } from '../types';

export const BUNDLED_STATUE_ASSET_ID = 'bundled-basestatue';
export const BUNDLED_STATUE_DEPTH_ASSET_ID = 'bundled-basestatue-depth';
export const BUNDLED_STATUE_GREEN_EYES_ASSET_ID = 'bundled-statue-green-eyes';
export const BUNDLED_STATUE_BIOMECHANICAL_ASSET_ID = 'bundled-statue-biomechanical';
export const BUNDLED_STATUE_CREATURE_ASSET_ID = 'bundled-statue-creature';
export const BUNDLED_STATUE_MAGMA_ASSET_ID = 'bundled-statue-magma';
export const BUNDLED_STAGE_ASSET_ID = 'bundled-palco-stage';
export const BUNDLED_STAGE_1B_ASSET_ID = 'bundled-stage-1b';
export const BUNDLED_STAGE_2A_ASSET_ID = 'bundled-stage-2a';
export const BUNDLED_STAGE_2B_ASSET_ID = 'bundled-stage-2b';
export const BUNDLED_VERTICAL_STAGE_ASSET_ID = 'bundled-stage-vertical';
export const BUNDLED_COLOR_MASK_STAGE_ASSET_ID = 'bundled-stage-color-mask-pro';
export const BUNDLED_COLOR_MASK_STAGE_DEPTH_ASSET_ID =
  'bundled-stage-color-mask-pro-depth';
/** Legacy ID retained only to migrate projects created with the old white source. */
export const BUNDLED_WHITE_CANVAS_ASSET_ID = 'bundled-white-canvas';
export const BUNDLED_EMPTY_CANVAS_ASSET_ID = 'bundled-empty-canvas';
/** Fallback live stage media when a random starter pick is unavailable. */
export const DEFAULT_BUNDLED_ASSET_ID = BUNDLED_STAGE_ASSET_ID;

/** Pick the portrait stage on mobile, otherwise preserve the desktop starter mix. */
export function pickStarterBundledAssetId(isMobile = false): string {
  if (isMobile) {
    return BUNDLED_VERTICAL_STAGE_ASSET_ID;
  }
  return Math.random() < 0.5 ? BUNDLED_STAGE_ASSET_ID : BUNDLED_STATUE_ASSET_ID;
}

const BUNDLED_ASSET_URLS: Record<string, string> = {
  [BUNDLED_STATUE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-basestatue.png?v=20260725-2`,
  [BUNDLED_STATUE_DEPTH_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-basestatue-depth.png?v=20260725-2`,
  [BUNDLED_STATUE_GREEN_EYES_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-statue-green-eyes.png`,
  [BUNDLED_STATUE_BIOMECHANICAL_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-statue-biomechanical.png`,
  [BUNDLED_STATUE_CREATURE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-statue-creature.png`,
  [BUNDLED_STATUE_MAGMA_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-statue-magma.png`,
  [BUNDLED_STAGE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-palco.png`,
  [BUNDLED_STAGE_1B_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-1b.png`,
  [BUNDLED_STAGE_2A_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-2a.jpg`,
  [BUNDLED_STAGE_2B_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-2b.png`,
  [BUNDLED_VERTICAL_STAGE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-vertical.png`,
  [BUNDLED_COLOR_MASK_STAGE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-color-mask-pro.png`,
  [BUNDLED_COLOR_MASK_STAGE_DEPTH_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-color-mask-pro-depth.png`,
  [BUNDLED_WHITE_CANVAS_ASSET_ID]:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlQ47kAAAAASUVORK5CYII=',
  [BUNDLED_EMPTY_CANVAS_ASSET_ID]:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY7j//el/AAkvA7vI7ZWqAAAAAElFTkSuQmCC',
};

export const BUNDLED_EMPTY_CANVAS_ASSET: AssetRecord = {
  id: BUNDLED_EMPTY_CANVAS_ASSET_ID,
  name: 'Internal Pastel Green Canvas',
  kind: 'image',
  mimeType: 'image/png',
  size: 144,
  lastModified: 1785348000000,
  createdAt: '2026-07-29T18:00:00.000Z',
  sourceType: 'bundled',
};

export function isInternalCanvasAssetId(assetId: string): boolean {
  return (
    assetId === BUNDLED_EMPTY_CANVAS_ASSET_ID ||
    assetId === BUNDLED_WHITE_CANVAS_ASSET_ID
  );
}

export const DEFAULT_BUNDLED_ASSETS: AssetRecord[] = [
  {
    id: BUNDLED_STATUE_ASSET_ID,
    name: 'Base Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 967560,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_DEPTH_ASSET_ID,
    name: 'Base Statue Depth',
    kind: 'image',
    mimeType: 'image/png',
    size: 967560,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_GREEN_EYES_ASSET_ID,
    name: 'Green Eyes Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 1019601,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_BIOMECHANICAL_ASSET_ID,
    name: 'Biomechanical Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 1859445,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_CREATURE_ASSET_ID,
    name: 'Creature Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 1144304,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_MAGMA_ASSET_ID,
    name: 'Magma Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 1838456,
    lastModified: 1784995200000,
    createdAt: '2026-07-25T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STAGE_ASSET_ID,
    name: 'Default Stage',
    kind: 'image',
    mimeType: 'image/png',
    size: 7422090,
    lastModified: 1753106400000,
    createdAt: '2026-07-21T16:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STAGE_1B_ASSET_ID,
    name: 'Stage 1b',
    kind: 'image',
    mimeType: 'image/png',
    size: 6308666,
    lastModified: 1775415619000,
    createdAt: '2026-04-05T20:20:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STAGE_2A_ASSET_ID,
    name: 'Stage 2a',
    kind: 'image',
    mimeType: 'image/jpeg',
    size: 214572,
    lastModified: 1775415619000,
    createdAt: '2026-04-05T20:20:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STAGE_2B_ASSET_ID,
    name: 'Stage 2b',
    kind: 'image',
    mimeType: 'image/png',
    size: 6439447,
    lastModified: 1775415619000,
    createdAt: '2026-04-05T20:20:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_VERTICAL_STAGE_ASSET_ID,
    name: 'Vertical Stage',
    kind: 'image',
    mimeType: 'image/png',
    size: 6218023,
    lastModified: 1784721600000,
    createdAt: '2026-07-22T12:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_COLOR_MASK_STAGE_ASSET_ID,
    name: 'Goddess Stage Color Map',
    kind: 'image',
    mimeType: 'image/png',
    size: 2643279,
    lastModified: 1785100200000,
    createdAt: '2026-07-26T21:10:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_COLOR_MASK_STAGE_DEPTH_ASSET_ID,
    name: 'Goddess Stage Exaggerated Depth',
    kind: 'image',
    mimeType: 'image/png',
    size: 1815655,
    lastModified: 1785100200000,
    createdAt: '2026-07-26T21:10:00.000Z',
    sourceType: 'bundled',
  },
];

export function getBundledAssetUrl(assetId: string): string | null {
  return BUNDLED_ASSET_URLS[assetId] ?? null;
}

export function mergeBundledAssets(assets: AssetRecord[]): AssetRecord[] {
  const existingIds = new Set(assets.map((asset) => asset.id));
  return [
    ...DEFAULT_BUNDLED_ASSETS.filter((asset) => !existingIds.has(asset.id)),
    ...assets,
  ];
}
