import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { PROJECT_READY_EVENT, signalBootExitStarted } from '../lib/bootFlow';
import { MapshroomBrandLockup } from './MapshroomBrandLockup';

const BRAND_LETTER_COUNT = 9;
const LETTER_STAGGER_MS = 28;
const FADE_AFTER_REVEAL_MS = BRAND_LETTER_COUNT * LETTER_STAGGER_MS + 120;

type BootPhase = 'loading' | 'fading' | 'gone';

export function BootScreenController() {
  const location = useLocation();
  const [phase, setPhase] = useState<BootPhase>('loading');
  const isWorkspace = location.pathname === '/';

  useEffect(() => {
    if (phase === 'gone') {
      return;
    }

    if (isWorkspace) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPhase('gone'), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isWorkspace, phase]);

  useEffect(() => {
    if (phase !== 'loading') {
      return;
    }

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
    const onProjectReady = () => {
      window.clearTimeout(fadeTimeoutId);
      fadeTimeoutId = window.setTimeout(beginFade, FADE_AFTER_REVEAL_MS);
    };

    window.addEventListener(PROJECT_READY_EVENT, onProjectReady);
    return () => {
      window.removeEventListener(PROJECT_READY_EVENT, onProjectReady);
      window.clearTimeout(fadeTimeoutId);
    };
  }, [phase]);

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
