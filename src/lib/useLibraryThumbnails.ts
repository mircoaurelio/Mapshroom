import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';
import { getBundledAssetUrl } from './bundledAssets';

// The library owns these URLs. Never cache/revoke the stage's full-size URLs.
export function useLibraryThumbnails(assets: AssetRecord[], open: boolean) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const cache = useRef(new Map<string, { key: string; url: string }>());
  const pending = useRef(Promise.resolve());
  const signature = assets.map(asset => `${asset.id}:${asset.lastModified}:${asset.size}`).join('|');
  useEffect(() => {
    let disposed = false;
    const currentAssets = new Map(assets.map(asset => [asset.id, asset]));
    // Keep the first screen's small images warm across reopenings, without
    // retaining full video blobs or an unbounded closed-library cache.
    const retained = new Set(assets.filter(asset => asset.kind === 'image').slice(0, 48).map(asset => asset.id));
    for (const [id, entry] of cache.current) {
      const asset = currentAssets.get(id);
      if (!asset || entry.key !== `${asset.lastModified}:${asset.size}` || (!open && !retained.has(id))) { URL.revokeObjectURL(entry.url); cache.current.delete(id); }
    }
    setUrls(Object.fromEntries([...cache.current].map(([id, entry]) => [id, entry.url])));
    if (!open) return;
    // The caller supplies display order. Two bounded lanes load the first row
    // together; small-memory devices keep a single decoder. Await any retiring
    // batch so quick selections/imports cannot multiply full-size decodes.
    pending.current = pending.current.then(async () => {
      let index = 0;
      const decodeNext = async () => {
        while (!disposed && index < assets.length) {
          const asset = assets[index++];
          if (cache.current.has(asset.id)) continue;
          let bitmap: ImageBitmap | undefined;
          try {
            const bundled = getBundledAssetUrl(asset.id);
            const response = bundled ? await fetch(bundled) : null;
            const blob = response?.ok ? await response.blob() : bundled ? null : await getAssetBlob(asset.id);
            if (!blob || disposed) continue;
            let thumbnail = blob;
            if (asset.kind === 'image') {
              bitmap = await createImageBitmap(blob);
              const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
              const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              const context = canvas.getContext('2d');
              if (!context) throw new Error('Thumbnail unavailable');
              context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close(); bitmap = undefined;
              thumbnail = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Thumbnail unavailable')), 'image/png'));
              canvas.width = canvas.height = 1;
            }
            if (disposed) break;
            const url = URL.createObjectURL(thumbnail);
            cache.current.set(asset.id, { key: `${asset.lastModified}:${asset.size}`, url });
            setUrls(previous => ({ ...previous, [asset.id]: url }));
          } catch { bitmap?.close(); /* A missing asset remains selectable for re-import/removal. */ }
        }
      };
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const mobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      await Promise.all(Array.from({ length: mobile || (memory !== undefined && memory <= 4) ? 1 : 2 }, decodeNext));
    });
    return () => { disposed = true; };
    // The signature changes only when content changes, not when a name is edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, open]);
  useEffect(() => {
    const owned = cache.current;
    return () => { owned.forEach(entry => URL.revokeObjectURL(entry.url)); owned.clear(); };
  }, []);
  return urls;
}
