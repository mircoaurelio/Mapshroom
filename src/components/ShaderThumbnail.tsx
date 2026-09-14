import { useEffect, useRef, useState } from 'react';
import type { SavedShader } from '../types';
import { bundledShaderThumbnail, requestShaderThumbnail, thumbnailIdentity } from '../lib/shaderThumbnails';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../lib/shaderThumbnailKey';
import './ShaderThumbnail.css';

export function ShaderThumbnail({ shader, className = '' }: { shader: SavedShader | undefined; className?: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const shaderRef = useRef(shader);
  useEffect(() => { shaderRef.current = shader; }, [shader]);
  const key = shader ? thumbnailIdentity(shader).key : '';
  const bundled = bundledShaderThumbnail(key);
  const [snapshot, setSnapshot] = useState<{ key: string; url: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const src = bundled ?? (snapshot?.key === key ? snapshot.url : null);
  useEffect(() => {
    if (!key || bundled || !host.current) return;
    let controller: AbortController | null = null;
    let timer: number | undefined;
    const start = () => {
      if (controller || timer !== undefined) return;
      // Coalesce slider and code edits before doing any custom-shader work.
      timer = window.setTimeout(() => {
        timer = undefined;
        const currentShader = shaderRef.current;
        if (!currentShader) return;
        controller = new AbortController();
        const signal = controller.signal;
        void requestShaderThumbnail(currentShader, signal).then(url => {
          if (url && !signal.aborted) setSnapshot({ key, url });
        });
      }, 400);
    };
    const stop = () => { window.clearTimeout(timer); timer = undefined; controller?.abort(); controller = null; };
    if (!('IntersectionObserver' in window)) { start(); return stop; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) start(); else stop();
    }, { rootMargin: '80px' });
    observer.observe(host.current);
    return () => { stop(); observer.disconnect(); };
  }, [key, bundled]);
  const hue = parseInt(key.slice(0, 4) || '0', 16) % 360;
  return <span ref={host} className={`shader-thumbnail ${className}`}>
    {src && failed !== src ? <img src={src} alt={`${shader?.name ?? 'Shader'} preview`}
      width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(src)} />
      : <span className="shader-thumbnail-fallback" style={{ background: `repeating-radial-gradient(ellipse at ${25 + hue % 50}% 45%, hsl(${hue} 48% 32%) 0 4px, #101114 6px 14px)` }}
        role="img" aria-label={`${shader?.name ?? 'Shader'} — snapshot unavailable`} />}
  </span>;
}
