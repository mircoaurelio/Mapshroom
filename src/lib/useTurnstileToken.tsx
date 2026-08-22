import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mapshroom-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.mapshroomTurnstile = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(script);
  });
  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onReady: () => void;
  registerReset: (reset: () => void) => void;
};

export function TurnstileWidget({
  siteKey,
  onToken,
  onReady,
  registerReset,
}: TurnstileWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!siteKey || !host) {
      onReady();
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !host) {
          onReady();
          return;
        }
        widgetId = window.turnstile.render(host, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (value) => onToken(value),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
        registerReset(() => {
          if (widgetId && window.turnstile) {
            window.turnstile.reset(widgetId);
          }
        });
        onReady();
      })
      .catch(() => {
        onReady();
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey, onToken, onReady, registerReset]);

  return <div ref={hostRef} className="growth-turnstile" />;
}
