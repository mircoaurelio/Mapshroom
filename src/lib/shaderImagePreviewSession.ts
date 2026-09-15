import type { SavedShader } from '../types';
import { thumbnailIdentity } from './shaderThumbnails';
import { ThumbnailQueue } from './thumbnailQueue';
import { destroyShaderPreviewRenderer, loadShaderPreviewSource, renderShaderPreviewFrame, renderShaderPreviewToDataUrl, type ShaderPreviewRenderer } from './shaderPreview';

/** One shared context and one job at a time for this image; disposed with the flag. */
export class ShaderImagePreviewSession {
  private renderer = { current: null as ShaderPreviewRenderer | null };
  private source: ReturnType<typeof loadShaderPreviewSource> | null = null;
  private cache = new Map<string, string>();
  private pending: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private url: string;
  private kind: 'image' | 'video';
  private queue = new ThumbnailQueue(() => new Promise(resolve => window.setTimeout(resolve, 80)));

  constructor(url: string, kind: 'image' | 'video') { this.url = url; this.kind = kind; }

  private run<T>(task: () => Promise<T>) {
    const next = this.pending.then(task);
    this.pending = next.catch(() => {});
    return next;
  }

  private isActive(active: () => boolean) { return !this.disposed && !document.hidden && active(); }

  snapshot(shader: SavedShader, signal: AbortSignal) {
    const { key, code, values } = thumbnailIdentity(shader);
    const known = this.cache.get(key);
    if (known) return Promise.resolve(known);
    return this.queue.request(key, signal, active => this.run(async () => {
      const isActive = () => this.isActive(active);
      if (!isActive()) return null;
      const image = await (this.source ??= loadShaderPreviewSource(this.url, this.kind));
      if (!image || !isActive()) return null;
      const src = await renderShaderPreviewToDataUrl(code, values, image, null, this.renderer, {
        strict: true, isActive, preserveSourceAspectRatio: true, maxEdge: 192,
      });
      if (src && isActive()) {
        this.cache.set(key, src);
        if (this.cache.size > 48) this.cache.delete(this.cache.keys().next().value!);
      }
      return src;
    }));
  }

  frame(shader: SavedShader, timeSeconds: number, active: () => boolean) {
    return this.run(async () => {
      const isActive = () => this.isActive(active);
      if (!isActive()) return null;
      const image = await (this.source ??= loadShaderPreviewSource(this.url, this.kind));
      if (!image || !isActive()) return null;
      const { code, values } = thumbnailIdentity(shader);
      return renderShaderPreviewFrame(code, values, image, this.renderer, {
        strict: true, isActive, timeSeconds, preserveSourceAspectRatio: true, maxEdge: 192,
      });
    });
  }

  dispose() {
    this.disposed = true;
    destroyShaderPreviewRenderer(this.renderer.current);
    this.renderer.current = null;
    this.cache.clear();
    this.source = null;
  }
}
