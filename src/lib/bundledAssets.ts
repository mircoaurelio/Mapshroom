import type { AssetRecord } from '../types';

export const BUNDLED_STATUE_ASSET_ID = 'bundled-basestatue';
export const BUNDLED_STAGE_ASSET_ID = 'bundled-palco-stage';
export const DEFAULT_BUNDLED_ASSET_ID = BUNDLED_STATUE_ASSET_ID;

const BUNDLED_ASSET_URLS: Record<string, string> = {
  [BUNDLED_STATUE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-basestatue.png`,
  [BUNDLED_STAGE_ASSET_ID]: `${import.meta.env.BASE_URL}assets/defaults-palco.png`,
};

export const DEFAULT_BUNDLED_ASSETS: AssetRecord[] = [
  {
    id: BUNDLED_STATUE_ASSET_ID,
    name: 'Base Statue',
    kind: 'image',
    mimeType: 'image/png',
    size: 2288415,
    lastModified: 1779634800000,
    createdAt: '2026-05-24T15:00:00.000Z',
    sourceType: 'bundled',
  },
  {
    id: BUNDLED_STAGE_ASSET_ID,
    name: 'Palco Stage',
    kind: 'image',
    mimeType: 'image/png',
    size: 7690909,
    lastModified: 1779634800000,
    createdAt: '2026-05-24T15:00:00.000Z',
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
