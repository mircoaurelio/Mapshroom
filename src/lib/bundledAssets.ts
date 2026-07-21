import type { AssetRecord } from '../types';

export const BUNDLED_STATUE_ASSET_ID = 'bundled-basestatue';
export const BUNDLED_STATUE_DEPTH_ASSET_ID = 'bundled-basestatue-depth';
export const BUNDLED_STAGE_ASSET_ID = 'bundled-palco-stage';
export const BUNDLED_STAGE_1B_ASSET_ID = 'bundled-stage-1b';
export const BUNDLED_STAGE_2A_ASSET_ID = 'bundled-stage-2a';
export const BUNDLED_STAGE_2B_ASSET_ID = 'bundled-stage-2b';
/** Fallback live stage media when a random starter pick is unavailable. */
export const DEFAULT_BUNDLED_ASSET_ID = BUNDLED_STAGE_ASSET_ID;

/** Pick Base Statue or Default Stage with equal probability for new projects. */
export function pickStarterBundledAssetId(): string {
  return Math.random() < 0.5 ? BUNDLED_STAGE_ASSET_ID : BUNDLED_STATUE_ASSET_ID;
}

const BUNDLED_ASSET_URLS: Record<string, string> = {
  [BUNDLED_STATUE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-basestatue.png`,
  [BUNDLED_STATUE_DEPTH_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-basestatue-depth.png`,
  [BUNDLED_STAGE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-palco.png`,
  [BUNDLED_STAGE_1B_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-1b.png`,
  [BUNDLED_STAGE_2A_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-2a.jpg`,
  [BUNDLED_STAGE_2B_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-stage-2b.png`,
};

export const DEFAULT_BUNDLED_ASSETS: AssetRecord[] = [
  {
    id: BUNDLED_STATUE_ASSET_ID,
    name: 'Base Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 133051,
    lastModified: 1753104000000,
    createdAt: '2026-07-21T15:15:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STATUE_DEPTH_ASSET_ID,
    name: 'Base Statue Depth',
    kind: 'image',
    mimeType: 'image/png',
    size: 993425,
    lastModified: 1753104000000,
    createdAt: '2026-07-21T14:00:00.000Z',
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
