import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapshroomShaderFooter } from '../components/MapshroomShaderFooter';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import '../styles/EditorialMotion.css';
import './ShaderRoute.css';

const PERFECT_PROMPT = `Keep the original subject recognizable and preserve its transparency.
Add soft contour lines around the brightest edges.
Make the lines drift upward slowly, like warm air.
Use mint green for the lines and a subtle coral glow.
Add controls for speed, line width, glow, and color.
Keep the shader smooth and lightweight.`;

const MIX_PROMPT = `Use my current shader as the base.
Integrate the pasted shader as a second effect — do not place two complete shaders one after another.
Keep the base shader's colors and transparency.
Use the new shader only to add its ripple movement.
Blend the ripple into bright image areas, rename any conflicting uniforms, and return one complete Mapshroom shader.

PASTED SHADER:
[paste the other GLSL code here]`;

const REPAIR_PROMPT = `Fix this shader with the smallest possible change.
Preserve its current look, colors, controls, and transparency.
It must use WebGL 1.0 GLSL, texture2D(), and one processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) function.
Do not add void main() or gl_FragColor.
Return one complete replacement shader.

COMPILER ERROR:
[paste the exact error here]

BROKEN GLSL:
[paste the complete shader here]`;

function CopyPrompt({
  label,
  text,
  tone = 'light',
}: {
  label: string;
  text: string;
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
        <button type="button" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? 'Copied ✓' : 'Copy prompt'}
        </button>
      </div>
      <pre><code>{text}</code></pre>
      <span className="shader-copy-status" aria-live="polite">
        {copied ? 'Prompt copied to your clipboard.' : ''}
      </span>
    </div>
  );
}

