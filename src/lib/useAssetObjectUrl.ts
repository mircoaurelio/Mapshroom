import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

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

  useEffect(() => {
    let disposed = false;
    let localObjectUrl: string | null = null;

    if (!assetId || !assetKind) {
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

      if (assetKind === 'image') {
        const reader = new FileReader();
        reader.onload = () => {
          if (disposed) {
            return;
          }

          const result = typeof reader.result === 'string' ? reader.result : null;
          setResolvedAsset({
            assetId,
            url: result,
          });
        };
        reader.onerror = () => {
          if (!disposed) {
            setResolvedAsset({
              assetId,
              url: null,
            });
          }
        };
        reader.readAsDataURL(blob);
        return;
      }

      localObjectUrl = URL.createObjectURL(blob);
      setResolvedAsset({
        assetId,
        url: localObjectUrl,
      });
    });

    return () => {
      disposed = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [assetId, assetKind]);

  return resolvedAsset.assetId === assetId ? resolvedAsset.url : null;
}
