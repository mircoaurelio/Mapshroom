import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  resolveWhyLocale,
  type AudienceIconName,
  type WhyLocale,
  WHY_COPY,
} from '../lib/whyCopy';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import '../styles/EditorialMotion.css';
import './WhyRoute.css';

const SOURCE_URL = 'https://github.com/mircoaurelio/Mapshroom';

function isWhyLocale(value: string | null): value is WhyLocale {
  return value === 'en' || value === 'it';
}

function AudienceIcon({ name }: { name: AudienceIconName }) {
  const content = {
    events: (
      <>
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M8 3v6M16 3v6M4 11h16M8 15h3" />
      </>
    ),
    shops: (
      <>
        <path d="M4 10h16l-2-6H6l-2 6Z" />
        <path d="M5 10v10h14V10M9 20v-6h6v6M4 10c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0" />
      </>
    ),
    artists: (
      <>
        <path d="m5 19 3.5-1 9-9-2.5-2.5-9 9L5 19Z" />
        <path d="m13.5 8 2.5 2.5M14 5l2-2 5 5-2 2" />
      </>
    ),
    culture: (
      <>
        <path d="m3 9 9-5 9 5H3ZM5 20h14M7 9v8M12 9v8M17 9v8M4 17h16" />
      </>
    ),
    creators: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </>
    ),
    coders: (
      <>
        <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
      </>
    ),
  }[name];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {content}
    </svg>
  );
}

