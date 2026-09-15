import type { AssetRecord } from '../types';
import { defaultVariantKinds, variantOptions, type AssetVariantKind } from './assetVariants.ts';

export interface VariantPreferences {
  outputs: AssetVariantKind[];
  automatic: boolean;
  useBackgroundSource: boolean;
}

export function readVariantPreferences(serialized: string | null): VariantPreferences {
  const defaults: VariantPreferences = { outputs: [...defaultVariantKinds], automatic: true, useBackgroundSource: true };
  try {
    const value = JSON.parse(serialized ?? 'null');
    if (!value || !Array.isArray(value.outputs)) return defaults;
    return {
      outputs: variantOptions.filter(option => value.outputs.includes(option.id)).map(option => option.id),
      automatic: value.automatic === true,
      useBackgroundSource: value.useBackgroundSource !== false,
    };
  } catch { return defaults; }
}

export function latestVariant(assets: AssetRecord[], sourceId: string, kind: AssetVariantKind) {
  return assets.filter(asset => asset.derivation?.sourceAssetId === sourceId && asset.derivation.kind === kind)
    .reduce<AssetRecord | undefined>((latest, asset) => !latest || asset.lastModified >= latest.lastModified ? asset : latest, undefined);
}

export interface VariantBatchPlan { outputs: AssetVariantKind[]; input: 'original' | 'background' }

// Build dependencies when the user requests generation, never on a preference change.
export function planVariantGeneration(sourceId: string, assets: AssetRecord[], kinds: AssetVariantKind[], options: {
  useBackgroundSource: boolean; allowDepth: boolean; regenerate?: boolean; occupied?: Set<AssetVariantKind>;
}): VariantBatchPlan[] {
  const order: AssetVariantKind[] = ['background', 'segmentation', 'gradient', 'field', 'edges', 'depth'];
  const outputs = order.filter(kind => kinds.includes(kind) && (kind !== 'depth' || options.allowDepth)
    && !options.occupied?.has(kind) && (options.regenerate || !latestVariant(assets, sourceId, kind)));
  if (!outputs.length) return [];
  if (!options.useBackgroundSource) return [{ outputs, input: 'original' }];
  const derived = outputs.filter(kind => kind !== 'background');
  const needsBackground = outputs.includes('background') || (derived.length > 0
    && !latestVariant(assets, sourceId, 'background') && !options.occupied?.has('background'));
  return [
    ...(needsBackground ? [{ outputs: ['background' as const], input: 'original' as const }] : []),
    ...(derived.length ? [{ outputs: derived, input: 'background' as const }] : []),
  ];
}
