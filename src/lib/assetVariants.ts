import type { AssetRecord } from '../types';

export type AssetVariantKind = 'background' | 'segmentation' | 'depth' | 'gradient' | 'field' | 'edges';
export interface AssetDerivation {
  sourceAssetId: string;
  kind: AssetVariantKind | 'mask' | 'painted';
  width?: number;
  height?: number;
  method?: string;
}
export interface VariantResult { blob: Blob; kind: AssetVariantKind; width: number; height: number; method: string }
export type SaveAssetVariant = (source: AssetRecord, result: VariantResult) => Promise<AssetRecord | null>;
export const variantOptions: { id: AssetVariantKind; title: string; description: string }[] = [
  { id: 'background', title: 'Remove background', description: 'Transparent image' },
  { id: 'segmentation', title: 'Segmentation', description: 'Smooth colored zones' },
  { id: 'depth', title: 'Depth map', description: 'Relative depth from the photo' },
  { id: 'gradient', title: 'Color gradient', description: 'Lighting with original texture' },
  { id: 'field', title: 'Grayscale gradient', description: 'Smooth lighting field' },
  { id: 'edges', title: 'Zone edges', description: 'Contours of the surface zones' },
];
export const defaultVariantKinds: AssetVariantKind[] = ['background', 'segmentation', 'depth'];
export function sourceForAsset(asset: AssetRecord | undefined | null, assets: AssetRecord[]) {
  return assets.find(item => item.id === asset?.derivation?.sourceAssetId) ?? asset ?? null;
}
