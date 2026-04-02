import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

const assetObjectUrlCache = new Map<string, string>();

export type AssetObjectUrlStatus = 'idle' | 'loading' | 'ready' | 'missing';

interface AssetObjectUrlResult {
  url: string | null;
  status: AssetObjectUrlStatus;
}

export function useAssetObjectUrl(asset: AssetRecord | null): AssetObjectUrlResult {
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

  if (!assetId || !assetKind) {
    return {
      url: null,
      status: 'idle',
    };
  }

  if (cachedUrl) {
    return {
      url: cachedUrl,
      status: 'ready',
    };
  }

  if (resolvedAsset.assetId !== assetId) {
    return {
      url: null,
      status: 'loading',
    };
  }

  if (resolvedAsset.url) {
    return {
      url: resolvedAsset.url,
      status: 'ready',
    };
  }

  return {
    url: null,
    status: 'missing',
  };
}
