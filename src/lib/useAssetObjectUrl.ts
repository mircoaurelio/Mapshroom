import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

const assetObjectUrlCache = new Map<string, string>();
const ASSET_LOAD_RETRY_COUNT = 4;
const ASSET_LOAD_RETRY_DELAY_MS = 250;

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
    let retryTimeoutId: number | null = null;

    if (!assetId || !assetKind || cachedUrl) {
      return undefined;
    }

    const resolveAssetBlob = async (attempt: number): Promise<void> => {
      const blob = await getAssetBlob(assetId);
      if (disposed) {
        return;
      }

      if (blob) {
        const localObjectUrl = URL.createObjectURL(blob);
        assetObjectUrlCache.set(assetId, localObjectUrl);
        setResolvedAsset({
          assetId,
          url: localObjectUrl,
        });
        return;
      }

      if (attempt < ASSET_LOAD_RETRY_COUNT) {
        retryTimeoutId = window.setTimeout(() => {
          retryTimeoutId = null;
          void resolveAssetBlob(attempt + 1);
        }, ASSET_LOAD_RETRY_DELAY_MS);
        return;
      }

      setResolvedAsset({
        assetId,
        url: null,
      });
    };

    void resolveAssetBlob(0);

    return () => {
      disposed = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
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
