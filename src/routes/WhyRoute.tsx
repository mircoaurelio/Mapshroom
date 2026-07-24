import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resolveWhyLocale, type WhyLocale, WHY_COPY } from '../lib/whyCopy';
import './WhyRoute.css';

const SOURCE_URL = 'https://github.com/mircoaurelio/Mapshroom';

function isWhyLocale(value: string | null): value is WhyLocale {
  return value === 'en' || value === 'it';
}

export function WhyRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLocale = searchParams.get('lang');
  const [locale, setLocale] = useState<WhyLocale>(() =>
    isWhyLocale(requestedLocale) ? requestedLocale : resolveWhyLocale(),
  );
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

  return (
    <main className="why-page" lang={locale}>
      <nav className="why-nav">
        <Link to="/" className="why-brand" aria-label="Mapshroom">
          <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
        </Link>
        <div className="why-nav-links">
          <a href="#manifesto">{copy.navManifesto}</a>
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

      <header className="why-hero">
        <div className="why-hero-copy">
          <p className="why-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heroTitle}<br /><em>{copy.heroEmphasis}</em></h1>
          <p className="why-hero-lead">{copy.heroLead}</p>
          <p className="why-hero-note">{copy.heroNote}</p>
          <a href="#manifesto" className="why-primary-button">{copy.heroCta}</a>
        </div>
        <figure className="why-hero-visual">
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
      </header>

      <section className="why-principles" aria-label={copy.principlesLabel}>
        {copy.principles.map((principle, index) => (
          <div key={principle.value}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{principle.value}</strong>
            <small>{principle.label}</small>
          </div>
        ))}
      </section>

      <div id="manifesto" className="why-manifesto">
        <section className="why-section why-freedom">
          <div className="why-section-heading">
            <p className="why-kicker">{copy.freedom.kicker}</p>
            <h2>{copy.freedom.title}</h2>
          </div>
          <div className="why-body-copy">
            {copy.freedom.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <blockquote>{copy.freedom.quote}</blockquote>
        </section>

        <section className="why-section why-audience">
          <div className="why-section-heading">
            <p className="why-kicker">{copy.audience.kicker}</p>
            <h2>{copy.audience.title}</h2>
            <p>{copy.audience.intro}</p>
          </div>
          <div className="why-audience-layout">
            <aside className="why-five-percent">
              <strong>{copy.audience.nicheValue}</strong>
              <span>{copy.audience.nicheLabel}</span>
            </aside>
            <div className="why-audience-grid">
              {copy.audience.cards.map((card, index) => (
                <article key={card.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="why-section why-return">
          <div className="why-return-copy">
            <p className="why-kicker">{copy.return.kicker}</p>
            <h2>{copy.return.title}</h2>
            {copy.return.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <blockquote>{copy.return.quote}</blockquote>
          </div>
          <div className="why-loop" role="img" aria-label={copy.return.loopAria}>
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

        <section className="why-section why-setup">
          <div className="why-section-heading">
            <p className="why-kicker">{copy.setup.kicker}</p>
            <h2>{copy.setup.title}</h2>
            <p>{copy.setup.body}</p>
          </div>
          <div className="why-setup-metric">
            <span>{copy.setup.metricLabel}</span>
            <strong>{copy.setup.metricValue}</strong>
          </div>
          <div className="why-setup-flow">
            {copy.setup.steps.map((step, index) => (
              <div key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
          <p className="why-setup-direction">{copy.setup.direction}</p>
        </section>

        <section className="why-section why-bet">
          <div className="why-section-heading">
            <p className="why-kicker">{copy.bet.kicker}</p>
            <h2>{copy.bet.title}</h2>
            <p>{copy.bet.bodyBefore}<strong>{copy.bet.bodyStrong}</strong>{copy.bet.bodyAfter}</p>
          </div>
          <aside className="why-price">
            <strong>{copy.bet.price}</strong>
            <span>{copy.bet.priceLabel}</span>
            <i aria-hidden="true" />
          </aside>
        </section>

        <section className="why-section why-outcomes">
          <div className="why-section-heading">
            <p className="why-kicker">{copy.outcomes.kicker}</p>
            <h2>{copy.outcomes.title}</h2>
            <p>{copy.outcomes.intro}</p>
          </div>
          <div className="why-outcome-grid">
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

      <section className="why-closing">
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
