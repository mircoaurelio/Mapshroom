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
  const [snapshot, setSnapshot] = useState<{ key: string; url: string | null } | null>(null);
  const [imageState, setImageState] = useState<{
    key: string;
    src: string;
    status: 'ready' | 'error';
  } | null>(null);
  const src = bundled ?? (snapshot?.key === key ? snapshot.url : null);
  const currentImageState = imageState?.key === key && imageState.src === src ? imageState.status : null;
  const unavailable = !shader || currentImageState === 'error' ||
    (!bundled && snapshot?.key === key && snapshot.url === null);
  const ready = currentImageState === 'ready';
  const name = shader?.name ?? 'Shader';
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
        void requestShaderThumbnail(currentShader, signal).catch(() => null).then(url => {
          if (!signal.aborted) setSnapshot({ key, url });
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
  return (
    <span ref={host} className={`shader-thumbnail ${className}`} aria-busy={!ready && !unavailable}>
      {src && !unavailable ? (
        <img
          key={key}
          src={src}
          alt={`${name} preview`}
          className={ready ? 'shader-thumbnail-image-ready' : 'shader-thumbnail-image-pending'}
          aria-hidden={!ready}
          width={THUMBNAIL_WIDTH}
          height={THUMBNAIL_HEIGHT}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setImageState({ key, src, status: 'ready' })}
          onError={() => setImageState({ key, src, status: 'error' })}
        />
      ) : null}
      {!ready && (
        <span
          className="shader-thumbnail-state"
          role={unavailable ? 'img' : 'status'}
          aria-label={unavailable ? `${name} preview unavailable` : `Loading ${name} preview`}
          title={unavailable ? 'Preview unavailable' : undefined}
        >
          {unavailable ? (
            <svg viewBox="0 0 24 24" className="shader-thumbnail-unavailable" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m3 3 18 18M4 17l5-5 4 4M15 8h.01" />
            </svg>
          ) : <span className="shader-thumbnail-spinner" aria-hidden="true" />}
        </span>
      )}
    </span>
  );
}
