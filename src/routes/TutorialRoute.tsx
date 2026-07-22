import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveTutorialLocale, TUTORIAL_COPY } from '../lib/tutorialCopy';
import './TutorialRoute.css';

type MediaProps = {
  src: string;
  alt: string;
  className?: string;
  marker?: { label: string; x: string; y: string };
  clickLabel?: string;
};

function Media({ src, alt, className = '', marker, clickLabel = 'Click here' }: MediaProps) {
  return (
    <figure className={`tutorial-media ${className}`.trim()}>
      <img src={src} alt={alt} loading="lazy" />
      {marker ? (
        <div className="tutorial-click-marker" style={{ left: marker.x, top: marker.y }}>
          <span aria-hidden="true">{marker.label}</span><strong>{clickLabel}</strong>
        </div>
      ) : null}
    </figure>
  );
}

function Step({
  number,
  title,
  stepLabel,
  children,
}: {
  number: string;
  title: string;
  stepLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tutorial-step-copy">
      <span className="tutorial-step-number">{number}</span>
      <div><p className="tutorial-step-kicker">{stepLabel}</p><h2>{title}</h2>{children}</div>
    </div>
  );
}

export function TutorialRoute() {
  const [locale] = useState(() => resolveTutorialLocale());
  const copy = TUTORIAL_COPY[locale];

  useEffect(() => {
    document.body.classList.add('tutorial-page-active');
    document.title = copy.documentTitle;
    document.documentElement.lang = locale;
    window.scrollTo(0, 0);
    return () => {
      document.body.classList.remove('tutorial-page-active');
      document.title = 'Mapshroom';
    };
  }, [copy.documentTitle, locale]);

  return (
    <main className="tutorial-page" lang={locale}>
      <nav className="tutorial-nav">
        <Link to="/" className="tutorial-brand"><img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" /><span>Mapshroom</span></Link>
        <div><a href="#steps">{copy.navViewSteps}</a><Link to="/" className="tutorial-open-button">{copy.navOpenWorkspace}</Link></div>
      </nav>

      <header className="tutorial-hero">
        <div className="tutorial-hero-copy">
          <p className="tutorial-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heroTitleBefore}<br /><em>{copy.heroTitleEmphasis}</em></h1>
          <p className="tutorial-hero-lead">{copy.heroLead}</p>
          <div className="tutorial-hero-actions"><a href="#steps" className="tutorial-primary-button">{copy.heroCta}</a><span>{copy.heroDuration}</span></div>
        </div>
        <div className="tutorial-hero-visual">
          <img src="assets/onboarding/photo-source-garden.webp" alt="" />
          <div className="tutorial-camera-frame" aria-hidden="true"><span>01</span></div>
          <p>{copy.heroVisualCaption}</p>
        </div>
      </header>

      <section className="tutorial-kit" aria-label={copy.kitLabel}>
        {copy.kit.map((item) => (
          <div key={item.number}><span>{item.number}</span><strong>{item.title}</strong><small>{item.detail}</small></div>
        ))}
      </section>

      <div id="steps" className="tutorial-steps">
        <section className="tutorial-step">
          <Step number="01" title={copy.steps.photograph.title} stepLabel={copy.stepLabel('01')}><p>{copy.steps.photograph.body}</p></Step>
          <div className="tutorial-photo-pair">
            <Media src="assets/onboarding/capture-from-projector-view.webp" alt="" />
            <Media src="assets/onboarding/align-phone-camera.webp" alt="" />
          </div>
          <aside className="tutorial-tip"><strong>{copy.steps.photograph.tipLabel}</strong> {copy.steps.photograph.tip}</aside>
        </section>

        <section className="tutorial-step tutorial-step-load">
          <div className="tutorial-load-grid">
            <Step number="02" title={copy.steps.load.title} stepLabel={copy.stepLabel('02')}>
              <p>{copy.steps.load.bodyBefore}<strong>{copy.steps.load.bodyStrong}</strong>{copy.steps.load.bodyAfter}</p>
            </Step>
            <Media className="tutorial-ui-shot tutorial-zoom-shot" src="assets/tutorial/load-output-zoom-v2.png" alt="" marker={{ label: '1', x: '69%', y: '5%' }} clickLabel={copy.clickHere} />
          </div>
          <div className="tutorial-action-line"><kbd>LOAD ASSET</kbd><span>→</span><p>{copy.steps.load.action}</p></div>
        </section>

        <section className="tutorial-step">
          <Step number="03" title={copy.steps.process.title} stepLabel={copy.stepLabel('03')}><p>{copy.steps.process.body}</p></Step>
          <div className="tutorial-processing-demo">
            <figure className="tutorial-media tutorial-mask-video">
              <video autoPlay muted loop playsInline preload="metadata" poster="assets/tutorial/remove-background-loop-poster-v2.jpg" aria-label={copy.steps.process.videoAria}>
                <source src="assets/tutorial/remove-background-loop-v3.mp4" type="video/mp4" />
              </video>
              <figcaption>{copy.steps.process.videoCaption}</figcaption>
            </figure>
            <div className="tutorial-processing-crops">
              <Media src="assets/tutorial/processing-tools-zoom-v2.png" alt="" />
              <Media className="tutorial-depth-dialog-shot" src="assets/tutorial/create-depth-map-v2.png" alt="" />
            </div>
          </div>
          <div className="tutorial-process-grid">
            <article><Media src="assets/onboarding/photo-source-garden.webp" alt="" /><span>{copy.steps.process.original}</span><h3>{copy.steps.process.yourPhoto}</h3></article>
            <article><Media src="assets/onboarding/photo-background-removed.webp" alt="" /><span>{copy.steps.process.click1}</span><h3>{copy.steps.process.removeBackground}</h3></article>
            <article className="tutorial-depth-result-card"><Media src="assets/tutorial/depth-map-result-v2.png" alt="" /><span>{copy.steps.process.click2}</span><h3>{copy.steps.process.depthMap}</h3></article>
          </div>
          <div className="tutorial-action-line"><kbd>REMOVE BACKGROUND</kbd><span>then</span><kbd>DEPTH MAP</kbd></div>
        </section>

        <section className="tutorial-step">
          <Step number="04" title={copy.steps.projector.title} stepLabel={copy.stepLabel('04')}>
            <p>{copy.steps.projector.bodyBefore}<strong>{copy.steps.projector.bodyStrong}</strong>{copy.steps.projector.bodyAfter}</p>
          </Step>
          <div className="tutorial-projector-grid">
            <Media src="assets/onboarding/materials-needed.png" alt="" />
            <Media
              className="tutorial-ui-shot tutorial-zoom-shot"
              src="assets/tutorial/load-output-zoom-v2.png"
              alt=""
              marker={{ label: '2', x: '84%', y: '5%' }}
              clickLabel={copy.clickHere}
            />
          </div>
          <ol className="tutorial-mini-steps">
            {copy.steps.projector.mini.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="tutorial-step">
          <Step number="05" title={copy.steps.fit.title} stepLabel={copy.stepLabel('05')}>
            <p>{copy.steps.fit.bodyBefore}<strong>{copy.steps.fit.bodyStrong}</strong>{copy.steps.fit.bodyAfter}</p>
          </Step>
          <figure className="tutorial-media tutorial-move-toolbar" aria-label={copy.steps.fit.toolbarHint}>
            <div className="tutorial-move-toolbar-row">
              <span>File</span>
              <strong>Move</strong>
              <span>Shader</span>
            </div>
            <div className="tutorial-click-marker tutorial-move-toolbar-marker">
              <span aria-hidden="true">5</span><strong>{copy.clickHere}</strong>
            </div>
            <figcaption>{copy.steps.fit.toolbarHint}</figcaption>
          </figure>
          <div className="tutorial-action-line"><kbd>FILE</kbd><span>→</span><kbd>MOVE</kbd><span>→</span><p>{copy.steps.fit.action}</p></div>
          <div className="tutorial-mapping-demo">
            <div className="tutorial-mapping-stage"><img src="assets/onboarding/photo-background-removed.webp" alt="" /><span /></div>
            <div className="tutorial-mapping-card"><p>MOVE / SIZE</p><div className="tutorial-mapping-pad"><button type="button">H−</button><button type="button" className="active">↑</button><button type="button">H+</button><button type="button" className="active">←</button><button type="button" className="precision">Precision<strong>12</strong></button><button type="button" className="active">→</button><button type="button">W−</button><button type="button" className="active">↓</button><button type="button">W+</button></div><small>{copy.steps.fit.cardHint}</small></div>
          </div>
        </section>

        <section className="tutorial-step">
          <Step number="06" title={copy.steps.shader.title} stepLabel={copy.stepLabel('06')}>
            <p>
              {copy.steps.shader.bodyBefore}
              <strong>{copy.steps.shader.bodyStrongShader}</strong>
              {copy.steps.shader.bodyMid}
              <strong>{copy.steps.shader.bodyStrongPreset}</strong>
              {copy.steps.shader.bodyAfter}
            </p>
          </Step>
          <Media className="tutorial-ui-shot tutorial-hq-gallery" src="assets/tutorial/shader-gallery-hq-v3.png" alt="" marker={{ label: '3', x: '50%', y: '48%' }} clickLabel={copy.clickHere} />
          <div className="tutorial-action-line"><kbd>SHADER</kbd><span>→</span><kbd>PRESET LIST</kbd><span>→</span><p>{copy.steps.shader.action}</p></div>
        </section>

        <section className="tutorial-step">
          <Step number="07" title={copy.steps.customize.title} stepLabel={copy.stepLabel('07')}><p>{copy.steps.customize.body}</p></Step>
          <Media className="tutorial-ui-shot tutorial-hq-controls" src="assets/tutorial/shader-controls-hq-v3.png" alt="" marker={{ label: '4', x: '14%', y: '29%' }} clickLabel={copy.clickHere} />
          <aside className="tutorial-tip"><strong>{copy.steps.customize.tipLabel}</strong> {copy.steps.customize.tip}</aside>
        </section>

        <section className="tutorial-step">
          <Step number="08" title={copy.steps.timeline.title} stepLabel={copy.stepLabel('08')}><p>{copy.steps.timeline.body}</p></Step>
          <Media className="tutorial-ui-shot tutorial-hq-timeline" src="assets/tutorial/timeline-v4.png" alt="" />
          <div className="tutorial-timeline-key">
            {copy.steps.timeline.keys.map((key) => (
              <span key={key}><i />{key}</span>
            ))}
          </div>
        </section>

        <section className="tutorial-step tutorial-step-finish">
          <Step number="09" title={copy.steps.export.title} stepLabel={copy.stepLabel('09')}><p>{copy.steps.export.body}</p></Step>
          <div className="tutorial-finish-flow">
            {copy.steps.export.flow.map((item, index) => (
              <span key={item.title} className="tutorial-finish-flow-item">
                {index > 0 ? <b aria-hidden="true">→</b> : null}
                <div><span>{String(index + 1)}</span><strong>{item.title}</strong><small>{item.detail}</small></div>
              </span>
            ))}
          </div>
          <Media className="tutorial-finale-image" src="assets/onboarding/photo-3d-asset-choice.webp" alt="" />
        </section>
      </div>

      <section className="tutorial-cta">
        <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
        <p>{copy.ctaReady}</p>
        <h2>{copy.ctaTitle}</h2>
        <p className="tutorial-cta-lead">{copy.ctaLead}</p>
        <Link to="/" className="tutorial-primary-button">{copy.ctaButton}</Link>
      </section>
      <footer className="tutorial-footer">
        <span>Mapshroom</span>
        <span>{copy.footerTagline}</span>
        <Link to="/">{copy.footerWorkspace}</Link>
      </footer>
    </main>
  );
}
