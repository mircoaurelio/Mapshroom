import { useEffect, useRef, useState } from 'react';

export function useShaderVisibility<T extends HTMLElement>() {
  const surfaceRef = useRef<T | null>(null);
  const [shaderActive, setShaderActive] = useState(false);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      const animationFrameId = window.requestAnimationFrame(() => {
        setShaderActive(true);
      });
      return () => window.cancelAnimationFrame(animationFrameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShaderActive(entry.isIntersecting),
      {
        rootMargin: '120px 0px',
        threshold: 0.08,
      },
    );
    observer.observe(surface);

    return () => observer.disconnect();
  }, []);

  return [surfaceRef, shaderActive] as const;
}
