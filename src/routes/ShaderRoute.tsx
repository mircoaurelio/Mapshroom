import { useEffect, useRef, useState } from 'react';
import { MapshroomShaderFooter } from '../components/MapshroomShaderFooter';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import {
  resolveShaderGuideLocale,
  SHADER_GUIDE_COPY,
} from '../lib/shaderGuideCopy';
import '../styles/EditorialMotion.css';
import './ShaderRoute.css';

function HeroShaderPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      return;
    }

    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      mat2 rotate2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.52;
        mat2 spin = rotate2d(0.53);
        for (int octave = 0; octave < 5; octave++) {
          value += amplitude * noise2d(p);
          p = spin * p * 2.03 + vec2(4.7, 1.3);
          amplitude *= 0.5;
        }
        return value;
      }

      vec3 spectralPalette(float t) {
        vec3 base = vec3(0.52, 0.55, 0.50);
        vec3 range = vec3(0.48, 0.45, 0.50);
        vec3 frequency = vec3(1.0, 1.0, 1.0);
        vec3 phase = vec3(0.02, 0.23, 0.48);
        return base + range * cos(6.28318 * (frequency * t + phase));
      }

      void main() {
        vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy)
          / min(u_resolution.x, u_resolution.y);
        float time = u_time * 0.24;
        float radius = length(uv);
        float angle = atan(uv.y, uv.x);

        vec2 p = rotate2d(sin(time * 0.7) * 0.22) * uv;
        float firstWarp = fbm(p * 1.8 + vec2(time, -time * 0.7));
        float secondWarp = fbm(
          rotate2d(1.57) * p * 2.35
          + vec2(-time * 0.55, firstWarp * 2.8)
        );
        vec2 domain = p + 0.42 * vec2(
          firstWarp - 0.5,
          secondWarp - 0.5
        );

        float field = 0.0;
        float energy = 0.0;
        vec2 layerPoint = domain;
        for (int layer = 0; layer < 5; layer++) {
          float index = float(layer);
          layerPoint = abs(layerPoint) / dot(layerPoint, layerPoint) - 0.72;
          layerPoint *= rotate2d(0.34 + index * 0.17 + time * 0.08);
          float wave = sin(
            layerPoint.x * 3.1
            + layerPoint.y * 2.4
            - time * (1.2 + index * 0.16)
          );
          float weight = 0.62 / (1.0 + index);
          field += wave * weight;
          energy += exp(-2.8 * abs(wave)) * weight;
        }

        float folded = abs(sin(angle * 7.0 + field * 2.6 - time * 1.7));
        float contour = smoothstep(0.78, 0.98, folded + energy * 0.42);
        float rings = sin(radius * 18.0 - time * 2.8 + firstWarp * 7.0);
        float ringMask = smoothstep(0.64, 0.98, rings) * (1.0 - contour);
        float core = exp(-2.2 * radius) * (0.6 + 0.4 * sin(field * 4.0));

        vec3 color = spectralPalette(
          field * 0.15 + secondWarp * 0.42 + radius * 0.18 + time * 0.05
        );
        color *= 0.42 + energy * 1.25;
        color += vec3(0.47, 0.94, 0.74) * contour * 1.45;
        color += vec3(1.0, 0.18, 0.22) * ringMask * 0.85;
        color += vec3(0.16, 0.75, 1.0) * core * 0.55;

        float vignette = smoothstep(1.55, 0.18, radius);
        color *= vignette;
        color = pow(max(color, 0.0), vec3(0.82));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, 'position');
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let animationFrame = 0;

    const draw = (now: number) => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reducedMotion ? 8.0 : (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      gl.deleteBuffer(vertices);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="shader-guide-live-canvas" aria-hidden="true" />;
}

function CopyPrompt({
  label,
  text,
  actionLabel,
  copiedLabel,
  copiedStatus,
  tone = 'light',
}: {
  label: string;
  text: string;
  actionLabel: string;
  copiedLabel: string;
  copiedStatus: string;
  tone?: 'light' | 'dark';
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`shader-copy-card shader-copy-card-${tone}`}>
      <div className="shader-copy-card-header">
        <span>{label}</span>
        <button type="button" onClick={copy} aria-label={`${actionLabel}: ${label}`}>
          {copied ? copiedLabel : actionLabel}
        </button>
      </div>
      <pre><code>{text}</code></pre>
      <span className="shader-copy-status" aria-live="polite">
        {copied ? copiedStatus : ''}
      </span>
    </div>
  );
}

