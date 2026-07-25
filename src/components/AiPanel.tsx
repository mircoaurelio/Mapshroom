import { useEffect, useState } from 'react';
import type { AiGenerationRoute } from '../lib/aiRoute';
import { PanelSection } from './PanelSection';

const SHADER_PROMPT_PLACEHOLDERS = [
  'Morph slow chrome waves into the depth map, affect only non-black pixels, keep pure black unchanged, and add depth, threshold, speed, center X/Y/Z, and gloss controls',
  'Fill green regions with repeating glossy 3D bulb-eyes, preserve every other color, and add hue tolerance, eye size, spacing, blink speed, iris color, and light X/Y/Z controls',
  'Use the current grayscale image as a depth map to morph animated contour lines around its relief; affect only non-black pixels and expose depth, spacing, thickness, speed, and two colors',
  'Turn red regions into molten veins that branch toward bright areas, leave all other colors untouched, and add hue tolerance, heat, crack scale, flow speed, glow, and blend controls',
  'Morph a moving spotlight into the depth map so it follows the surface relief, affect only non-black pixels, and add light X/Y/Z, depth strength, ambient light, gloss, and shadow softness',
  'Detect the subject silhouette and draw two animated rims around it, using separate inner and outer colors plus controls for width, softness, travel speed, glow, and background blend',
  'Treat luminance as a depth map and morph horizontal scanlines around the raised surface; affect only non-black pixels and add relief, line density, distortion, speed, contrast, and color controls',
  'Send warm colors outward and cool colors inward from a movable center, preserving the source between waves and exposing center X/Y, radius, speed, softness, distortion, and effect mix',
  'Morph liquid-metal reflections into the depth map, affect only non-black pixels, preserve transparency, and add depth, reflection scale, speed, light X/Y/Z, contrast, and brightness controls',
  'Build a perspective grid aimed at a movable vanishing point, bend its intersections with source luminance, and add vanishing X/Y, perspective depth, spacing, line width, speed, and glow controls',
  'Read the image as a depth map and morph near, middle, and far regions into different moving color bands; affect only non-black pixels and expose depth thresholds, softness, speed, and palette controls',
  'Replace a selected color range with rounded animated pixel cells, preserve colors outside the mask, and add target color, tolerance, cell size, roundness, spacing, pulse speed, and blend controls',
  'Morph a seamless radial pulse into the depth map so deeper areas respond later, affect only non-black pixels, and add loop duration, depth delay, center X/Y/Z, wave width, speed, and glow controls',
  'Grow procedural vines from the silhouette toward bright pixels, keep the source visible beneath them, and expose branch density, thickness, growth speed, curl, glow, seed, and vine color controls',
  'Use the depth map to morph a chrome relief that changes from flat to deeply sculpted; affect only non-black pixels and add morph amount, depth, light X/Y/Z, gloss, threshold, and blend controls',
  'Turn bright regions into floating 3D spheres whose size follows luminance, preserve darker regions, and add brightness threshold, sphere size, spacing, depth, rotation speed, light position, and color',
  'Morph soft bioluminescent skin into the depth map, affect only non-black pixels, and expose relief strength, pulse speed, edge glow, threshold softness, base color, highlight color, and brightness',
  'Convert strong image edges into moving electric dashes while preserving the interior, with controls for sensitivity, dash length, gap, thickness, direction, speed variation, glow, and two colors',
  'Morph animated elevation rings into the depth map and let each ring follow the relief; affect only non-black pixels and add depth, spacing, width, travel speed, center X/Y, and contour color',
  'Cover the visible subject with hexagonal tiles that tilt at different times, preserve transparency, and add cell size, border width, depth, delay randomness, rotation speed, light X/Y/Z, and color',
  'Treat the grayscale texture as a depth map and morph colored fog into its distant areas; affect only non-black pixels and expose depth threshold, fog density, movement speed, softness, tint, and blend',
  'Create a deterministic seamless loop where noisy regions move at different speeds and directions, with controls for seed, loop seconds, region scale, delay range, speed variation, intensity, and pause',
  'Morph an iridescent oil-slick reflection into the depth map, affect only non-black pixels, and add depth influence, color frequency, distortion scale, motion speed, gloss, threshold, and effect blend',
  'Transform only blue regions into moving water caustics, keep the remaining image unchanged, and expose hue tolerance, ripple scale, refraction, travel direction, speed, highlights, and mask softness',
  'Morph a crystalline frost pattern into the depth map so raised details freeze first, affect only non-black pixels, and add depth sensitivity, crystal scale, growth speed, refraction, edge glow, and tint',
  'Split strong edges into offset red, green, and blue echoes, animate the offsets in a seamless loop, and add channel distance, edge threshold, line softness, pulse speed, brightness, and blend controls',
  'Use the current texture as a depth map and morph pixel blocks from shallow to extruded relief; affect only non-black pixels and expose block size, depth, spacing, rotation, speed, light X/Y/Z, and contrast',
  'Turn low-saturation regions into drifting colored fog while preserving vivid colors, with controls for saturation threshold, noise scale, direction, speed, opacity, edge softness, and two fog colors',
  'Morph a virtual light sweep into the depth map so it wraps around the surface, affect only non-black pixels, and add depth, start X/Y, end X/Y, light Z, width, softness, speed, and light color',
  'Rebuild the subject as breathing halftone dots whose size follows luminance, preserving the original alpha and exposing dot scale, minimum size, maximum size, spacing, pulse speed, and two colors',
  'Morph a rotating tunnel into the depth map and let its radius react to surface height; affect only non-black pixels and add depth, center X/Y/Z, radius, twist, speed, threshold, and glow controls',
  'Apply glossy plasma only to pixels darker than a controllable threshold, preserve brighter details, and expose mask softness, plasma scale, flow direction, speed, glow, color, and source blend',
  'Use luminance as a depth map to morph mirrored waves across the relief without mirroring the source; affect only non-black pixels and add depth, symmetry axis, center X/Y, speed, width, and color controls',
  'Transform the visible subject into animated Voronoi stained glass, keep the background untouched, and add cell scale, border width, refraction, distortion speed, light direction, palette, and source mix',
  'Morph a field of glossy 3D droplets into the depth map so their size follows relief, affect only non-black pixels, and add depth, droplet scale, spacing, wobble, gloss, light X/Y/Z, and tint controls',
  'Make a scanner travel forward and backward with smooth acceleration, selecting only a chosen luminance range and exposing range width, scan width, softness, speed, easing, color, and trail glow',
  'Morph animated marble veins into the depth map so they wrap around raised details, affect only non-black pixels, and expose depth, vein scale, turbulence, flow speed, stone color, vein color, and gloss',
  'Fold only the subject into a rotating kaleidoscope while leaving the background unchanged, with controls for segment count, center X/Y, rotation speed, zoom, distortion, edge feathering, and blend',
  'Morph a soft halo into the depth map and delay it by distance from the effect center; affect only non-black pixels and add depth, center X/Y/Z, radius, delay, softness, pulse speed, and halo color',
  'Turn highlights into moving holographic foil while shadows retain the original image, and add highlight threshold, rainbow density, direction, speed, gloss, flicker, mask softness, and effect blend',
  'Use the grayscale input as a depth map and morph topographic light bands over its surface; affect only non-black pixels and expose depth, band count, width, travel speed, light X/Y/Z, and two colors',
  'Break the subject into mosaic tiles that flip at different times, preserve its silhouette and alpha, and add tile size, flip depth, delay randomness, rotation direction, speed, shadow strength, and tint',
  'Morph a faceted crystal surface into the depth map and make raised areas catch the light first; affect only non-black pixels and add depth, facet scale, light X/Y/Z, rotation, refraction, and brightness',
  'Reveal the image with moving light rays that inherit each source pixel color, preserve unlit regions, and expose ray angle, width, density, speed, softness, color influence, brightness, and blend',
  'Morph a field of soft metaballs into the depth map so they merge across the relief, affect only non-black pixels, and add depth, blob scale, count, softness, speed, threshold, two colors, and light Z',
  'Push grid intersections away from two movable centers and let both centers orbit independently, with controls for center A X/Y, center B X/Y, force, radius, damping, grid spacing, speed, and glow',
  'Morph a projector-safe neon relief into the depth map, affect only non-black pixels, preserve alpha and pure black, and add depth, threshold softness, glow, maximum brightness, gamma, speed, and color',
  'Apply an aged metallic patina that spreads from dark edges toward brighter regions, preserving the source beneath it and exposing growth speed, noise scale, edge attraction, metal color, patina color, and blend',
  'Use the depth map to morph concentric 3D rings out of the surface, affect only non-black pixels, and add depth, center X/Y/Z, ring spacing, height, sequence delay, rotation, speed, glow, and brightness limit',
  'Create a lightweight projection shader that keeps circles aspect-correct, animates a color-selective radial wave, preserves alpha, and exposes target color, tolerance, center X/Y, scale, speed, glow, and output limit',
] as const;

