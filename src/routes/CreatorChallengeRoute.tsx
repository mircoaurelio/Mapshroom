import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapshroomShaderFooter } from '../components/MapshroomShaderFooter';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import '../styles/EditorialMotion.css';
import './CreatorChallengeRoute.css';

type CreatorLocale = 'en' | 'it';

const INSTAGRAM_URL = 'https://www.instagram.com/mirco.aurelio/';

const COPY = {
  en: {
    documentTitle: 'Up to $50 in Mapshroom Credits | Creator Challenge',
    description:
      'Post your Mapshroom process as a YouTube Short or Instagram Reel with #mapshroom. Reach more than 4,000 public views to qualify for up to $50 in Mapshroom credits.',
    navHow: 'How it works',
    navTutorial: 'Tutorial',
    navOpen: 'Open Mapshroom',
    languageLabel: 'Choose language',
    eyebrow: 'Mapshroom Creator Challenge',
    titleBefore: 'Go viral.',
    titleAccent: 'Earn up to $50 in credits.',
    lead:
      'Show your full Mapshroom process with #mapshroom. Reach more than 4,000 public views to qualify for up to $50 in credits for your Mapshroom account.',
    platformsLabel: 'Publish on',
    youtubeFormat: 'YouTube Shorts',
    instagramFormat: 'Instagram Reels',
    heroCta: 'See what to film',
    instagramCta: 'Send me your video',
    metricViews: 'public views',
    metricReward: 'UP TO $50 IN MAPSHROOM CREDITS',
    heroCaption: 'YouTube Shorts + Instagram Reels / Add #mapshroom / Show the process',
    missionKicker: 'The point of the challenge',
    missionTitle: 'Don’t post only the final reveal.',
    missionBody:
      'The video should help someone understand what using Mapshroom actually feels like. Show the decisions, the tools, the setup and the transformation—not just the finished projection. The goal is to introduce the app and its possibilities to as many new people as possible.',
    processKicker: 'Your video, in four beats',
    processTitle: 'Make the journey visible.',
    steps: [
      {
        title: 'Choose an object',
        body: 'Introduce the object you want to map and briefly show your physical setup.',
        label: 'The starting point',
      },
      {
        title: 'Use Mapshroom',
        body: 'Record the real process: load the image, remove the background, create depth and fit the visual to the object.',
        label: 'This is essential',
      },
      {
        title: 'Show the transformation',
        body: 'Include shaders, adjustments or timeline choices, then reveal the final projection on the object.',
        label: 'The payoff',
      },
      {
        title: 'Publish and send the link',
        body: 'Publish it publicly as a YouTube Short or Instagram Reel and add #mapshroom. When that video has more than 4,000 views, send its link to @mirco.aurelio on Instagram to claim your credits.',
        label: 'Claim your credits',
      },
    ],
    processNoteStrong: 'The process is the story.',
    processNote:
      'Screen recordings, behind-the-scenes shots, mistakes and adjustments make the video more useful—and more interesting.',
    exampleTitle: 'What “show the process” means',
    exampleItems: [
      'The object and projector setup',
      'Loading and preparing the asset',
      'Fitting, styling and testing',
      'The final mapping in action',
    ],
    tutorialLink: 'Use the full tutorial as your filming checklist',
    benefitsKicker: 'Every valid creator joins the community',
    benefitsTitle: 'Earn up to $50 in credits.',
    benefits: [
      {
        title: 'Mushroom Creator badge',
        body: 'A visible mark that you took part in the creator challenge.',
      },
      {
        title: 'A chance to be featured',
        body: 'Your work may be reposted or highlighted on Mapshroom channels.',
      },
      {
        title: 'Creator gallery',
        body: 'Join a gallery of people experimenting, mapping and sharing their process.',
      },
    ],
    submitKicker: 'Ready to participate?',
    submitTitle: 'Map it. Film it. Share it.',
    submitBody:
      'Publish your process video as a YouTube Short or Instagram Reel, add #mapshroom and send me its link on Instagram. Once that Short or Reel has more than 4,000 public views, it can qualify for up to $50 in credits for your Mapshroom account.',
    submitCta: 'Open @mirco.aurelio',
    submitHandle: 'Send the link by DM',
    checklistTitle: 'Quick checklist',
    checklist: [
      'The video clearly shows Mapshroom being used',
      'The mapping process is visible—not only the result',
      'It is a public YouTube Short or Instagram Reel',
      'The post includes #mapshroom',
      'The Short or Reel has more than 4,000 verifiable public views',
      'You send the video link to @mirco.aurelio',
    ],
    footerTagline: 'Projection mapping for more people.',
    footerTutorial: 'Read the tutorial',
  },
  it: {
    documentTitle: 'Fino a $50 in crediti Mapshroom | Creator Challenge',
    description:
      'Pubblica il tuo processo Mapshroom come YouTube Short o Instagram Reel con #mapshroom. Supera 4.000 visualizzazioni pubbliche per ricevere fino a $50 in crediti Mapshroom.',
    navHow: 'Come funziona',
    navTutorial: 'Tutorial',
    navOpen: 'Apri Mapshroom',
    languageLabel: 'Scegli la lingua',
    eyebrow: 'Mapshroom Creator Challenge',
    titleBefore: 'Vai virale.',
    titleAccent: 'Ricevi fino a $50 in crediti.',
    lead:
      'Mostra tutto il tuo processo Mapshroom con #mapshroom. Supera 4.000 visualizzazioni pubbliche per ricevere fino a $50 in crediti sul tuo account Mapshroom.',
    platformsLabel: 'Pubblica su',
    youtubeFormat: 'YouTube Shorts',
    instagramFormat: 'Instagram Reels',
    heroCta: 'Scopri cosa filmare',
    instagramCta: 'Mandami il tuo video',
    metricViews: 'visualizzazioni pubbliche',
    metricReward: 'FINO A $50 IN CREDITI MAPSHROOM',
    heroCaption: 'YouTube Shorts + Instagram Reels / Aggiungi #mapshroom / Mostra il processo',
    missionKicker: 'Lo scopo della challenge',
    missionTitle: 'Non pubblicare soltanto il risultato.',
    missionBody:
      'Il video deve aiutare chi lo guarda a capire com’è davvero usare Mapshroom. Mostra le scelte, gli strumenti, il setup e la trasformazione, non soltanto la proiezione finita. L’obiettivo è far conoscere l’app e le sue possibilità a più persone possibili.',
    processKicker: 'Il tuo video, in quattro momenti',
    processTitle: 'Rendi visibile il percorso.',
    steps: [
      {
        title: 'Scegli un oggetto',
        body: 'Presenta l’oggetto che vuoi mappare e mostra brevemente il tuo setup fisico.',
        label: 'Il punto di partenza',
      },
      {
        title: 'Usa Mapshroom',
        body: 'Registra il vero processo: carica l’immagine, rimuovi lo sfondo, crea la depth map e adatta il visual all’oggetto.',
        label: 'Questo è essenziale',
      },
      {
        title: 'Mostra la trasformazione',
        body: 'Fai vedere shader, regolazioni o scelte nella timeline, poi rivela la proiezione finale sull’oggetto.',
        label: 'Il risultato',
      },
      {
        title: 'Pubblica e manda il link',
        body: 'Pubblicalo come YouTube Short o Instagram Reel e aggiungi #mapshroom. Quando supera 4.000 visualizzazioni, invia il link a @mirco.aurelio su Instagram per richiedere i crediti.',
        label: 'Richiedi i crediti',
      },
    ],
    processNoteStrong: 'Il processo è la storia.',
    processNote:
      'Registrazioni dello schermo, backstage, errori e regolazioni rendono il video più utile e anche più interessante.',
    exampleTitle: 'Cosa significa “mostra il processo”',
    exampleItems: [
      'L’oggetto e il setup del proiettore',
      'Il caricamento e la preparazione dell’asset',
      'Adattamento, stile e prove',
      'Il mapping finale in azione',
    ],
    tutorialLink: 'Usa il tutorial completo come checklist per le riprese',
    benefitsKicker: 'Ogni creator valido entra nella community',
    benefitsTitle: 'Ricevi fino a $50 in crediti.',
    benefits: [
      {
        title: 'Badge Mushroom Creator',
        body: 'Un riconoscimento visibile per chi partecipa alla creator challenge.',
      },
      {
        title: 'Possibilità di essere pubblicato',
        body: 'Il tuo lavoro potrà essere ricondiviso o messo in evidenza sui canali Mapshroom.',
      },
      {
        title: 'Gallery dei creator',
        body: 'Entra nella gallery di chi sperimenta, mappa e condivide il proprio processo.',
      },
    ],
    submitKicker: 'Vuoi partecipare?',
    submitTitle: 'Mappa. Filma. Condividi.',
    submitBody:
      'Pubblica il video del tuo processo come YouTube Short o Instagram Reel, aggiungi #mapshroom e mandami il link su Instagram. Quando quello Short o Reel supera 4.000 visualizzazioni pubbliche, può ricevere fino a $50 in crediti sul tuo account Mapshroom.',
    submitCta: 'Apri @mirco.aurelio',
    submitHandle: 'Invia il link in DM',
    checklistTitle: 'Checklist veloce',
    checklist: [
      'Nel video si vede chiaramente l’uso di Mapshroom',
      'Si vede il processo di mapping, non solo il risultato',
      'È uno YouTube Short o Instagram Reel pubblico',
      'Il post include #mapshroom',
      'Lo Short o Reel supera 4.000 visualizzazioni pubbliche verificabili',
      'Invii il link del video a @mirco.aurelio',
    ],
    footerTagline: 'Il projection mapping per più persone.',
    footerTutorial: 'Leggi il tutorial',
  },
} as const;

