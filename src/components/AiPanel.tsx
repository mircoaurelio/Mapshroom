import { useEffect, useState } from 'react';
import { PanelSection } from './PanelSection';

const SHADER_PROMPT_PLACEHOLDERS = [
  'Make the surface ripple like liquid chrome',
  'Create slow waves of glowing blue light',
  'Turn the subject into pulsing molten lava',
  'Add a neon outline that follows the silhouette',
  'Project vines that grow across the surface',
  'Create an iridescent oil-slick distortion',
  'Fill the subject with a drifting starfield',
  'Make colorful light react to the depth map',
  'Build a soft breathing bioluminescent effect',
  'Transform the image into animated stained glass',
] as const;

const TYPE_INTERVAL_MS = 48;
const DOT_INTERVAL_MS = 280;
const PHRASE_HOLD_MS = 900;

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
  aiLoading: boolean;
  feedbackMessage: string;
  feedbackTone: 'idle' | 'loading' | 'success' | 'error';
  shaderError: string;
  onPromptChange: (value: string) => void;
  onPromptFocus: () => void;
  onSubmit: () => void;
  onFixError: () => void;
}

export function AiPanel({
  prompt,
  aiLoading,
  feedbackMessage,
  feedbackTone,
  shaderError,
  onPromptChange,
  onPromptFocus,
  onSubmit,
  onFixError,
}: AiPanelProps) {
  const showFeedback =
    Boolean(feedbackMessage) && (feedbackTone !== 'error' || feedbackMessage !== shaderError);
  const promptPlaceholder = useShaderPromptPlaceholder(!prompt);

  return (
    <PanelSection>
      <div className="stack gap-md ai-panel-stack">
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

        <button
          type="button"
          className="primary-button primary-button-hero"
          disabled={aiLoading}
          onClick={onSubmit}
        >
          {aiLoading ? 'Generating And Applying...' : 'Generate Shader'}
        </button>

        {showFeedback ? (
          <div className={`ai-feedback ai-feedback-${feedbackTone}`}>{feedbackMessage}</div>
        ) : null}
      </div>
    </PanelSection>
  );
}