function PromptStep({
  number,
  title,
  body,
  example,
}: {
  number: string;
  title: string;
  body: string;
  example: string;
}) {
  return (
    <article className="shader-prompt-step" data-reveal>
      <span className="shader-prompt-step-number">{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        <small>{example}</small>
      </div>
    </article>
  );
}

export function ShaderRoute() {
  const [locale] = useState(() => resolveShaderGuideLocale());
  const motionRef = useEditorialMotion<HTMLElement>();
  const copy = SHADER_GUIDE_COPY[locale];
  const whyHref = locale === 'it' ? '/why/?lang=it' : '/why/?lang=en';

  useEffect(() => {
    document.body.classList.add('shader-page-active');
    document.title = copy.documentTitle;
    document.documentElement.lang = locale;
    window.scrollTo(0, 0);

    return () => {
      document.body.classList.remove('shader-page-active');
      document.title = 'Mapshroom';
    };
  }, [copy.documentTitle, locale]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const promptCardProps = {
    actionLabel: copy.copy.action,
    copiedLabel: copy.copy.copied,
    copiedStatus: copy.copy.status,
  };

  return (
    <main ref={motionRef} className="shader-guide-page" lang={locale}>
      <nav className="shader-guide-nav">
        <a href="/" className="shader-guide-brand" aria-label="Mapshroom">
          <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
        </a>
        <div>
          <button type="button" onClick={() => scrollToSection('what-is-a-shader')}>
            {copy.nav.what}
          </button>
          <button type="button" onClick={() => scrollToSection('prompt-recipe')}>
            {copy.nav.recipe}
          </button>
          <button type="button" onClick={() => scrollToSection('fix-errors')}>
            {copy.nav.errors}
          </button>
          <a href="/" className="shader-guide-open">{copy.nav.open}</a>
        </div>
      </nav>

      <header className="shader-guide-hero">
        <div className="shader-guide-hero-copy">
          <p className="shader-guide-eyebrow">{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title} <em>{copy.hero.emphasis}</em></h1>
          <p className="shader-guide-hero-lead">{copy.hero.lead}</p>
          <div className="shader-guide-hero-actions">
            <button type="button" onClick={() => scrollToSection('prompt-recipe')}>
              {copy.hero.cta}
            </button>
            <span>{copy.hero.duration}</span>
          </div>
        </div>
        <div className="shader-guide-hero-visual">
          <HeroShaderPreview />
          <div className="shader-guide-orb shader-guide-orb-a" aria-hidden="true" />
          <div className="shader-guide-orb shader-guide-orb-b" aria-hidden="true" />
          <div className="shader-guide-code-window" aria-hidden="true">
            <div><i /><i /><i /><span>{copy.hero.shaderName}</span></div>
            <code>
              <span className="mint">float</span> field = fbm(p * 2.35);<br />
              <span className="coral">for</span> (int layer = 0; layer &lt; 5; layer++) {'{'}<br />
              &nbsp;&nbsp;p = abs(p) / dot(p, p) - 0.72;<br />
              &nbsp;&nbsp;p *= rotate2d(time * 0.08);<br />
              &nbsp;&nbsp;energy += exp(-2.8 * abs(wave));<br />
              {'}'}<br />
              <span className="mint">vec3</span> color = spectralPalette(field);<br />
              <span className="muted">{copy.hero.shaderComment}</span>
            </code>
            <footer>
              <span>{copy.hero.shaderMeta}</span>
              <strong><i /> {copy.hero.shaderStatus}</strong>
            </footer>
          </div>
        </div>
      </header>

      <section className="shader-guide-facts" aria-label="Shader quick facts" data-reveal-group>
        {copy.facts.map((item) => (
          <div key={item.number}>
            <span>{item.number}</span><strong>{item.title}</strong><small>{item.detail}</small>
          </div>
        ))}
      </section>

      <section id="what-is-a-shader" className="shader-guide-intro">
        <div className="shader-guide-section-heading" data-reveal>
          <p className="shader-guide-eyebrow">{copy.intro.eyebrow}</p>
          <h2>{copy.intro.title}</h2>
          <p>
            {copy.intro.beforeShader}<strong>{copy.intro.shaderWord}</strong>{copy.intro.afterShader}
          </p>
          <p>
            {copy.intro.beforeGlsl}<strong>{copy.intro.glslWord}</strong>{copy.intro.afterGlsl}
          </p>
        </div>

        <div className="shader-guide-pipeline" data-reveal-group>
          {copy.intro.pipeline.map((item, index) => (
            <span className="shader-guide-pipeline-item" key={item.label}>
              {index > 0 ? <b aria-hidden="true">→</b> : null}
              <article className={index === 1 ? 'shader-guide-pipeline-active' : ''}>
                <span>{item.label}</span>
                <div
                  className={
                    index === 0
                      ? 'shader-guide-input-tile'
                      : index === 1
                        ? 'shader-guide-instruction-tile'
                        : 'shader-guide-output-tile'
                  }
                  aria-hidden="true"
                >
                  {index === 1 ? <><i /><i /><i /><i /></> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            </span>
          ))}
        </div>

        <div className="shader-guide-terms" data-reveal-group>
          {copy.intro.terms.map((term) => (
            <article key={term.code}>
              <code>{term.code}</code><h3>{term.title}</h3><p>{term.body}</p>
            </article>
          ))}
        </div>
        <aside className="shader-guide-reassurance" data-reveal>
          <strong>{copy.intro.reassuranceStrong}</strong> {copy.intro.reassurance}
        </aside>
      </section>

      <section id="prompt-recipe" className="shader-guide-recipe">
        <div className="shader-guide-recipe-heading" data-reveal>
          <p className="shader-guide-eyebrow">{copy.recipe.eyebrow}</p>
          <h2>{copy.recipe.title}<br /><em>{copy.recipe.emphasis}</em></h2>
          <p>{copy.recipe.lead}</p>
        </div>

        <div className="shader-guide-prompt-grid">
          <div className="shader-guide-prompt-steps">
            {copy.recipe.steps.map((step) => <PromptStep key={step.number} {...step} />)}
          </div>
          <div className="shader-guide-perfect-prompt" data-reveal="right">
            <span className="shader-guide-formula">{copy.recipe.formula}</span>
            <CopyPrompt
              label={copy.recipe.promptLabel}
              text={copy.recipe.prompt}
              tone="dark"
              {...promptCardProps}
            />
            <p><strong>{copy.recipe.whyStrong}</strong> {copy.recipe.why}</p>
          </div>
        </div>
      </section>

      <section className="shader-guide-workflow">
        <div className="shader-guide-section-heading" data-reveal>
          <p className="shader-guide-eyebrow">{copy.workflow.eyebrow}</p>
          <h2>{copy.workflow.title}</h2>
          <p>{copy.workflow.lead}</p>
        </div>
        <ol className="shader-guide-workflow-list" data-reveal-group>
          {copy.workflow.steps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span><div><strong>{step.title}</strong><p>{step.body}</p></div>
            </li>
          ))}
        </ol>
        <div className="shader-guide-refine-example" data-reveal>
          <div><span>{copy.workflow.vagueLabel}</span><p>{copy.workflow.vague}</p></div>
          <b aria-hidden="true">→</b>
          <div><span>{copy.workflow.directLabel}</span><p>{copy.workflow.direct}</p></div>
        </div>
      </section>

      <section className="shader-guide-mix">
        <div className="shader-guide-mix-copy" data-reveal="left">
          <p className="shader-guide-eyebrow">{copy.mix.eyebrow}</p>
          <h2>{copy.mix.title}</h2>
          <p>{copy.mix.body1}</p>
          <p><strong>{copy.mix.strong}</strong>{copy.mix.body2}</p>
          <ul>
            {copy.mix.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <CopyPrompt
          label={copy.mix.promptLabel}
          text={copy.mix.prompt}
          {...promptCardProps}
        />
      </section>

      <section id="fix-errors" className="shader-guide-errors">
        <div className="shader-guide-errors-heading" data-reveal>
          <p className="shader-guide-eyebrow">{copy.errors.eyebrow}</p>
          <h2>{copy.errors.title}<br />{copy.errors.titleSecond}</h2>
          <p>{copy.errors.beforeFix}<strong>{copy.errors.fix}</strong>{copy.errors.afterFix}</p>
        </div>
        <div className="shader-guide-error-loop" data-reveal-group>
          {copy.errors.loop.map((step, index) => (
            <span className="shader-guide-error-loop-item" key={step.number}>
              {index > 0 ? <i aria-hidden="true">→</i> : null}
              <article>
                <span>{step.number}</span><strong>{step.title}</strong><p>{step.body}</p>
              </article>
            </span>
          ))}
        </div>
        <CopyPrompt
          label={copy.errors.promptLabel}
          text={copy.errors.prompt}
          tone="dark"
          {...promptCardProps}
        />

        <div className="shader-guide-troubleshooting" data-reveal-group>
          {copy.errors.troubleshooting.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shader-guide-anywhere">
        <div data-reveal="left">
          <p className="shader-guide-eyebrow">{copy.anywhere.eyebrow}</p>
          <h2>{copy.anywhere.title}</h2>
        </div>
        <div className="shader-guide-anywhere-grid" data-reveal-group>
          {copy.anywhere.options.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p>
            </article>
          ))}
        </div>
        <aside data-reveal>
          <strong>{copy.anywhere.loopStrong}</strong> {copy.anywhere.loop}
        </aside>
      </section>

      <section className="shader-guide-cta">
        <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
        <p>{copy.cta.eyebrow}</p>
        <h2>{copy.cta.title}</h2>
        <span>{copy.cta.lead}</span>
        <div>
          <a href="/">{copy.cta.open}</a>
          <a href="/tutorial/">{copy.cta.tutorial}</a>
        </div>
      </section>

      <MapshroomShaderFooter className="shader-guide-footer">
        <span>Mapshroom</span>
        <span>{copy.footer.tagline}</span>
        <a href={whyHref}>{copy.footer.why}</a>
      </MapshroomShaderFooter>
    </main>
  );
}
