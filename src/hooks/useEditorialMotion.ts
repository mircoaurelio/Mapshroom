import { useEffect, useRef } from 'react';

type EditorialRoot = HTMLElement;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function useEditorialMotion<T extends EditorialRoot>() {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group]'),
    );
    const marketStory = root.querySelector<HTMLElement>('[data-market-story]');

    root.classList.add('has-editorial-motion');

    const applyMarketProgress = (progress: number) => {
      if (!marketStory) return;

      const expansion = clamp((progress - 0.1) / 0.78, 0, 1);
      const easedExpansion = expansion * expansion * (3 - 2 * expansion);
      const potentialOpacity = clamp((expansion - 0.04) / 0.24, 0, 1);
      const potentialPeopleOpacity = clamp((expansion - 0.58) / 0.24, 0, 1);
      const potentialLabelOpacity = clamp((expansion - 0.62) / 0.22, 0, 1);
      const professionalPeopleOpacity =
        1 - clamp((expansion - 0.3) / 0.32, 0, 1) * 0.82;
      const compactMarket = window.innerWidth <= 760;
      const professionalShiftX = compactMarket ? -68 : -132;
      const professionalShiftY = compactMarket ? -64 : -118;
      const bridgeShiftX = compactMarket ? -98 : -210;
      const bridgeStartY = compactMarket ? 136 : 180;
      const bridgeTravelY = compactMarket ? 115 : 205;

      marketStory.style.setProperty('--market-progress', `${progress}`);
      marketStory.style.setProperty(
        '--market-professional-scale',
        `${1 - easedExpansion * 0.5}`,
      );
      marketStory.style.setProperty(
        '--market-professional-x',
        `${easedExpansion * professionalShiftX}px`,
      );
      marketStory.style.setProperty(
        '--market-professional-y',
        `${easedExpansion * professionalShiftY}px`,
      );
      marketStory.style.setProperty(
        '--market-professional-people-opacity',
        `${professionalPeopleOpacity}`,
      );
      marketStory.style.setProperty(
        '--market-potential-scale',
        `${0.18 + easedExpansion * 0.82}`,
      );
      marketStory.style.setProperty('--market-potential-opacity', `${potentialOpacity}`);
      marketStory.style.setProperty(
        '--market-potential-people-opacity',
        `${potentialPeopleOpacity}`,
      );
      marketStory.style.setProperty(
        '--market-potential-label-opacity',
        `${potentialLabelOpacity}`,
      );
      marketStory.style.setProperty(
        '--market-bridge-x',
        `${easedExpansion * bridgeShiftX}px`,
      );
      marketStory.style.setProperty(
        '--market-bridge-y',
        `${bridgeStartY - easedExpansion * bridgeTravelY}px`,
      );
      marketStory.dataset.marketPhase = expansion > 0.56 ? 'expanded' : 'professional';
    };

    if (reducedMotion) {
      revealTargets.forEach((target) => target.classList.add('is-in-view'));
      applyMarketProgress(1);
      return () => {
        root.classList.remove('has-editorial-motion');
        marketStory?.removeAttribute('data-market-phase');
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    revealTargets.forEach((target) => observer.observe(target));

    const hero = root.querySelector<HTMLElement>('[data-scroll-hero]');
    let animationFrame = 0;

    const updateScrollMotion = () => {
      animationFrame = 0;
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        const progress = clamp(-heroRect.top / Math.max(heroRect.height * 0.8, 1), 0, 1);

        root.style.setProperty('--editorial-hero-shift', `${progress * -28}px`);
        root.style.setProperty('--editorial-visual-shift', `${progress * 18}px`);
        root.style.setProperty('--editorial-visual-scale', `${1 + progress * 0.025}`);
        root.style.setProperty('--editorial-hero-opacity', `${1 - progress * 0.24}`);
      }

      if (marketStory) {
        const storyRect = marketStory.getBoundingClientRect();
        const scrollDistance = Math.max(
          storyRect.height - window.innerHeight * 0.72,
          window.innerHeight,
        );
        const marketProgress = clamp((110 - storyRect.top) / scrollDistance, 0, 1);
        applyMarketProgress(marketProgress);
      }
    };

    const requestScrollUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateScrollMotion);
    };

    updateScrollMotion();
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', requestScrollUpdate);
      window.removeEventListener('resize', requestScrollUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      root.classList.remove('has-editorial-motion');
      root.style.removeProperty('--editorial-hero-shift');
      root.style.removeProperty('--editorial-visual-shift');
      root.style.removeProperty('--editorial-visual-scale');
      root.style.removeProperty('--editorial-hero-opacity');
      marketStory?.removeAttribute('data-market-phase');
    };
  }, []);

  return rootRef;
}
