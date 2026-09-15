import { useEffect, useRef, useState } from 'react';
import type { SavedShader } from '../types';
import { thumbnailIdentity } from '../lib/shaderThumbnails';
import type { ShaderImagePreviewSession } from '../lib/shaderImagePreviewSession';

export function ShaderImageThumbnail({ shader, session, active, animationPending }: {
  shader: SavedShader;
  session: ShaderImagePreviewSession;
  active: boolean;
  animationPending: boolean;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const animationHost = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => !document.hidden);
  const [snapshot, setSnapshot] = useState<{ session: ShaderImagePreviewSession; key: string; src: string | null } | null>(null);
  const [animationError, setAnimationError] = useState(false);
  const key = thumbnailIdentity(shader).key;
  const current = snapshot?.session === session && snapshot.key === key ? snapshot : null;

  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(host.current);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    if (!visible || !documentVisible || animationPending || current) return;
    const controller = new AbortController();
    void session.snapshot(shader, controller.signal).catch(() => null).then(src => {
      if (!controller.signal.aborted) setSnapshot({ session, key, src });
    });
    return () => controller.abort();
  }, [session, shader, key, visible, documentVisible, animationPending, current]);

  useEffect(() => {
    const target = animationHost.current;
    if (!active || !visible || !documentVisible || !target) return;
    let disposed = false;
    let timer: number;
    let slowFrames = 0;
    let frames = 0;
    const startedAt = performance.now();
    const render = async () => {
      const frameStart = performance.now();
      try {
        const canvas = await session.frame(shader, 1.6 + (frameStart - startedAt) / 1000, () => !disposed);
        if (disposed || !canvas) return;
        canvas.setAttribute('aria-label', `${shader.name} animated preview on your image`);
        canvas.setAttribute('role', 'img');
        if (canvas.parentElement !== target) target.replaceChildren(canvas);
        // If even this small preview stalls the browser, hold its last frame.
        const duration = performance.now() - frameStart;
        if (frames++ > 0) slowFrames = duration > 50 ? slowFrames + 1 : 0;
        if (slowFrames >= 3) return;
        timer = window.setTimeout(() => void render(), Math.max(0, 125 - duration));
      } catch { if (!disposed) setAnimationError(true); }
    };
    timer = window.setTimeout(() => { setAnimationError(false); void render(); }, 180);
    return () => { disposed = true; window.clearTimeout(timer); target.replaceChildren(); };
  }, [session, shader, active, visible, documentVisible]);

  const unavailable = current?.src === null || (active && animationError);
  return <span ref={host} className="shader-thumbnail shader-image-thumbnail" aria-busy={!current && !active}>
    {current?.src && <img src={current.src} alt={`${shader.name} preview on your image`} draggable={false} />}
    {!current?.src && <span className="shader-thumbnail-state" role="status">{unavailable ? 'Preview unavailable' : <span className="shader-thumbnail-spinner" aria-label="Loading image preview" />}</span>}
    <span ref={animationHost} className="shader-image-animation" />
  </span>;
}
