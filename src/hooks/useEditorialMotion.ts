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
      const compactMarket = window.innerWidth <= 760;
      const professionalShiftX = compactMarket ? -68 : -132;
      const professionalShiftY = compactMarket ? -64 : -118;
      const initialPotentialScale = compactMarket ? 0.32 : 0.18;
      const initialPotentialX = compactMarket ? 70 : 104;
      const initialPotentialY = compactMarket ? 68 : 98;
      const potentialScale =
        initialPotentialScale + easedExpansion * (1 - initialPotentialScale);
      const visibleValueSize = compactMarket
        ? 34 + easedExpansion * 14
        : 42 + easedExpansion * 26;
      const professionalCoverage = clamp((easedExpansion - 0.08) / 0.24, 0, 1);
      const growthThresholds = [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.6];
      let growthStep = 0;

      growthThresholds.forEach((threshold, index) => {
        if (easedExpansion >= threshold) growthStep = index;
      });

      marketStory.style.setProperty('--market-expansion', `${expansion}`);
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
        '--market-professional-fill',
        `rgba(217, 221, 38, ${professionalCoverage * 0.9})`,
      );
      marketStory.style.setProperty(
        '--market-potential-scale',
        `${potentialScale}`,
      );
      marketStory.style.setProperty(
        '--market-potential-x',
        `${(1 - easedExpansion) * initialPotentialX}px`,
      );
      marketStory.style.setProperty(
        '--market-potential-y',
        `${(1 - easedExpansion) * initialPotentialY}px`,
      );
      marketStory.style.setProperty(
        '--market-value-x',
        `${50 + easedExpansion * 10}%`,
      );
      marketStory.style.setProperty(
        '--market-value-y',
        `${50 - easedExpansion * 21}%`,
      );
      marketStory.style.setProperty(
        '--market-value-size',
        `${visibleValueSize / potentialScale}px`,
      );
      marketStory.style.setProperty('--market-potential-opacity', '1');
      marketStory.dataset.marketStep = `${growthStep}`;
      marketStory.dataset.marketPhase = expansion > 0.56 ? 'expanded' : 'professional';
    };

    if (reducedMotion) {
      revealTargets.forEach((target) => target.classList.add('is-in-view'));
      applyMarketProgress(1);
      return () => {
        root.classList.remove('has-editorial-motion');
        marketStory?.removeAttribute('data-market-phase');
        marketStory?.removeAttribute('data-market-step');
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
      marketStory?.removeAttribute('data-market-step');
    };
  }, []);

  return rootRef;
}
