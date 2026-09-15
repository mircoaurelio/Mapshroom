import type { AssetRecord } from '../types';
import type { GradientSettings } from './assetVariantRules.js';

export type AssetVariantKind = 'background' | 'segmentation' | 'depth' | 'gradient' | 'field' | 'edges';
export interface AssetDerivation {
  sourceAssetId: string;
  inputAssetId?: string;
  kind: AssetVariantKind | 'mask' | 'painted';
  width?: number;
  height?: number;
  method?: string;
  surfaceSettings?: GradientSettings;
}
export interface VariantResult { blob: Blob; kind: AssetVariantKind; width: number; height: number; method: string; surfaceSettings?: GradientSettings; inputAssetId?: string }
export type SaveAssetVariant = (source: AssetRecord, result: VariantResult) => Promise<AssetRecord | null>;
export const variantOptions: { id: AssetVariantKind; title: string; description: string }[] = [
  { id: 'background', title: 'Remove background', description: 'Transparent image' },
  { id: 'gradient', title: 'Gradient map', description: 'Color lighting with original texture' },
  { id: 'depth', title: 'Depth map', description: 'Relative depth from the photo' },
  { id: 'segmentation', title: 'Segmentation', description: 'Smooth colored zones' },
  { id: 'field', title: 'Grayscale gradient', description: 'Smooth lighting field' },
  { id: 'edges', title: 'Zone edges', description: 'Contours of the surface zones' },
];
export const defaultVariantKinds: AssetVariantKind[] = ['background', 'gradient', 'depth', 'segmentation'];
export function sourceForAsset(asset: AssetRecord | undefined | null, assets: AssetRecord[]) {
  return assets.find(item => item.id === asset?.derivation?.sourceAssetId) ?? asset ?? null;
}

export function mapEditorOriginalForAsset(asset: AssetRecord | null, assets: AssetRecord[]) {
  const derivation = asset?.derivation;
  if (!derivation) return null;
  // Depth compares with its inference input; a removed background compares with
  // the original photo, even after several rounds of mask editing.
  const sourceIds = derivation.kind === 'depth'
    ? [derivation.inputAssetId, derivation.sourceAssetId]
    : ['background', 'mask'].includes(derivation.kind) ? [derivation.sourceAssetId] : [];
  for (const id of sourceIds) {
    const original = assets.find(item => item.id === id && item.id !== asset?.id);
    if (original) return original;
  }
  return null;
}