const TYPE_INTERVAL_MS = 18;
const DOT_INTERVAL_MS = 150;
const PHRASE_HOLD_MS = 1400;

const AI_ROUTE_OPTIONS: Array<{
  value: AiGenerationRoute;
  label: string;
  note: string;
  mark: string;
}> = [
  { value: 'chatgpt', label: 'ChatGPT', note: 'Free handoff', mark: 'G' },
  { value: 'perplexity', label: 'Perplexity', note: 'Free handoff', mark: 'P' },
  { value: 'local', label: 'Local model', note: 'Private & offline', mark: '◎' },
  { value: 'api', label: 'API', note: 'Connected provider', mark: '⌁' },
];

interface PlaceholderAnimation {
  phraseIndex: number;
  characterCount: number;
  dotCount: number;
  phase: 'typing' | 'dots';
}

function useShaderPromptPlaceholder(active: boolean) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [animation, setAnimation] = useState<PlaceholderAnimation>({
    phraseIndex: 0,
    characterCount: 0,
    dotCount: 0,
    phase: 'typing',
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleMotionPreferenceChange);
    return () => mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
  }, []);

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      return;
    }

    const phrase = SHADER_PROMPT_PLACEHOLDERS[animation.phraseIndex];
    const delay =
      animation.phase === 'typing'
        ? animation.characterCount < phrase.length
          ? TYPE_INTERVAL_MS
          : DOT_INTERVAL_MS
        : animation.dotCount < 3
          ? DOT_INTERVAL_MS
          : PHRASE_HOLD_MS;

    const timeoutId = window.setTimeout(() => {
      setAnimation((current) => {
        const currentPhrase = SHADER_PROMPT_PLACEHOLDERS[current.phraseIndex];

        if (current.phase === 'typing') {
          if (current.characterCount < currentPhrase.length) {
            return { ...current, characterCount: current.characterCount + 1 };
          }

          return { ...current, dotCount: 1, phase: 'dots' };
        }

        if (current.dotCount < 3) {
          return { ...current, dotCount: current.dotCount + 1 };
        }

        return {
          phraseIndex: (current.phraseIndex + 1) % SHADER_PROMPT_PLACEHOLDERS.length,
          characterCount: 0,
          dotCount: 0,
          phase: 'typing',
        };
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [active, animation, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return SHADER_PROMPT_PLACEHOLDERS[0];
  }

  const phrase = SHADER_PROMPT_PLACEHOLDERS[animation.phraseIndex];
  return `${phrase.slice(0, animation.characterCount)}${'.'.repeat(animation.dotCount)}`;
}

interface AiPanelProps {
  prompt: string;
  selectedRoute: AiGenerationRoute;
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  onPromptChange: (value: string) => void;
  onPromptFocus: () => void;
  onRouteChange: (route: AiGenerationRoute) => void;
  onPasteShader: () => Promise<void>;
  onPastePosition: () => Promise<void>;
  onSubmit: () => void;
  onFixError: () => void;
}

export function AiPanel({
  prompt,
  selectedRoute,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  onPromptChange,
  onPromptFocus,
  onRouteChange,
  onPasteShader,
  onPastePosition,
  onSubmit,
  onFixError,
}: AiPanelProps) {
  const [pasteMenuOpen, setPasteMenuOpen] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);
  const promptPlaceholder = useShaderPromptPlaceholder(!prompt);
  const selectedRouteOption =
    AI_ROUTE_OPTIONS.find((option) => option.value === selectedRoute) ??
    AI_ROUTE_OPTIONS[0];

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
        <div className="ai-prompt-composer">
          <textarea
            className="prompt-field prompt-field-hero"
            aria-label="Shader prompt"
            placeholder={promptPlaceholder}
            value={prompt}
            onFocus={onPromptFocus}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!aiLoading) {
                  onSubmit();
                }
              }
            }}
          />
          <div className="ai-prompt-composer-footer">
            <div className="ai-prompt-add-shell">
              <button
                type="button"
                className={`ai-prompt-add-button ${pasteMenuOpen ? 'active' : ''}`}
                aria-label="Load from clipboard"
                aria-haspopup="menu"
                aria-expanded={pasteMenuOpen}
                title="Load from clipboard"
                onClick={() => setPasteMenuOpen((current) => !current)}
              >
                <span aria-hidden="true">+</span>
              </button>
              {pasteMenuOpen ? (
                <div className="ai-prompt-add-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPasteShader();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">{'{}'}</span>
                    <span>
                      <strong>Paste shader</strong>
                      <small>Clipboard → code</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPasteMenuOpen(false);
                      void onPastePosition();
                    }}
                  >
                    <span className="ai-prompt-add-menu-icon" aria-hidden="true">⌖</span>
                    <span>
                      <strong>Paste position</strong>
                      <small>Clipboard → mapping</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="ai-prompt-route-actions">
              <div
                className="ai-prompt-route-select"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setRouteMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setRouteMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className={`ai-prompt-route-trigger ${routeMenuOpen ? 'active' : ''}`}
                  aria-label={`Shader AI model: ${selectedRouteOption.label}`}
                  aria-haspopup="listbox"
                  aria-expanded={routeMenuOpen}
                  onClick={() => setRouteMenuOpen((current) => !current)}
                >
                  <span className="ai-prompt-route-mark" aria-hidden="true">
                    {selectedRouteOption.mark}
                  </span>
                  <span>{selectedRouteOption.label}</span>
                  <span className="ai-prompt-route-chevron" aria-hidden="true">⌄</span>
                </button>
                {routeMenuOpen ? (
                  <div className="ai-prompt-route-menu" role="listbox" aria-label="Shader AI model">
                    {AI_ROUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === selectedRoute}
                        className={option.value === selectedRoute ? 'active' : ''}
                        onClick={() => {
                          onRouteChange(option.value);
                          setRouteMenuOpen(false);
                        }}
                      >
                        <span className="ai-prompt-route-mark" aria-hidden="true">
                          {option.mark}
                        </span>
                        <span className="ai-prompt-route-menu-copy">
                          <strong>{option.label}</strong>
                          <small>{option.note}</small>
                        </span>
                        {option.value === selectedRoute ? (
                          <span className="ai-prompt-route-check" aria-hidden="true">✓</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="ai-prompt-send-button"
                disabled={aiLoading}
                aria-label={aiLoading ? 'Generating shader' : 'Generate shader'}
                title={aiLoading ? 'Generating…' : 'Generate shader'}
                onClick={onSubmit}
              >
                <span aria-hidden="true">{aiLoading ? '…' : '↑'}</span>
              </button>
            </div>
          </div>
        </div>

        {shaderError ? (
          <div className="error-panel shader-chat-error">
            {shaderError}
            <button
              type="button"
              className="fix-error-button"
              disabled={aiLoading}
              onClick={onFixError}
            >
              {aiLoading ? 'Fixing...' : 'Fix Error'}
            </button>
          </div>
        ) : null}

        {showFeedback ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
