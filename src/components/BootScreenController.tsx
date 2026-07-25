import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { PROJECT_READY_EVENT, signalBootExitStarted } from '../lib/bootFlow';
import {
  BRAND_REVEAL_DURATION_MS,
  MapshroomBrandLockup,
} from './MapshroomBrandLockup';

const BRAND_HOLD_MS = 420;
const MINIMUM_INTRO_MS = BRAND_REVEAL_DURATION_MS + BRAND_HOLD_MS;

type BootPhase = 'loading' | 'fading' | 'gone';

export function BootScreenController() {
  const location = useLocation();
  const [phase, setPhase] = useState<BootPhase>('loading');
  const introStartedAtRef = useRef<number | null>(null);
  const isWorkspace = location.pathname === '/';

  useEffect(() => {
    if (phase !== 'loading') {
      return;
    }

    introStartedAtRef.current ??= performance.now();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const beginFade = () => {
      signalBootExitStarted();

      if (prefersReducedMotion) {
        setPhase('gone');
        return;
      }
      setPhase('fading');
    };

    let fadeTimeoutId = 0;
    const beginFadeAfterIntro = () => {
      window.clearTimeout(fadeTimeoutId);
      const elapsedMs = performance.now() - (introStartedAtRef.current ?? 0);
      fadeTimeoutId = window.setTimeout(
        beginFade,
        Math.max(0, MINIMUM_INTRO_MS - elapsedMs),
      );
    };

    if (!isWorkspace) {
      beginFadeAfterIntro();
      return () => window.clearTimeout(fadeTimeoutId);
    }

    window.addEventListener(PROJECT_READY_EVENT, beginFadeAfterIntro);
    return () => {
      window.removeEventListener(PROJECT_READY_EVENT, beginFadeAfterIntro);
      window.clearTimeout(fadeTimeoutId);
    };
  }, [isWorkspace, phase]);

  if (phase === 'gone' || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`loading-screen loading-screen-boot-overlay ${
        phase === 'fading' ? 'loading-screen-boot-overlay-fading' : ''
      }`}
      role="status"
      aria-label="Mapshroom is opening"
      aria-hidden={phase === 'fading'}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === 'opacity' &&
          phase === 'fading'
        ) {
          setPhase('gone');
        }
      }}
    >
      <div className="loading-screen-card">
        <MapshroomBrandLockup />
      </div>
    </div>,
    document.body,
  );
}
