import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export const PROJECT_READY_EVENT = 'mapshroom:project-ready';

const BRAND_LETTERS = ['M', 'a', 'p', 's', 'h', 'r', 'o', 'o', 'm'] as const;
const LETTER_STAGGER_MS = 28;
const LETTER_REVEAL_MS = 70;
const FADE_AFTER_REVEAL_MS = BRAND_LETTERS.length * LETTER_STAGGER_MS + 120;

export function signalProjectReady() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(PROJECT_READY_EVENT));
}

function LoadingBrandLockup() {
  return (
    <div className="loading-brand-lockup">
      <img
        className="loading-brand-logo"
        src={`${import.meta.env.BASE_URL}assets/icons/mapshroom-icon-transparent-512.png`}
        alt=""
      />
      <span className="loading-brand-name" aria-hidden="true">
        {BRAND_LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={`loading-brand-letter ${index < 3 ? 'loading-brand-letter-accent' : ''}`}
            style={{
              animationDelay: `${index * LETTER_STAGGER_MS}ms`,
              animationDuration: `${LETTER_REVEAL_MS}ms`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    </div>
  );
}

type BootPhase = 'loading' | 'fading' | 'gone';

export function BootScreenController() {
  const location = useLocation();
  const [phase, setPhase] = useState<BootPhase>('loading');
  const isWorkspace = location.pathname === '/';

  useEffect(() => {
    if (phase === 'gone') {
      return;
    }

    if (!isWorkspace) {
      setPhase('gone');
    }
  }, [isWorkspace, phase]);

  useEffect(() => {
    if (phase !== 'loading') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const beginFade = () => {
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
        <LoadingBrandLockup />
      </div>
    </div>,
    document.body,
  );
}
