import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TutorialRoute.css';

type MediaProps = {
  src: string;
  alt: string;
  className?: string;
  marker?: { label: string; x: string; y: string };
};

function Media({ src, alt, className = '', marker }: MediaProps) {
  return (
    <figure className={`tutorial-media ${className}`.trim()}>
      <img src={src} alt={alt} loading="lazy" />
      {marker ? (
        <div className="tutorial-click-marker" style={{ left: marker.x, top: marker.y }}>
          <span aria-hidden="true">{marker.label}</span><strong>Click here</strong>
        </div>
      ) : null}
    </figure>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="tutorial-step-copy">
      <span className="tutorial-step-number">{number}</span>
      <div><p className="tutorial-step-kicker">Step {number}</p><h2>{title}</h2>{children}</div>
    </div>
  );
}

export function TutorialRoute() {
  useEffect(() => {
    document.body.classList.add('tutorial-page-active');
    document.title = 'Tutorial — Mapshroom';
    window.scrollTo(0, 0);
    return () => {
      document.body.classList.remove('tutorial-page-active');
      document.title = 'Mapshroom';
    };
  }, []);

  return (
    <main className="tutorial-page">
      <nav className="tutorial-nav">
        <Link to="/" className="tutorial-brand"><img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" /><span>Mapshroom</span></Link>
        <div><a href="#steps">View steps</a><Link to="/" className="tutorial-open-button">Open workspace</Link></div>
      </nav>

      <header className="tutorial-hero">
        <div className="tutorial-hero-copy">
          <p className="tutorial-eyebrow">Camera → Mapshroom → projector</p>
          <h1>Projection mapping,<br /><em>from first photo to showtime.</em></h1>
          <p className="tutorial-hero-lead">Turn a sculpture into an animated projection. You only need a phone, a computer, a projector, and a USB key.</p>
          <div className="tutorial-hero-actions"><a href="#steps" className="tutorial-primary-button">Start the tutorial ↓</a><span>About 10 minutes</span></div>
        </div>
        <div className="tutorial-hero-visual">
          <img src="assets/onboarding/photo-source-garden.webp" alt="Sculpture ready to be photographed" />
          <div className="tutorial-camera-frame" aria-hidden="true"><span>01</span></div>
          <p>Your subject becomes the canvas.</p>
        </div>
      </header>

      <section className="tutorial-kit" aria-label="What you need">
        <div><span>01</span><strong>A subject</strong><small>Sculpture or object</small></div>
        <div><span>02</span><strong>A camera</strong><small>Your phone is enough</small></div>
        <div><span>03</span><strong>A projector</strong><small>HDMI connection</small></div>
        <div><span>04</span><strong>A USB key</strong><small>For final playback</small></div>
      </section>

      <div id="steps" className="tutorial-steps">
        <section className="tutorial-step">
          <Step number="01" title="Photograph the sculpture"><p>Stand directly in front of the object and keep the phone level. Frame the complete shape with space around every edge.</p></Step>
          <div className="tutorial-photo-pair">
            <Media src="assets/onboarding/capture-from-projector-view.webp" alt="Person photographing a sculpture from the projector position" />
            <Media src="assets/onboarding/align-phone-camera.webp" alt="Phone camera aligned with the projector lens" />
          </div>
          <aside className="tutorial-tip"><strong>Important</strong> Take the photo from as close as possible to the projector lens. Matching viewpoints makes alignment faster.</aside>
        </section>

        <section className="tutorial-step">
          <Step number="02" title="Load the photo into Mapshroom"><p>Open the workspace, choose <strong>Load asset</strong> in the top bar, then pick your photo. It appears in the media library and on the stage.</p></Step>
          <Media className="tutorial-ui-shot tutorial-zoom-shot" src="assets/tutorial/load-output-zoom.png" alt="Zoomed Mapshroom toolbar showing the Load Asset button and an active shader" marker={{ label: '1', x: '69%', y: '5%' }} />
          <div className="tutorial-action-line"><kbd>LOAD ASSET</kbd><span>→</span><p>Select the sculpture photo.</p></div>
        </section>

        <section className="tutorial-step">
          <Step number="03" title="Remove the background and create depth"><p>In the media library, select the photo. First remove the background; then generate a depth map so shaders react to the object’s shape.</p></Step>
          <div className="tutorial-processing-demo">
            <figure className="tutorial-media tutorial-mask-video">
              <video autoPlay muted loop playsInline preload="metadata" poster="assets/tutorial/remove-background-loop-poster.jpg" aria-label="Removing a background in the Mapshroom Mask Editor at double speed">
                <source src="assets/tutorial/remove-background-loop.mp4" type="video/mp4" />
              </video>
              <figcaption><strong>2× loop</strong> Mask Editor — remove the background</figcaption>
            </figure>
            <div className="tutorial-processing-crops">
              <Media src="assets/tutorial/processing-tools-zoom.png" alt="Remove background and Depth map buttons above a selected asset" />
              <Media className="tutorial-depth-dialog-shot" src="assets/tutorial/create-depth-map.png" alt="Create depth map panel with Generate depth map and depth controls" />
            </div>
          </div>
          <div className="tutorial-process-grid">
            <article><Media src="assets/onboarding/photo-source-garden.webp" alt="Original sculpture photo" /><span>Original</span><h3>Your photo</h3></article>
            <article><Media src="assets/onboarding/photo-background-removed.webp" alt="Sculpture with background removed" /><span>Click 1</span><h3>Remove background</h3></article>
            <article className="tutorial-depth-result-card"><Media src="assets/tutorial/depth-map-result.png" alt="Generated grayscale depth map of the default statue" /><span>Click 2</span><h3>Depth map</h3></article>
          </div>
          <div className="tutorial-action-line"><kbd>REMOVE BACKGROUND</kbd><span>then</span><kbd>DEPTH MAP</kbd></div>
        </section>

        <section className="tutorial-step">
          <Step number="04" title="Connect the projector"><p>Connect the computer to the projector with HDMI. Press <strong>Output</strong> and move the new browser window onto the projector display.</p></Step>
          <div className="tutorial-projector-grid">
            <Media src="assets/onboarding/materials-needed.webp" alt="Projector, HDMI cable, and phone" />
            <Media className="tutorial-ui-shot tutorial-projector-ui" src="assets/tutorial/load-output-zoom.png" alt="Active shader beside the zoomed Mapshroom Output button" marker={{ label: '2', x: '82%', y: '5%' }} />
          </div>
          <ol className="tutorial-mini-steps"><li>Connect HDMI</li><li>Click <strong>Output</strong></li><li>Move the window to the projector</li><li>Enter full screen</li></ol>
        </section>

        <section className="tutorial-step">
          <Step number="05" title="Fit the projection to the object"><p>Open the <strong>Move</strong> card. Use Up, Down, Left, and Right to position the image; use W and H to resize it until the edges match.</p></Step>
          <div className="tutorial-mapping-demo">
            <div className="tutorial-mapping-stage"><img src="assets/onboarding/photo-background-removed.webp" alt="Cut-out sculpture being aligned" /><span /></div>
            <div className="tutorial-mapping-card"><p>MOVE / SIZE</p><div className="tutorial-mapping-pad"><button>H−</button><button className="active">↑</button><button>H+</button><button className="active">←</button><button className="precision">Precision<strong>12</strong></button><button className="active">→</button><button>W−</button><button className="active">↓</button><button>W+</button></div><small>Tap for small adjustments. Keep the object and projector still.</small></div>
          </div>
        </section>

        <section className="tutorial-step">
          <Step number="06" title="Choose a shader"><p>Open <strong>Shader</strong>, then <strong>Preset list</strong>. Preview the styles and select one that reads clearly on the object.</p></Step>
          <Media className="tutorial-ui-shot" src="assets/tutorial/shader-gallery.png" alt="Mapshroom shader preset gallery" marker={{ label: '3', x: '61%', y: '55%' }} />
          <div className="tutorial-action-line"><kbd>SHADER</kbd><span>→</span><kbd>PRESET LIST</kbd><span>→</span><p>Choose a preset.</p></div>
        </section>

        <section className="tutorial-step">
          <Step number="07" title="Customize the shader"><p>Use the sliders on the left to change speed, intensity, scale, relief, and color. Every change appears live.</p></Step>
          <Media className="tutorial-ui-shot" src="assets/tutorial/shader-controls.png" alt="Mapshroom shader control sliders" marker={{ label: '4', x: '16%', y: '33%' }} />
          <aside className="tutorial-tip"><strong>Start simple</strong> Set the overall look first, then add motion. High contrast usually projects better.</aside>
        </section>

        <section className="tutorial-step">
          <Step number="08" title="Customize the timeline"><p>Add shader clips along the bottom timeline. Drag clips to reorder them, set the duration, and choose transitions.</p></Step>
          <Media className="tutorial-ui-shot" src="assets/tutorial/timeline.png" alt="Mapshroom timeline with multiple shader clips" marker={{ label: '5', x: '50%', y: '82%' }} />
          <div className="tutorial-timeline-key"><span><i />Drag to reorder</span><span><i />Set duration</span><span><i />Choose transition</span></div>
        </section>

        <section className="tutorial-step tutorial-step-finish">
          <Step number="09" title="Export to USB and project"><p>Export the finished timeline as a video. Copy it to a USB key, connect the key to the projector, and play it full screen on repeat.</p></Step>
          <div className="tutorial-finish-flow"><div><span>1</span><strong>Export video</strong><small>Timeline toolbar</small></div><b>→</b><div><span>2</span><strong>Copy to USB</strong><small>Eject safely</small></div><b>→</b><div><span>3</span><strong>Plug into projector</strong><small>Select USB / Media</small></div><b>→</b><div><span>4</span><strong>Play on loop</strong><small>Full screen</small></div></div>
          <Media className="tutorial-finale-image" src="assets/onboarding/photo-3d-asset-choice.webp" alt="Sculpture ready for projection mapping" />
        </section>
      </div>

      <section className="tutorial-cta"><img src="assets/icons/mapshroom-icon-transparent-512.png" alt="" /><p>Everything is ready.</p><h2>Make the sculpture move.</h2><Link to="/" className="tutorial-primary-button">Open Mapshroom →</Link></section>
      <footer className="tutorial-footer"><span>Mapshroom</span><span>Camera to canvas, without the complexity.</span><Link to="/">Workspace</Link></footer>
    </main>
  );
}