function PromptStep({
  number,
  title,
  children,
  example,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  example: string;
}) {
  return (
    <article className="shader-prompt-step" data-reveal>
      <span className="shader-prompt-step-number">{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
        <small>{example}</small>
      </div>
    </article>
  );
}

export function ShaderRoute() {
  const motionRef = useEditorialMotion<HTMLElement>();

  useEffect(() => {
    document.body.classList.add('shader-page-active');
    document.title = 'GLSL shaders: a beginner’s prompting guide | Mapshroom';
    document.documentElement.lang = 'en';
    window.scrollTo(0, 0);

    return () => {
      document.body.classList.remove('shader-page-active');
      document.title = 'Mapshroom';
    };
  }, []);

  const scrollToRecipe = () => {
    document.getElementById('prompt-recipe')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <main ref={motionRef} className="shader-guide-page">
      <nav className="shader-guide-nav">
        <Link to="/" className="shader-guide-brand" aria-label="Mapshroom">
          <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
        </Link>
        <div>
          <a href="#what-is-a-shader">What is GLSL?</a>
          <button type="button" onClick={scrollToRecipe}>Prompt recipe</button>
          <a href="#fix-errors">Fix errors</a>
          <Link to="/" className="shader-guide-open">Open Mapshroom</Link>
        </div>
      </nav>

      <header className="shader-guide-hero">
        <div className="shader-guide-hero-copy">
          <p className="shader-guide-eyebrow">Shader guide · zero coding required</p>
          <h1>Turn an idea into <em>moving light.</em></h1>
          <p className="shader-guide-hero-lead">
            You do not need to know GLSL to make a shader. Learn what to describe, how to
            guide the AI one decision at a time, and what to do when the code gets confused.
          </p>
          <div className="shader-guide-hero-actions">
            <button type="button" onClick={scrollToRecipe}>Build your first prompt</button>
            <span>Read time · 8 minutes</span>
          </div>
        </div>
        <div className="shader-guide-hero-visual" aria-hidden="true">
          <div className="shader-guide-orb shader-guide-orb-a" />
          <div className="shader-guide-orb shader-guide-orb-b" />
          <div className="shader-guide-code-window">
            <div><i /><i /><i /><span>SOFT CONTOUR DRIFT</span></div>
            <code>
              <span className="mint">uniform float</span> speed;<br />
              <span className="mint">uniform vec3</span> glowColor;<br /><br />
              <span className="coral">vec4</span> processColor(...) {'{'}<br />
              &nbsp;&nbsp;vec4 image = texture2D(tex, uv);<br />
              &nbsp;&nbsp;float movement = time * speed;<br />
              &nbsp;&nbsp;<span className="muted">// your idea becomes light</span><br />
              &nbsp;&nbsp;return image;<br />
              {'}'}
            </code>
            <footer><span>WEBGL 1.0</span><strong><i /> RUNNING</strong></footer>
          </div>
        </div>
      </header>

      <section className="shader-guide-facts" aria-label="Shader quick facts" data-reveal-group>
        <div><span>01</span><strong>Shader</strong><small>A tiny program for pixels</small></div>
        <div><span>02</span><strong>GLSL</strong><small>The language a graphics card reads</small></div>
        <div><span>03</span><strong>Inputs</strong><small>Your image, position, size, and time</small></div>
        <div><span>04</span><strong>Output</strong><small>A new picture, redrawn live</small></div>
      </section>

      <section id="what-is-a-shader" className="shader-guide-intro">
        <div className="shader-guide-section-heading" data-reveal>
          <p className="shader-guide-eyebrow">First things first</p>
          <h2>What is a GLSL shader?</h2>
          <p>
            Imagine giving every pixel on the screen the same tiny instruction:
            “look at the original image, check where you are, check the time, then choose a
            color.” The graphics card repeats that instruction for thousands of pixels at once,
            many times per second. That instruction is a <strong>shader</strong>.
          </p>
          <p>
            <strong>GLSL</strong> is simply the language used to write it. Mapshroom connects the
            image, clock, controls, and screen for you, so you can focus on the visual idea.
          </p>
        </div>

        <div className="shader-guide-pipeline" data-reveal-group>
          <article>
            <span>INPUT</span>
            <div className="shader-guide-input-tile" aria-hidden="true" />
            <h3>Your image</h3>
            <p>Each pixel arrives with a color and a position.</p>
          </article>
          <b aria-hidden="true">→</b>
          <article className="shader-guide-pipeline-active">
            <span>INSTRUCTION</span>
            <div className="shader-guide-instruction-tile" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <h3>The shader</h3>
            <p>It moves, mixes, masks, colors, and reacts to time.</p>
          </article>
          <b aria-hidden="true">→</b>
          <article>
            <span>OUTPUT</span>
            <div className="shader-guide-output-tile" aria-hidden="true" />
            <h3>Moving light</h3>
            <p>The result is redrawn live on your subject.</p>
          </article>
        </div>

        <div className="shader-guide-terms" data-reveal-group>
          <article><code>uv</code><h3>Where am I?</h3><p>The position of a pixel: left, right, top, or bottom.</p></article>
          <article><code>time</code><h3>What moment is it?</h3><p>A clock that makes waves, pulses, and motion possible.</p></article>
          <article><code>resolution</code><h3>How large is the screen?</h3><p>Width and height, used to keep shapes in proportion.</p></article>
          <article><code>uniform</code><h3>What can I control?</h3><p>A named value Mapshroom can turn into a slider or color control.</p></article>
        </div>
        <aside className="shader-guide-reassurance" data-reveal>
          <strong>You do not have to memorize these.</strong>
          They are useful words for diagnosing a result, not a test you must pass before creating.
        </aside>
      </section>

      <section id="prompt-recipe" className="shader-guide-recipe">
        <div className="shader-guide-recipe-heading" data-reveal>
          <p className="shader-guide-eyebrow">The prompting recipe</p>
          <h2>Prompt the picture,<br /><em>not the program.</em></h2>
          <p>
            A useful prompt reads like art direction. Describe what should remain, what should
            change, how it moves, and what you want to adjust later. Let Mapshroom handle the GLSL
            structure.
          </p>
        </div>

        <div className="shader-guide-prompt-grid">
          <div className="shader-guide-prompt-steps">
            <PromptStep number="01" title="Protect the starting point" example="“Keep the original subject recognizable and preserve transparency.”">
              Say what must stay visible. This prevents the AI from replacing your image with an unrelated full-screen pattern.
            </PromptStep>
            <PromptStep number="02" title="Name one visual effect" example="“Add soft contour lines around the brightest edges.”">
              Start with one clear transformation: outlines, ripples, pixels, glow, displacement, trails, or color bands.
            </PromptStep>
            <PromptStep number="03" title="Describe movement with a verb" example="“Make the lines drift upward slowly, like warm air.”">
              Use words such as drift, pulse, rotate, crawl, expand, flicker, or follow. Add a direction and a pace.
            </PromptStep>
            <PromptStep number="04" title="Choose color and mood" example="“Use mint green lines with a subtle coral glow.”">
              Give the AI a small palette and an atmosphere. Two colors are often easier to control than “make it colorful.”
            </PromptStep>
            <PromptStep number="05" title="Ask for the controls" example="“Add sliders for speed, line width, glow, and color.”">
              Controls let you art-direct the result after generation, without rewriting the shader.
            </PromptStep>
          </div>
          <div className="shader-guide-perfect-prompt" data-reveal="right">
            <span className="shader-guide-formula">SUBJECT + EFFECT + MOTION + COLOR + CONTROLS</span>
            <CopyPrompt label="A strong first prompt" text={PERFECT_PROMPT} tone="dark" />
            <p>
              <strong>Why this works:</strong> every sentence makes one decision. If the result is
              close, change only the sentence that is wrong.
            </p>
          </div>
        </div>
      </section>

      <section className="shader-guide-workflow">
        <div className="shader-guide-section-heading" data-reveal>
          <p className="shader-guide-eyebrow">Inside Mapshroom</p>
          <h2>From sentence to shader, step by step.</h2>
          <p>
            Mapshroom includes the current shader and the required code format when it asks the AI.
            Your job is to describe the look and judge the result.
          </p>
        </div>
        <ol className="shader-guide-workflow-list" data-reveal-group>
          <li><span>01</span><div><strong>Load an image</strong><p>Choose the subject you want the effect to react to.</p></div></li>
          <li><span>02</span><div><strong>Open Shader</strong><p>Start from a preset or the current shader in the code panel.</p></div></li>
          <li><span>03</span><div><strong>Write what you want</strong><p>Use the five-part recipe above, then press Generate.</p></div></li>
          <li><span>04</span><div><strong>Judge one thing at a time</strong><p>Check the subject, effect, motion, color, and controls in that order.</p></div></li>
          <li><span>05</span><div><strong>Refine with follow-ups</strong><p>Ask for one specific change while keeping everything else.</p></div></li>
          <li><span>06</span><div><strong>Save the good version</strong><p>Keep a working version before a large mix or experiment.</p></div></li>
        </ol>
        <div className="shader-guide-refine-example" data-reveal>
          <div><span>VAGUE FOLLOW-UP</span><p>“Make it better and faster.”</p></div>
          <b aria-hidden="true">→</b>
          <div><span>DIRECTABLE FOLLOW-UP</span><p>“Keep the composition and colors. Double only the upward drift speed. Do not change the transparency.”</p></div>
        </div>
      </section>

      <section className="shader-guide-mix">
        <div className="shader-guide-mix-copy" data-reveal="left">
          <p className="shader-guide-eyebrow">Mixing shaders</p>
          <h2>Yes, you can paste other code inside.</h2>
          <p>
            GLSL from another shader can be used as material for a new one. Paste it into Mapshroom’s
            code editor, or include it in your AI conversation, then explain which part you want to
            keep: its movement, colors, mask, texture, or shape.
          </p>
          <p>
            <strong>Do not simply place two complete shaders one after another.</strong> They may
            define the same names or use different structures. Ask the AI to integrate them and
            return one complete replacement shader.
          </p>
          <ul>
            <li>Choose which shader is the base.</li>
            <li>Name the exact feature to borrow from the other.</li>
            <li>Say where or when the two effects should blend.</li>
            <li>Ask it to keep useful controls and rename conflicts.</li>
          </ul>
        </div>
        <CopyPrompt label="Prompt for mixing two shaders" text={MIX_PROMPT} />
      </section>

      <section id="fix-errors" className="shader-guide-errors">
        <div className="shader-guide-errors-heading" data-reveal>
          <p className="shader-guide-eyebrow">When generation goes wrong</p>
          <h2>An error is feedback,<br />not a dead end.</h2>
          <p>
            AI writes code by prediction, so a missing bracket, unsupported function, or conflicting
            name can happen. Mapshroom keeps the last valid render, retries generated GLSL once, and
            shows <strong>Fix Error</strong> when the compiler still needs help.
          </p>
        </div>
        <div className="shader-guide-error-loop" data-reveal-group>
          <article><span>01</span><strong>Copy the exact error</strong><p>Do not paraphrase the compiler message.</p></article>
          <i aria-hidden="true">→</i>
          <article><span>02</span><strong>Keep the broken code</strong><p>The AI needs to see what produced it.</p></article>
          <i aria-hidden="true">→</i>
          <article><span>03</span><strong>Restate the rules</strong><p>WebGL 1.0, one complete Mapshroom shader.</p></article>
          <i aria-hidden="true">→</i>
          <article><span>04</span><strong>Ask for the smallest fix</strong><p>Preserve the look instead of redesigning it.</p></article>
        </div>
        <CopyPrompt label="Repair prompt for any chat LLM" text={REPAIR_PROMPT} tone="dark" />

        <div className="shader-guide-troubleshooting" data-reveal-group>
          <article>
            <span>BLACK OR INVISIBLE</span>
            <h3>Reframe the output</h3>
            <p>“Sample the original texture, preserve its alpha, and keep the subject visible before adding the effect.”</p>
          </article>
          <article>
            <span>TOO SLOW OR FLICKERY</span>
            <h3>Simplify the work</h3>
            <p>“Keep one effect, remove expensive loops, and make the motion smooth and lightweight.”</p>
          </article>
          <article>
            <span>LOOKS WRONG</span>
            <h3>Describe what you observe</h3>
            <p>“The glow covers the whole image. Restrict it to bright edges and keep dark areas unchanged.”</p>
          </article>
          <article>
            <span>WRONG CODE FORMAT</span>
            <h3>Repeat the contract</h3>
            <p>“Return one complete WebGL 1.0 shader with processColor(), texture2D(), and no main().”</p>
          </article>
        </div>
      </section>

      <section className="shader-guide-anywhere">
        <div data-reveal="left">
          <p className="shader-guide-eyebrow">One workflow, any AI</p>
          <h2>Use it inside the app or in any chat LLM.</h2>
        </div>
        <div className="shader-guide-anywhere-grid" data-reveal-group>
          <article>
            <span>MAPSHROOM</span>
            <h3>The shortest path</h3>
            <p>
              Pick an AI option in the Shader panel and press Generate. Mapshroom automatically adds
              the current GLSL, its required structure, and the technical contract.
            </p>
          </article>
          <article>
            <span>CHATGPT · PERPLEXITY</span>
            <h3>The guided hand-off</h3>
            <p>
              Choose either chat in Mapshroom. It prepares the full request, opens the chat, and lets
              you paste the returned shader back into the app.
            </p>
          </article>
          <article>
            <span>ANY OTHER CHAT LLM</span>
            <h3>The same conversation</h3>
            <p>
              Paste your current shader, your visual request, and the Mapshroom shader rules. Ask for
              one complete GLSL code block, then paste that code into Mapshroom.
            </p>
          </article>
        </div>
        <aside data-reveal>
          <strong>The durable loop</strong>
          Describe → generate → observe → change one thing → save a version.
          Better shaders come from clearer feedback, not from one magical prompt.
        </aside>
      </section>

      <section className="shader-guide-cta">
        <img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" />
        <p>YOU ALREADY KNOW ENOUGH TO BEGIN</p>
        <h2>Describe the light you want to see.</h2>
        <span>Mapshroom will help you turn it into a shader.</span>
        <div>
          <Link to="/">Open Mapshroom</Link>
          <Link to="/tutorial">Read the projection tutorial</Link>
        </div>
      </section>

      <MapshroomShaderFooter className="shader-guide-footer">
        <span>Mapshroom</span>
        <span>Free forever · Open source forever</span>
        <Link to="/why">Why it is free</Link>
      </MapshroomShaderFooter>
    </main>
  );
}
