import { useEffect, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';

const assetPreviewUrlCache = new Map<string, string>();

export function useAssetPreviewUrls(
  assets: AssetRecord[],
  open: boolean,
  activeAssetId: string | null,
  activeAssetUrl: string | null,
) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeAssetId || !activeAssetUrl) {
      return;
    }

    assetPreviewUrlCache.set(activeAssetId, activeAssetUrl);
    setPreviewUrls((currentValue) =>
      currentValue[activeAssetId] === activeAssetUrl
        ? currentValue
        : {
            ...currentValue,
            [activeAssetId]: activeAssetUrl,
          },
    );
  }, [activeAssetId, activeAssetUrl]);

  useEffect(() => {
    const assetIds = new Set(assets.map((asset) => asset.id));
    const cachedUrls = assets.reduce<Record<string, string>>((collection, asset) => {
      const cachedUrl = assetPreviewUrlCache.get(asset.id);
      if (cachedUrl) {
        collection[asset.id] = cachedUrl;
      }
      return collection;
    }, {});

    setPreviewUrls((currentValue) => {
      const nextValue = Object.entries(currentValue).reduce<Record<string, string>>(
        (collection, [assetId, url]) => {
          if (assetIds.has(assetId)) {
            collection[assetId] = url;
          }
          return collection;
        },
        {},
      );
      let didChange = Object.keys(nextValue).length !== Object.keys(currentValue).length;

      for (const [assetId, url] of Object.entries(cachedUrls)) {
        if (nextValue[assetId] !== url) {
          nextValue[assetId] = url;
          didChange = true;
        }
      }

      return didChange ? nextValue : currentValue;
    });
  }, [assets]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let disposed = false;
    const missingAssets = assets.filter((asset) => !assetPreviewUrlCache.has(asset.id));
    if (!missingAssets.length) {
      return;
    }

    void Promise.all(
      missingAssets.map(async (asset) => {
        const blob = await getAssetBlob(asset.id);
        if (!blob) {
          return null;
        }

        const objectUrl = URL.createObjectURL(blob);
        assetPreviewUrlCache.set(asset.id, objectUrl);
        return [asset.id, objectUrl] as const;
      }),
    ).then((resolvedAssets) => {
      if (disposed) {
        return;
      }

      const nextEntries = resolvedAssets.filter(
        (entry): entry is readonly [string, string] => entry !== null,
      );
      if (!nextEntries.length) {
        return;
      }

      setPreviewUrls((currentValue) => {
        const nextValue = { ...currentValue };
        let didChange = false;

        for (const [assetId, objectUrl] of nextEntries) {
          if (nextValue[assetId] !== objectUrl) {
            nextValue[assetId] = objectUrl;
            didChange = true;
          }
        }

        return didChange ? nextValue : currentValue;
      });
    });

    return () => {
      disposed = true;
    };
  }, [assets, open]);

  return previewUrls;
}
