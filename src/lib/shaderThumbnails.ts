import type { SavedShader } from '../types';
import { getRenderableShaderCode, getRenderableShaderUniformValues } from './shaderState';
import { shaderThumbnailKey, THUMBNAIL_VERSION } from './shaderThumbnailKey';
import manifest from './shaderThumbnailManifest.json';
import { ThumbnailQueue } from './thumbnailQueue';

const baked = manifest as Record<string, { file: string; time: number }>;
const identities = new WeakMap<SavedShader, { key: string; code: string; values: ReturnType<typeof getRenderableShaderUniformValues> }>();
const memory = new Map<string, string>();
const CACHE_LIMIT = 128;
const CACHE_NAME = `mapshroom-shader-thumbnails-v${THUMBNAIL_VERSION}`;
export function thumbnailIdentity(shader: SavedShader) {
  let identity = identities.get(shader);
  if (!identity) {
    const code = getRenderableShaderCode(shader), values = getRenderableShaderUniformValues(shader);
    identity = { code, values, key: shaderThumbnailKey(code, values) };
    identities.set(shader, identity);
  }
  return identity;
}
export function bundledShaderThumbnail(key: string) {
  return baked[key] ? `${import.meta.env.BASE_URL}assets/shader-thumbnails/${baked[key].file}` : null;
}
function remember(key: string, url: string) {
  memory.delete(key); memory.set(key, url);
  while (memory.size > CACHE_LIMIT) memory.delete(memory.keys().next().value!);
  return url;
}
const cacheUrl = (key: string) => new URL(`/__shader-thumbnails/${THUMBNAIL_VERSION}/${key}`, location.origin).href;
let rendererModule: typeof import('./shaderPreview') | null = null;
const renderer = { current: null as import('./shaderPreview').ShaderPreviewRenderer | null };
const queue = new ThumbnailQueue(() => new Promise<void>(resolve => {
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 100);
  };
  if (!document.hidden) { schedule(); return; }
  const visible = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', visible); schedule(); } };
  document.addEventListener('visibilitychange', visible);
}), () => {
  rendererModule?.destroyShaderPreviewRenderer(renderer.current);
  renderer.current = null;
});

export function requestShaderThumbnail(shader: SavedShader, signal: AbortSignal) {
  const { key, code, values } = thumbnailIdentity(shader);
  const known = bundledShaderThumbnail(key) ?? memory.get(key);
  if (known) return Promise.resolve(known);
  return queue.request(key, signal, async active => {
    let cache: Cache | undefined;
    try {
      cache = await caches.open(CACHE_NAME);
      const stored = await cache.match(cacheUrl(key));
      if (stored) return remember(key, await stored.text());
    } catch { /* CacheStorage can be disabled; session caching still works. */ }
    if (!active()) return null;
    rendererModule ??= await import('./shaderPreview');
    const { createShaderThumbnailSource } = await import('./shaderThumbnailSource');
    if (!active()) return null;
    const url = await rendererModule.renderShaderPreviewToDataUrl(code, values,
      createShaderThumbnailSource(), null, renderer, { isActive: active, strict: true, timeSeconds: 1.6 });
    if (!url || !active()) return null;
    remember(key, url);
    try {
      if (cache) {
        await cache.put(cacheUrl(key), new Response(url));
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - CACHE_LIMIT)).map(item => cache!.delete(item)));
      }
    } catch { /* Private or full storage must not prevent a preview. */ }
    return url;
  });
}
