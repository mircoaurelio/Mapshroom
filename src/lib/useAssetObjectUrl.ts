import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

const assetObjectUrlCache = new Map<string, string>();

export function useAssetObjectUrl(asset: AssetRecord | null): string | null {
  const [resolvedAsset, setResolvedAsset] = useState<{
    assetId: string | null;
    url: string | null;
  }>({
    assetId: null,
    url: null,
  });
  const assetId = asset?.id ?? null;
  const assetKind = asset?.kind ?? null;
  const cachedUrl = assetId ? assetObjectUrlCache.get(assetId) ?? null : null;

  useEffect(() => {
    let disposed = false;

    if (!assetId || !assetKind || cachedUrl) {
      return;
    }

    getAssetBlob(assetId).then((blob) => {
      if (disposed || !blob) {
        setResolvedAsset({
          assetId,
          url: null,
        });
        return;
      }

      const localObjectUrl = URL.createObjectURL(blob);
      assetObjectUrlCache.set(assetId, localObjectUrl);
      setResolvedAsset({
        assetId,
        url: localObjectUrl,
      });
    });

    return () => {
      disposed = true;
    };
  }, [assetId, assetKind, cachedUrl]);

  return cachedUrl ?? (resolvedAsset.assetId === assetId ? resolvedAsset.url : null);
}