function resolveLocale(): CreatorLocale {
  return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en';
}

function isCreatorLocale(value: string | null): value is CreatorLocale {
  return value === 'en' || value === 'it';
}

function InstagramLink({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a className={className} href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function CreatorChallengeRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLocale = searchParams.get('lang');
  const [locale, setLocale] = useState<CreatorLocale>(() =>
    isCreatorLocale(requestedLocale) ? requestedLocale : resolveLocale(),
  );
  const motionRef = useEditorialMotion<HTMLElement>();
  const copy = COPY[locale];

  useEffect(() => {
    document.body.classList.add('creator-page-active');
    document.title = copy.documentTitle;
    document.documentElement.lang = locale;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const originalDescription = description?.content;
    if (description) description.content = copy.description;
    window.scrollTo(0, 0);

    return () => {
      document.body.classList.remove('creator-page-active');
      document.title = 'Mapshroom';
      if (description && originalDescription) description.content = originalDescription;
    };
  }, [copy.description, copy.documentTitle, locale]);

  const changeLocale = (nextLocale: CreatorLocale) => {
    setLocale(nextLocale);
    setSearchParams({ lang: nextLocale }, { replace: true });
  };

  const scrollToProcess = () => {
    document.getElementById('creator-process')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <main ref={motionRef} className="creator-page" lang={locale}>
      <nav className="creator-nav">
        <Link to="/" className="creator-brand" aria-label="Mapshroom">
          <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
        </Link>
        <div className="creator-nav-links">
          <button type="button" onClick={scrollToProcess}>{copy.navHow}</button>
          <Link to="/tutorial">{copy.navTutorial}</Link>
          <div className="creator-language-switch" aria-label={copy.languageLabel}>
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
          <Link to="/" className="creator-open-button">{copy.navOpen}</Link>
        </div>
      </nav>

      <header className="creator-hero" data-scroll-hero>
        <div className="creator-hero-copy">
          <p className="creator-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.titleBefore}<br /><em>{copy.titleAccent}</em></h1>
          <p className="creator-hero-lead">{copy.lead}</p>
          <div className="creator-platforms" aria-label={copy.platformsLabel}>
            <span>{copy.platformsLabel}</span>
            <strong className="creator-platform-youtube">{copy.youtubeFormat}</strong>
            <strong className="creator-platform-instagram">{copy.instagramFormat}</strong>
          </div>
          <div className="creator-hero-actions">
            <button type="button" className="creator-primary-button" onClick={scrollToProcess}>
              {copy.heroCta}
            </button>
            <InstagramLink className="creator-text-link">{copy.instagramCta} ↗</InstagramLink>
          </div>
        </div>

        <div className="creator-hero-visual" aria-label={copy.heroCaption}>
          <div className="creator-hero-strip">
            <figure>
              <img src="assets/onboarding/photo-source-garden.webp" alt="" />
              <figcaption>01 / OBJECT</figcaption>
            </figure>
            <figure>
              <img src="assets/tutorial/workspace-overview.png" alt="" />
              <figcaption>02 / PROCESS</figcaption>
            </figure>
            <figure>
              <img src="assets/onboarding/photo-3d-asset-choice.webp" alt="" />
              <figcaption>03 / MAPPING</figcaption>
            </figure>
          </div>
          <div className="creator-view-counter">
            <strong>&gt;4,000</strong>
            <span>{copy.metricViews}</span>
            <i aria-hidden="true">→</i>
            <b>{copy.metricReward}</b>
          </div>
          <p>{copy.heroCaption}</p>
        </div>
      </header>

      <section className="creator-mission" data-reveal>
        <p className="creator-eyebrow">{copy.missionKicker}</p>
        <div>
          <h2>{copy.missionTitle}</h2>
          <p>{copy.missionBody}</p>
        </div>
      </section>

      <section id="creator-process" className="creator-process">
        <div className="creator-section-heading" data-reveal>
          <p className="creator-eyebrow">{copy.processKicker}</p>
          <h2>{copy.processTitle}</h2>
        </div>

        <div className="creator-process-grid" data-reveal-group>
          {copy.steps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <small>{step.label}</small>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <aside className="creator-process-note" data-reveal>
          <strong>{copy.processNoteStrong}</strong>
          <p>{copy.processNote}</p>
        </aside>
      </section>

      <section className="creator-example">
        <div className="creator-example-copy" data-reveal="left">
          <p className="creator-eyebrow">PROCESS / NOT JUST RESULT</p>
          <h2>{copy.exampleTitle}</h2>
          <ol>
            {copy.exampleItems.map((item, index) => (
              <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>
            ))}
          </ol>
          <Link to="/tutorial" className="creator-text-link">{copy.tutorialLink} →</Link>
        </div>
        <div className="creator-example-media" data-reveal="right">
          <figure className="creator-example-main">
            <img src="assets/tutorial/processing-tools-zoom-v2.png" alt="" loading="lazy" />
            <figcaption>Mapshroom / asset preparation</figcaption>
          </figure>
          <figure className="creator-example-secondary">
            <img src="assets/tutorial/timeline-hq-v3.png" alt="" loading="lazy" />
            <figcaption>Mapshroom / timeline</figcaption>
          </figure>
        </div>
      </section>

      <section className="creator-benefits">
        <div className="creator-section-heading" data-reveal>
          <p className="creator-eyebrow">{copy.benefitsKicker}</p>
          <h2>{copy.benefitsTitle}</h2>
        </div>
        <div className="creator-benefit-grid" data-reveal-group>
          {copy.benefits.map((benefit, index) => (
            <article key={benefit.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className={`creator-benefit-symbol creator-benefit-symbol-${index + 1}`} aria-hidden="true">
                {index === 0 ? 'M' : index === 1 ? '↗' : '•••'}
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="creator-submit">
        <div className="creator-submit-copy" data-reveal="left">
          <p className="creator-eyebrow">{copy.submitKicker}</p>
          <h2>{copy.submitTitle}</h2>
          <p>{copy.submitBody}</p>
          <InstagramLink className="creator-instagram-button">
            <span>{copy.submitCta}</span>
            <small>{copy.submitHandle}</small>
            <b aria-hidden="true">↗</b>
          </InstagramLink>
        </div>
        <div className="creator-checklist" data-reveal="right">
          <h3>{copy.checklistTitle}</h3>
          <ul>
            {copy.checklist.map((item) => (
              <li key={item}><span aria-hidden="true">✓</span>{item}</li>
            ))}
          </ul>
          <div>
            <strong>&gt;4,000</strong>
            <span>VIEWS</span>
            <i aria-hidden="true">→</i>
            <b>{locale === 'it' ? 'FINO A $50 IN CREDITI' : 'UP TO $50 IN CREDITS'}</b>
          </div>
        </div>
      </section>

      <MapshroomShaderFooter className="creator-footer">
        <span>Mapshroom</span>
        <span>{copy.footerTagline}</span>
        <Link to="/tutorial">{copy.footerTutorial}</Link>
      </MapshroomShaderFooter>
    </main>
  );
}
