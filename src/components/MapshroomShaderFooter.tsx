import { type ReactNode, useEffect, useRef, useState } from 'react';
import { MapshroomShaderBackdrop } from './OnboardingWelcomeShader';
import './MapshroomShaderFooter.css';

interface MapshroomShaderFooterProps {
  children: ReactNode;
  className: string;
}

export function MapshroomShaderFooter({
  children,
  className,
}: MapshroomShaderFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [shaderActive, setShaderActive] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) {
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
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className={`${className} mapshroom-shader-footer`}>
      {children}
      <MapshroomShaderBackdrop
        active={shaderActive}
        continuous
        className="mapshroom-shader-footer-backdrop"
      />
    </footer>
  );
}