export function WhyRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLocale = searchParams.get('lang');
  const [locale, setLocale] = useState<WhyLocale>(() =>
    isWhyLocale(requestedLocale) ? requestedLocale : resolveWhyLocale(),
  );
  const motionRef = useEditorialMotion<HTMLElement>();
  const copy = WHY_COPY[locale];

  useEffect(() => {
    document.body.classList.add('why-page-active');
    document.title = copy.documentTitle;
    document.documentElement.lang = locale;
    window.scrollTo(0, 0);

    return () => {
      document.body.classList.remove('why-page-active');
      document.title = 'Mapshroom';
    };
  }, [copy.documentTitle, locale]);

  const changeLocale = (nextLocale: WhyLocale) => {
    setLocale(nextLocale);
    setSearchParams({ lang: nextLocale }, { replace: true });
  };

  const scrollToManifesto = () => {
    document.getElementById('manifesto')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <main ref={motionRef} className="why-page" lang={locale}>
      <nav className="why-nav">
        <Link to="/" className="why-brand" aria-label="Mapshroom">
          <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
        </Link>
        <div className="why-nav-links">
          <button type="button" className="why-nav-anchor" onClick={scrollToManifesto}>
            {copy.navManifesto}
          </button>
          <Link to="/tutorial">{copy.navTutorial}</Link>
          <div className="why-language-switch" aria-label={copy.languageLabel}>
            {(['it', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={locale === option ? 'active' : ''}
                aria-pressed={locale === option}
                onClick={() => changeLocale(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/" className="why-open-button">{copy.navOpenWorkspace}</Link>
        </div>
      </nav>

      <header className="why-hero" data-scroll-hero>
        <div className="why-hero-copy">
          <p className="why-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heroTitle}<br /><em>{copy.heroEmphasis}</em></h1>
          <p className="why-hero-lead">{copy.heroLead}</p>
          <p className="why-hero-note">{copy.heroNote}</p>
          <button type="button" className="why-primary-button" onClick={scrollToManifesto}>
            {copy.heroCta}
          </button>
        </div>
        <figure
          className="why-hero-visual why-hero-visual-desktop"
          aria-label={copy.desktopVisualAria}
        >
          <img
            className="why-hero-before"
            src="assets/onboarding/photo-source-garden.webp"
            alt=""
          />
          <img
            className="why-hero-after"
            src="assets/onboarding/photo-3d-asset-choice.webp"
            alt=""
          />
          <span className="why-before-label">{copy.beforeLabel}</span>
          <span className="why-after-label">{copy.afterLabel}</span>
          <i aria-hidden="true" />
          <figcaption>{copy.visualCaption}</figcaption>
        </figure>
        <figure
          className="why-hero-visual why-hero-visual-mobile"
          aria-label={copy.visualAria}
        >
          <div className="why-visual-steps">
            {[
              'assets/onboarding/photo-source-garden.webp',
              'assets/onboarding/photo-background-removed.webp',
              'assets/onboarding/photo-3d-asset-choice.webp',
            ].map((src, index) => (
              <div key={src}>
                <img src={src} alt="" />
                <span>
                  <i>{copy.visualSteps[index].number}</i>
                  {copy.visualSteps[index].label}
                </span>
              </div>
            ))}
          </div>
          <figcaption>
            <span>{copy.visualCaption}</span>
            <strong>{copy.visualMission}</strong>
          </figcaption>
        </figure>
      </header>

      <section
        className="why-principles"
        aria-label={copy.principlesLabel}
        data-reveal-group
      >
        {copy.principles.map((principle, index) => (
          <div key={principle.value}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{principle.value}</strong>
            <small>{principle.label}</small>
          </div>
        ))}
      </section>

      <div id="manifesto" className="why-manifesto">
        <section className="why-section why-setup">
          <div className="why-section-heading" data-reveal>
            <p className="why-kicker">{copy.setup.kicker}</p>
            <h2>{copy.setup.title}</h2>
            <p>{copy.setup.body}</p>
          </div>
          <div className="why-setup-metric" data-reveal>
            <span>{copy.setup.metricLabel}</span>
            <strong>{copy.setup.metricValue}</strong>
          </div>
          <div className="why-setup-flow" data-reveal-group>
            {copy.setup.steps.map((step, index) => (
              <div key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
          <p className="why-setup-direction" data-reveal>{copy.setup.direction}</p>
        </section>

        <section className="why-section why-freedom">
          <div className="why-section-heading" data-reveal>
            <p className="why-kicker">{copy.freedom.kicker}</p>
            <h2>{copy.freedom.title}</h2>
          </div>
          <div className="why-body-copy" data-reveal>
            {copy.freedom.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <blockquote data-reveal="right">{copy.freedom.quote}</blockquote>
        </section>

        <section className="why-section why-audience">
          <div className="why-section-heading" data-reveal>
            <p className="why-kicker">{copy.audience.kicker}</p>
            <h2>{copy.audience.title}</h2>
            <p>{copy.audience.intro}</p>
          </div>
          <div
            className="why-audience-story"
            data-market-story
            aria-label={copy.audience.storyAria}
          >
            <div className="why-story-narrative">
              <article className="why-story-chapter why-story-professions" data-reveal>
                <div className="why-story-copy">
                  <p>{copy.audience.professions.kicker}</p>
                  <h3>{copy.audience.professions.title}</h3>
                  <p>{copy.audience.professions.body}</p>
                  <strong>{copy.audience.professions.statement}</strong>
                </div>
                <div className="why-story-profession-list" data-reveal-group>
                  {copy.audience.cards.map((card, index) => (
                    <div key={card.title}>
                      <span className="why-story-icon"><AudienceIcon name={card.icon} /></span>
                      <small>{String(index + 1).padStart(2, '0')}</small>
                      <strong>{card.title}</strong>
                      <p>{card.body}</p>
                    </div>
                  ))}
                </div>
                <span className="why-story-scroll-cue">{copy.audience.scrollCue} ↓</span>
              </article>

              <article className="why-story-chapter why-story-potential" data-reveal>
                <div className="why-story-copy">
                  <p>{copy.audience.market.kicker}</p>
                  <h3>{copy.audience.market.title}</h3>
                  <p>{copy.audience.market.body}</p>
                  <strong>{copy.audience.market.thesis}</strong>
                </div>
              </article>
            </div>

            <div className="why-story-visual-column">
              <div className="why-story-sticky">
                <div className="why-story-stage" role="img" aria-label={copy.audience.mapAria}>
                  <div className="why-story-professional-circle" aria-hidden="true">
                    <strong>{copy.audience.market.mappingLabel}</strong>
                    <div className="why-story-professional-people">
                      {copy.audience.cards.map((card) => (
                        <span key={card.title}>
                          <AudienceIcon name={card.icon} />
                          {card.title}
                        </span>
                      ))}
                    </div>
                    <div className="why-story-niche">
                      <b>{copy.audience.nicheValue}</b>
                      <small>{copy.audience.nicheLabel}</small>
                    </div>
                  </div>

                  <div className="why-story-potential-circle" aria-hidden="true">
                    <strong>{copy.audience.market.potentialLabel}</strong>
                    <div className="why-story-potential-people">
                      {copy.audience.potentialCards.map((card) => (
                        <span key={card.title}>
                          <AudienceIcon name={card.icon} />
                          {card.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="why-story-bridge" aria-hidden="true">
                    {copy.audience.market.bridgeLabel}
                  </span>
                  <div className="why-story-progress" aria-hidden="true"><i /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="why-section why-return">
          <div className="why-return-copy" data-reveal="left">
            <p className="why-kicker">{copy.return.kicker}</p>
            <h2>{copy.return.title}</h2>
            {copy.return.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <blockquote>{copy.return.quote}</blockquote>
          </div>
          <div
            className="why-loop"
            role="img"
            aria-label={copy.return.loopAria}
            data-reveal="scale"
          >
            <div className="why-loop-ring" aria-hidden="true">
              {copy.return.loop.map((item, index) => (
                <span key={item} style={{ '--loop-index': index } as React.CSSProperties}>
                  <i>{String(index + 1).padStart(2, '0')}</i>{item}
                </span>
              ))}
              <strong>{copy.return.loopCenter.split('\n').map((line) => <b key={line}>{line}</b>)}</strong>
            </div>
          </div>
        </section>

        <section className="why-section why-bet">
          <div className="why-section-heading" data-reveal="left">
            <p className="why-kicker">{copy.bet.kicker}</p>
            <h2>{copy.bet.title}</h2>
            <p>{copy.bet.bodyBefore}<strong>{copy.bet.bodyStrong}</strong>{copy.bet.bodyAfter}</p>
          </div>
          <aside className="why-price" data-reveal="right">
            <strong>{copy.bet.price}</strong>
            <span>{copy.bet.priceLabel}</span>
          </aside>
        </section>

        <section className="why-section why-outcomes">
          <div className="why-section-heading" data-reveal>
            <p className="why-kicker">{copy.outcomes.kicker}</p>
            <h2>{copy.outcomes.title}</h2>
            <p>{copy.outcomes.intro}</p>
          </div>
          <div className="why-outcome-grid" data-reveal-group>
            {copy.outcomes.items.map((item) => (
              <article key={item.number}>
                <span>{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="why-closing" data-reveal-group>
        <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
        <p>{copy.closing.kicker}</p>
        <h2>{copy.closing.title}</h2>
        <p className="why-closing-lead">{copy.closing.lead}</p>
        <div className="why-closing-actions">
          <Link to="/" className="why-primary-button">{copy.closing.openWorkspace}</Link>
          <Link to="/tutorial" className="why-secondary-button">{copy.closing.readTutorial}</Link>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="why-text-link">
            {copy.closing.viewSource} ↗
          </a>
        </div>
      </section>

      <footer className="why-footer">
        <span>Mapshroom</span>
        <span>{copy.footerTagline}</span>
        <Link to="/">{copy.footerWorkspace}</Link>
      </footer>
    </main>
  );
}
