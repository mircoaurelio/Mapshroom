import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

export function useAssetObjectUrl(asset: AssetRecord | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const assetId = asset?.id ?? null;

  useEffect(() => {
    let disposed = false;
    let localObjectUrl: string | null = null;

    queueMicrotask(() => {
      if (!disposed) {
        setObjectUrl(null);
      }
    });

    if (!assetId) {
      return;
    }

    getAssetBlob(assetId).then((blob) => {
      if (disposed || !blob) {
        setObjectUrl(null);
        return;
      }

      localObjectUrl = URL.createObjectURL(blob);
      setObjectUrl(localObjectUrl);
    });

    return () => {
      disposed = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [assetId]);

  return assetId ? objectUrl : null;
}
