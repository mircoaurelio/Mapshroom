import {
  type CSSProperties,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { AiPanel } from '../components/AiPanel';
import { ApiSettingsDialog } from '../components/ApiSettingsDialog';
import { AssetLibraryDialog } from '../components/AssetLibraryDialog';
import { AssetSegmentationDialog } from '../components/AssetSegmentationDialog';
import { type MobilePanelKey, MobileChrome } from '../components/MobileChrome';
import { MappingPad, type MappingAction } from '../components/MappingPad';
import { MappingPanel } from '../components/MappingPanel';
import { MobilePrecisionOverlay } from '../components/MobilePrecisionOverlay';
import { MobileUniformOverlay } from '../components/MobileUniformOverlay';
import { PresetBrowserDialog } from '../components/PresetBrowserDialog';
import { ProjectLibraryDialog } from '../components/ProjectLibraryDialog';
import { ShareProjectDialog } from '../components/ShareProjectDialog';
import {
  ShaderCodeSection,
  ShaderStudioControlsSection,
  ShaderVersionTrailSection,
  StudioPanel,
} from '../components/StudioPanel';
import { TimelineExportDialog } from '../components/TimelineExportDialog';
import { TimelineStepAssetPanel } from '../components/TimelineStepAssetPanel';
import { TimelineBar, TimelineDialog } from '../components/TimelineBar';
import { TimelineStageRenderer } from '../components/TimelineStageRenderer';
import { UniformPanel } from '../components/UniformPanel';
import type { TimelineSelectionInfo } from '../components/TimelineSelectionBanner';
import { MidiControllerPanel } from '../components/MidiControllerPanel';
import { MidiControllerGuideDialog } from '../components/MidiControllerGuideDialog';
import { SliceStudioDialog } from '../components/SliceStudioDialog';
import { WorkspaceToolbar } from '../components/WorkspaceToolbar';
import { signalProjectReady } from '../components/BootScreenController';
import {
  getAnalyticsConsent,
  setAnalyticsAiPresence,
  signalOnboardingComplete,
  track,
  trackApiPresence,
  trackAppOpen,
  trackLlmRequest,
  trackUiClick,
} from '../lib/analytics';
import {
  ANTHROPIC_API_KEY_STORAGE_KEY,
  DEFAULT_ANTHROPIC_SHADER_MODEL,
  DEFAULT_STAGE_TRANSFORM,
  DEFAULT_GOOGLE_SHADER_MODEL,
  DEFAULT_OPENAI_SHADER_MODEL,
  DEFAULT_SHADERS,
  DEFAULT_UI_PREFERENCES,
  GOOGLE_API_KEY_STORAGE_KEY,
  OPENAI_API_KEY_STORAGE_KEY,
  createDefaultProject,
} from '../config';
import {
  getTransportTimeSeconds,
  pauseTransport,
  playTransport,
  restoreTransport,
  seekTransport,
} from '../lib/clock';
import {
  DEFAULT_BUNDLED_ASSET_ID,
  mergeBundledAssets,
} from '../lib/bundledAssets';
import { isBundledProjectSessionId } from '../lib/bundledProjects';
import { parseShaderName, parseUniforms, syncUniformValues } from '../lib/shader';
import { requestShaderMutation } from '../lib/shaderGeneration';
import { LEGACY_ULTRA_MODEL_ID, ULTRA_MODEL_ID } from '../lib/localAi';
import {
  getRenderableShaderUniformValues,
  validateShaderCodeCompilation,
} from '../lib/shaderState';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  createTimelineShaderStep,
  getShaderTimelineDuration,
  getEffectiveTimelinePlaybackSteps,
  getTimelineCycleSteps,
  resolveShaderTimelineState,
  applyMixDurationToTimelineSteps,
  isTimelineStepEnabled,
  normalizeTimelineTransitionEffect,
  roundTimelineSeconds,
  scaleTimelineStepDurations,
  shouldUseSharedTransition,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import { normalizeTimelineStepAssetSettings } from '../lib/timelineAssetSettings';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { createSessionSync } from '../lib/sessionSync';
import { useMidiController } from '../hooks/useMidiController';
import type {
  MidiControllerMode,
  MidiTimelineTransportAction,
} from '../lib/midi/types';
import { createMidiOutputSync } from '../lib/midi/outputSync';
import {
  createProjectShareLink,
  importProjectFromSharedUrl,
  type ProjectShareLinkResult,
} from '../lib/projectShare';
import {
  clearPersistedSiteData,
  loadProjectLibrary,
  deleteAssetBlob,
  loadProjectDocument,
  getOrCreateSessionId,
  loadShaderSliderCache,
  loadUiPreferences,
  persistActiveSessionId,
  putAssetBlob,
  removeProjectFromLibrary,
  saveProjectToLibrary,
  saveProjectDocument,
  saveShaderSliderCache,
  saveUiPreferences,
} from '../lib/storage';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import { blankShaderTemplate } from '../shaders/templates/blankShader';
import type {
  AiSettings,
  AssetKind,
  AssetRecord,
  MobileUiMode,
  ProjectDocument,
  ProjectLibraryEntry,
  SavedShader,
  ShaderVersion,
  ShaderUniformValue,
  ShaderUniformValueMap,
  StageTransform,
  TimelineStagePreviewMode,
  TimelineTransitionEffect,
  UiPreferences,
  WorkspaceMode,
} from '../types';

function hasConfiguredShaderAi(settings: AiSettings): boolean {
  if (settings.shaderRuntime === 'local') return Boolean(settings.localShaderModel);
  if (settings.shaderRuntime !== 'api') return false;
  if (settings.shaderProvider === 'openai') {
    return Boolean(settings.openaiApiKey.trim() && settings.openaiShaderModel);
  }
  if (settings.shaderProvider === 'anthropic') {
    return Boolean(settings.anthropicApiKey.trim() && settings.anthropicShaderModel);
  }
  return Boolean(settings.googleApiKey.trim() && settings.googleShaderModel);
}

function getAnalyticsAiPresence(settings: AiSettings) {
  return {
    has_api_key: hasConfiguredShaderAi(settings),
    shader_provider: settings.shaderProvider,
    shader_runtime: settings.shaderRuntime,
  };
}

const MIDI_MIX_DURATION_MIN_SECONDS = 0.05;
const MIDI_MIX_DURATION_MAX_SECONDS = 8;
const MIDI_MIX_DURATION_STEP_SECONDS = 0.25;
const MIDI_MANUAL_MIX_MIN_TRIGGER = 0.02;
const MIDI_MANUAL_MIX_MAX_TRIGGER = 0.97;
const TIMELINE_RANDOM_RESEED_EPSILON_SECONDS = 0.05;
const ONBOARDING_ENTRY_COOKIE = 'mapshroom_onboarding_entries';
const ONBOARDING_ENTRY_SESSION_KEY = 'mapshroom:onboarding-entry-counted';
const ONBOARDING_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ONBOARDING_AUTO_OPEN_LIMIT = 3;

const ONBOARDING_SETUP_STEP_COUNT = 2;
const ONBOARDING_CALLOUT_GAP_PX = 16;
const ONBOARDING_CALLOUT_MARGIN_PX = 16;
const ONBOARDING_COPY = {
  en: {
    stepLabel: (currentStep: number, totalSteps: number) => `Step ${currentStep} of ${totalSteps}`,
    dismissPermanently: "Don't show again",
    back: 'Back',
    next: 'Next',
    startMapping: 'Start mapping',
    closeGuide: 'Close guide',
    workflowTitle: 'Projection mapping workflow',
    setupStepOneEyebrow: 'Step 1',
    setupStepOneTitle: 'Capture aligned source material',
    setupStepTwoEyebrow: 'Step 2',
    setupStepTwoTitle: 'Prepare the photo to upload',
    uiGuideLabel: 'Workspace area guide',
    uiGuideTitle: 'What each macro area controls',
    workflowSteps: [
      {
        title: 'Prepare the material',
        copy:
          'Start with a projector, a phone for the reference photo, and a reliable way to connect the projector to a phone or computer.',
        image: 'assets/onboarding/materials-needed.webp',
      },
      {
        title: 'Shoot from the projector view',
        copy:
          'Stand where the projector sees the subject and take the photo from that same perspective. This keeps the image aligned with the projection.',
        image: 'assets/onboarding/capture-from-projector-view.webp',
      },
      {
        title: 'Match the lens position',
        copy:
          'Hold the phone close to the projector lens direction while shooting. The closer the camera perspective is to the projector perspective, the easier the mapping will be.',
        image: 'assets/onboarding/align-phone-camera.webp',
      },
    ],
    photoPreparationSteps: [
      {
        title: 'Start from the source photo',
        badge: 'Source',
        copy:
          'Use the captured subject photo as the starting point. This is the image you will clean, adapt, and prepare for the projection workflow.',
        image: 'assets/onboarding/photo-source-garden.webp',
      },
      {
        title: 'Remove the background',
        badge: 'Required',
        copy:
          'Use the AI tools built into the app to remove the background and prepare a clean subject for projection.',
        image: 'assets/onboarding/photo-background-removed.webp',
      },
      {
        title: 'Choose the final 3D photo',
        badge: 'Creative',
        copy:
          'In the 3D photo step, modify the image as much as needed and choose the asset that best matches the subject and the final projected look.',
        image: 'assets/onboarding/photo-3d-asset-choice.webp',
      },
    ],
    uiAreas: [
      {
        title: 'Load Assets And Output',
        eyebrow: 'Windows',
        placement: 'topbar',
        points: [
          'Use File, Shader, and View for project, shader, and layout commands.',
          'Click Load Asset to open the asset window and choose or import the image to map.',
          'Click Output to open the dedicated projection window.',
          'Drag the opened Output window onto the projector screen and use it there.',
        ],
      },
      {
        title: 'Canvas',
        eyebrow: 'Preview',
        placement: 'canvas',
        points: [
          'Check the live projection preview.',
          'Compare the mapped image with the real subject.',
          'Use move mode when the projection needs alignment.',
        ],
      },
      {
        title: 'Code Control',
        eyebrow: 'Shader',
        placement: 'code',
        points: [
          'Edit or paste shader code.',
          'Use the AI tools built into the app to generate a shader from a prompt.',
          'Use presets when starting from a known effect.',
          'Save versions before major changes.',
        ],
      },
      {
        title: 'Slider And Position Control',
        eyebrow: 'Mapping',
        placement: 'controls',
        points: [
          'Tune shader values with sliders.',
          'Move, resize, and reset the mapped image.',
          'Use smaller precision values for final alignment.',
        ],
      },
      {
        title: 'Move The Mapping',
        eyebrow: 'Tap Grid',
        placement: 'mapping',
        points: [
          'Scroll to Stage Mapping and Tap Grid in the left controls.',
          'Turn Move Mode On before aligning the projection.',
          'Use Tap Grid to nudge, resize, and rotate the image onto the real subject.',
        ],
      },
      {
        title: 'Timeline',
        eyebrow: 'Sequence',
        placement: 'timeline',
        points: [
          'Arrange shader steps over time.',
          'Control transitions between looks.',
          'Play the full sequence before projecting.',
        ],
      },
    ],
  },
  it: {
    stepLabel: (currentStep: number, totalSteps: number) => `Passo ${currentStep} di ${totalSteps}`,
    dismissPermanently: 'Non mostrare più',
    back: 'Indietro',
    next: 'Avanti',
    startMapping: 'Inizia mapping',
    closeGuide: 'Chiudi guida',
    workflowTitle: 'Flusso di projection mapping',
    setupStepOneEyebrow: 'Passo 1',
    setupStepOneTitle: 'Acquisisci materiale sorgente allineato',
    setupStepTwoEyebrow: 'Passo 2',
    setupStepTwoTitle: 'Prepara la foto da caricare',
    uiGuideLabel: "Guida alle aree dell'area di lavoro",
    uiGuideTitle: 'Cosa controlla ogni macro area',
    workflowSteps: [
      {
        title: 'Prepara il materiale',
        copy:
          'Parti da un proiettore, un telefono per la foto di riferimento e un modo affidabile per collegare il proiettore a un telefono o a un computer.',
        image: 'assets/onboarding/materials-needed.webp',
      },
      {
        title: 'Scatta dalla vista del proiettore',
        copy:
          "Mettiti dove il proiettore vede il soggetto e scatta la foto dalla stessa prospettiva. Così l'immagine resta allineata alla proiezione.",
        image: 'assets/onboarding/capture-from-projector-view.webp',
      },
      {
        title: "Allinea la posizione dell'obiettivo",
        copy:
          "Tieni il telefono vicino alla direzione dell'obiettivo del proiettore mentre scatti. Più la prospettiva della camera è vicina a quella del proiettore, più semplice sarà il mapping.",
        image: 'assets/onboarding/align-phone-camera.webp',
      },
    ],
    photoPreparationSteps: [
      {
        title: 'Parti dalla foto sorgente',
        badge: 'Sorgente',
        copy:
          'Usa la foto acquisita del soggetto come punto di partenza. Questa è l\'immagine che pulirai, adatterai e preparerai per il flusso di proiezione.',
        image: 'assets/onboarding/photo-source-garden.webp',
      },
      {
        title: 'Rimuovi lo sfondo',
        badge: 'Richiesto',
        copy:
          "Usa gli strumenti AI integrati nell'app per rimuovere lo sfondo e preparare un soggetto pulito per la proiezione.",
        image: 'assets/onboarding/photo-background-removed.webp',
      },
      {
        title: 'Scegli la foto 3D finale',
        badge: 'Creativo',
        copy:
          "Nel passaggio della foto 3D, modifica l'immagine quanto serve e scegli l'asset più adatto al soggetto e al risultato finale proiettato.",
        image: 'assets/onboarding/photo-3d-asset-choice.webp',
      },
    ],
    uiAreas: [
      {
        title: 'Carica asset e output',
        eyebrow: 'Finestre',
        placement: 'topbar',
        points: [
          'Usa File, Shader e View per i comandi di progetto, shader e layout.',
          "Clicca Load Asset per aprire la finestra degli asset e scegliere o importare l'immagine da mappare.",
          'Clicca Output per aprire la finestra dedicata alla proiezione.',
          'Trascina la finestra Output aperta sullo schermo del proiettore e usala lì.',
        ],
      },
      {
        title: 'Canvas',
        eyebrow: 'Anteprima',
        placement: 'canvas',
        points: [
          "Controlla l'anteprima live della proiezione.",
          "Confronta l'immagine mappata con il soggetto reale.",
          'Usa la modalità di spostamento quando la proiezione deve essere allineata.',
        ],
      },
      {
        title: 'Controllo codice',
        eyebrow: 'Shader',
        placement: 'code',
        points: [
          'Modifica o incolla codice shader.',
          "Usa gli strumenti AI integrati nell'app per generare uno shader da un prompt.",
          'Usa i preset quando parti da un effetto noto.',
          'Salva le versioni prima delle modifiche importanti.',
        ],
      },
      {
        title: 'Slider e controllo posizione',
        eyebrow: 'Mapping',
        placement: 'controls',
        points: [
          'Regola i valori dello shader con gli slider.',
          "Sposta, ridimensiona e reimposta l'immagine mappata.",
          "Usa valori di precisione più piccoli per l'allineamento finale.",
        ],
      },
      {
        title: 'Sposta il mapping',
        eyebrow: 'Tap Grid',
        placement: 'mapping',
        points: [
          'Scorri fino a Stage Mapping e Tap Grid nei controlli a sinistra.',
          'Attiva Move Mode prima di allineare la proiezione.',
          "Usa Tap Grid per spostare, ridimensionare e ruotare l'immagine sul soggetto reale.",
        ],
      },
      {
        title: 'Timeline',
        eyebrow: 'Sequenza',
        placement: 'timeline',
        points: [
          'Disponi nel tempo i passaggi shader.',
          'Controlla le transizioni tra i look.',
          "Riproduci l'intera sequenza prima di proiettare.",
        ],
      },
    ],
  },
} as const;

type OnboardingLocale = keyof typeof ONBOARDING_COPY;

function resolveOnboardingLocale(): OnboardingLocale {
  const preferredLanguages =
    typeof navigator !== 'undefined'
      ? [...navigator.languages, navigator.language].filter(Boolean)
      : [];

  return preferredLanguages.some((language) => language.toLowerCase().startsWith('it'))
    ? 'it'
    : 'en';
}

function createTimelineRandomSeedToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCookieValue(name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(encodedName));

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
}

function setCookieValue(name: string, value: string): void {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; Max-Age=${ONBOARDING_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function readOnboardingEntryCount(): number {
  const rawValue = getCookieValue(ONBOARDING_ENTRY_COOKIE);
  const count = rawValue ? Number.parseInt(rawValue, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function registerOnboardingEntry(): number {
  if (sessionStorage.getItem(ONBOARDING_ENTRY_SESSION_KEY) === 'true') {
    return readOnboardingEntryCount();
  }

  const nextCount = readOnboardingEntryCount() + 1;
  setCookieValue(ONBOARDING_ENTRY_COOKIE, String(nextCount));
  sessionStorage.setItem(ONBOARDING_ENTRY_SESSION_KEY, 'true');
  return nextCount;
}

function dismissOnboardingPermanently(): void {
  setCookieValue(ONBOARDING_ENTRY_COOKIE, '99');
  sessionStorage.setItem(ONBOARDING_ENTRY_SESSION_KEY, 'true');
}

function clampOnboardingCalloutPosition(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveOnboardingCalloutStyle(
  highlightRect: { top: number; left: number; width: number; height: number },
  calloutRect: { width: number; height: number },
): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minLeft = ONBOARDING_CALLOUT_MARGIN_PX;
  const minTop = ONBOARDING_CALLOUT_MARGIN_PX;
  const maxLeft = Math.max(minLeft, viewportWidth - calloutRect.width - ONBOARDING_CALLOUT_MARGIN_PX);
  const maxTop = Math.max(minTop, viewportHeight - calloutRect.height - ONBOARDING_CALLOUT_MARGIN_PX);
  const rightSpace =
    viewportWidth - (highlightRect.left + highlightRect.width) - ONBOARDING_CALLOUT_GAP_PX;
  const leftSpace = highlightRect.left - ONBOARDING_CALLOUT_GAP_PX;
  const topSpace = highlightRect.top - ONBOARDING_CALLOUT_GAP_PX;
  const bottomSpace =
    viewportHeight - (highlightRect.top + highlightRect.height) - ONBOARDING_CALLOUT_GAP_PX;
  const centeredTop = clampOnboardingCalloutPosition(
    highlightRect.top + highlightRect.height / 2 - calloutRect.height / 2,
    minTop,
    maxTop,
  );
  const centeredLeft = clampOnboardingCalloutPosition(
    highlightRect.left + highlightRect.width / 2 - calloutRect.width / 2,
    minLeft,
    maxLeft,
  );

  if (rightSpace >= calloutRect.width + ONBOARDING_CALLOUT_MARGIN_PX) {
    return {
      left: `${highlightRect.left + highlightRect.width + ONBOARDING_CALLOUT_GAP_PX}px`,
      top: `${centeredTop}px`,
    };
  }

  if (leftSpace >= calloutRect.width + ONBOARDING_CALLOUT_MARGIN_PX) {
    return {
      left: `${highlightRect.left - calloutRect.width - ONBOARDING_CALLOUT_GAP_PX}px`,
      top: `${centeredTop}px`,
    };
  }

  if (topSpace >= calloutRect.height + ONBOARDING_CALLOUT_MARGIN_PX) {
    return {
      left: `${centeredLeft}px`,
      top: `${highlightRect.top - calloutRect.height - ONBOARDING_CALLOUT_GAP_PX}px`,
    };
  }

  if (bottomSpace >= calloutRect.height + ONBOARDING_CALLOUT_MARGIN_PX) {
    return {
      left: `${centeredLeft}px`,
      top: `${highlightRect.top + highlightRect.height + ONBOARDING_CALLOUT_GAP_PX}px`,
    };
  }

  const bestSide = [
    { side: 'right', space: rightSpace },
    { side: 'left', space: leftSpace },
    { side: 'top', space: topSpace },
    { side: 'bottom', space: bottomSpace },
  ].sort((a, b) => b.space - a.space)[0]?.side;

  switch (bestSide) {
    case 'right':
      return {
        left: `${maxLeft}px`,
        top: `${centeredTop}px`,
      };
    case 'left':
      return {
        left: `${minLeft}px`,
        top: `${centeredTop}px`,
      };
    case 'top':
      return {
        left: `${centeredLeft}px`,
        top: `${minTop}px`,
      };
    default:
      return {
        left: `${centeredLeft}px`,
        top: `${maxTop}px`,
      };
  }
}

function useIsMobile(breakpoint = 960): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

interface OnboardingGuideProps {
  onClose: () => void;
  onDismissPermanently: () => void;
}

function OnboardingGuide({ onClose, onDismissPermanently }: OnboardingGuideProps) {
  const calloutCardRef = useRef<HTMLElement | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [locale] = useState<OnboardingLocale>(() => resolveOnboardingLocale());
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [calloutStyle, setCalloutStyle] = useState<CSSProperties | undefined>(undefined);
  const onboardingCopy = ONBOARDING_COPY[locale];
  const onboardingTotalStepCount = ONBOARDING_SETUP_STEP_COUNT + onboardingCopy.uiAreas.length;
  const activeUiArea =
    activeStepIndex >= ONBOARDING_SETUP_STEP_COUNT
      ? onboardingCopy.uiAreas[activeStepIndex - ONBOARDING_SETUP_STEP_COUNT]
      : null;
  const isLastStep = activeStepIndex === onboardingTotalStepCount - 1;
  const stepLabel = onboardingCopy.stepLabel(activeStepIndex + 1, onboardingTotalStepCount);
  const goToPreviousStep = () => {
    setHighlightRect(null);
    setCalloutStyle(undefined);
    setActiveStepIndex((currentValue) => Math.max(0, currentValue - 1));
  };
  const goToNextStep = () => {
    if (isLastStep) {
      onClose();
      return;
    }

    setHighlightRect(null);
    setCalloutStyle(undefined);
    setActiveStepIndex((currentValue) =>
      Math.min(onboardingTotalStepCount - 1, currentValue + 1),
    );
  };

  const navigationControls = (
    <div className="onboarding-navigation">
      <button type="button" className="secondary-button" onClick={onDismissPermanently}>
        {onboardingCopy.dismissPermanently}
      </button>
      <div className="onboarding-step-controls">
        <button
          type="button"
          className="secondary-button"
          disabled={activeStepIndex === 0}
          onClick={goToPreviousStep}
        >
          {onboardingCopy.back}
        </button>
        <button type="button" className="primary-button" onClick={goToNextStep}>
          {isLastStep ? onboardingCopy.startMapping : onboardingCopy.next}
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (!activeUiArea) {
      return;
    }

    let animationFrameId = 0;
    const targetSelector = `[data-onboarding-area="${activeUiArea.placement}"]`;
    const updateHighlightRect = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        const targetElement = document.querySelector<HTMLElement>(targetSelector);

        if (!targetElement) {
          setHighlightRect(null);
          return;
        }

        const rect = targetElement.getBoundingClientRect();
        const padding = 6;
        setHighlightRect({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: Math.min(window.innerWidth, rect.width + padding * 2),
          height: Math.min(window.innerHeight, rect.height + padding * 2),
        });
      });
    };

    const targetElement = document.querySelector<HTMLElement>(targetSelector);
    targetElement?.scrollIntoView({ block: 'center', inline: 'nearest' });

    updateHighlightRect();
    window.addEventListener('resize', updateHighlightRect);
    window.addEventListener('scroll', updateHighlightRect, true);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateHighlightRect)
      : null;

    if (targetElement) {
      resizeObserver?.observe(targetElement);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateHighlightRect);
      window.removeEventListener('scroll', updateHighlightRect, true);
      resizeObserver?.disconnect();
    };
  }, [activeUiArea]);

  useEffect(() => {
    if (!activeUiArea || !highlightRect) {
      return;
    }

    let animationFrameId = window.requestAnimationFrame(() => {
      const calloutCard = calloutCardRef.current;

      if (!calloutCard) {
        return;
      }

      const rect = calloutCard.getBoundingClientRect();
      setCalloutStyle(
        resolveOnboardingCalloutStyle(highlightRect, {
          width: rect.width,
          height: rect.height,
        }),
      );
    });

    const updateCalloutStyle = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        const calloutCard = calloutCardRef.current;

        if (!calloutCard) {
          return;
        }

        const rect = calloutCard.getBoundingClientRect();
        setCalloutStyle(
          resolveOnboardingCalloutStyle(highlightRect, {
            width: rect.width,
            height: rect.height,
          }),
        );
      });
    };

    window.addEventListener('resize', updateCalloutStyle);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCalloutStyle);
    };
  }, [activeUiArea, highlightRect]);

  const highlightStyle = highlightRect
    ? {
        top: `${highlightRect.top}px`,
        left: `${highlightRect.left}px`,
        width: `${highlightRect.width}px`,
        height: `${highlightRect.height}px`,
      }
    : undefined;

  return (
    <div
      className={`onboarding-overlay ${
        activeUiArea ? 'onboarding-overlay-ui-step' : 'onboarding-overlay-setup-step'
      }`}
      role="presentation"
    >
      {activeUiArea ? (
        <div className="onboarding-ui-highlights" aria-hidden="true">
          <span
            className={`onboarding-ui-highlight onboarding-ui-highlight-${activeUiArea.placement}`}
            style={highlightStyle}
          />
        </div>
      ) : null}

      {!activeUiArea ? (
        <section
          className="onboarding-panel onboarding-setup-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
        >
          <div className="onboarding-header">
            <div>
              <span className="panel-eyebrow">{stepLabel}</span>
              <h2 id="onboarding-title">{onboardingCopy.workflowTitle}</h2>
            </div>
            <button
              type="button"
              className="icon-button onboarding-close"
              onClick={onClose}
              aria-label={onboardingCopy.closeGuide}
            >
              X
            </button>
          </div>

          <div className="onboarding-body">
            {activeStepIndex === 0 ? (
              <section className="onboarding-section">
                <div className="onboarding-section-heading">
                  <span className="panel-eyebrow">{onboardingCopy.setupStepOneEyebrow}</span>
                  <h3>{onboardingCopy.setupStepOneTitle}</h3>
                </div>
                <div className="onboarding-workflow-grid">
                  {onboardingCopy.workflowSteps.map((step, index) => (
                    <article className="onboarding-workflow-card" key={step.title}>
                      <div className="onboarding-workflow-image-frame">
                        <img
                          src={`${import.meta.env.BASE_URL}${step.image}`}
                          alt=""
                          className={`onboarding-workflow-image ${
                            index < 2 ? 'onboarding-workflow-image-zoom' : ''
                          }`}
                        />
                      </div>
                      <div className="onboarding-step-index">{index + 1}</div>
                      <h4>{step.title}</h4>
                      <p>{step.copy}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeStepIndex === 1 ? (
              <section className="onboarding-section">
                <div className="onboarding-section-heading">
                  <span className="panel-eyebrow">{onboardingCopy.setupStepTwoEyebrow}</span>
                  <h3>{onboardingCopy.setupStepTwoTitle}</h3>
                </div>
                <div className="onboarding-photo-grid">
                  {onboardingCopy.photoPreparationSteps.map((step) => (
                    <article className="onboarding-workflow-card onboarding-photo-card" key={step.title}>
                      <div className="onboarding-workflow-image-frame">
                        <img
                          src={`${import.meta.env.BASE_URL}${step.image}`}
                          alt=""
                          className="onboarding-workflow-image"
                        />
                      </div>
                      <span className="onboarding-photo-badge">{step.badge}</span>
                      <h4>{step.title}</h4>
                      <p>{step.copy}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="onboarding-footer">{navigationControls}</div>
        </section>
      ) : null}

      {activeUiArea ? (
        <section
          className="onboarding-ui-callouts"
          aria-label={onboardingCopy.uiGuideLabel}
          role="dialog"
          aria-modal="true"
        >
          <article
            ref={calloutCardRef}
            className={`onboarding-area-card onboarding-area-card-${activeUiArea.placement} ${
              calloutStyle ? 'onboarding-area-card-positioned' : 'onboarding-area-card-measuring'
            }`}
            style={calloutStyle}
          >
            <div className="onboarding-area-card-header">
              <div>
                <span className="panel-eyebrow">{stepLabel}</span>
                <h3>{onboardingCopy.uiGuideTitle}</h3>
              </div>
              <button
                type="button"
                className="icon-button onboarding-close"
                onClick={onClose}
                aria-label={onboardingCopy.closeGuide}
              >
                X
              </button>
            </div>
            <span>{activeUiArea.eyebrow}</span>
            <h4>{activeUiArea.title}</h4>
            <ul>
              {activeUiArea.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {navigationControls}
          </article>
        </section>
      ) : null}
    </div>
  );
}

function detectAssetKind(file: File): AssetKind | null {
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  return null;
}

function clampDimension(value: number): number {
  return Math.max(-900, Math.min(1600, value));
}

function applyMappingTransform(transform: StageTransform, action: MappingAction): StageTransform {
  const next = { ...transform };

  switch (action) {
    case 'move-up':
      next.offsetY -= transform.precision;
      break;
    case 'move-down':
      next.offsetY += transform.precision;
      break;
    case 'move-left':
      next.offsetX -= transform.precision;
      break;
    case 'move-right':
      next.offsetX += transform.precision;
      break;
    case 'width-plus':
      next.widthAdjust = clampDimension(transform.widthAdjust + transform.precision);
      break;
    case 'width-minus':
      next.widthAdjust = clampDimension(transform.widthAdjust - transform.precision);
      break;
    case 'height-plus':
      next.heightAdjust = clampDimension(transform.heightAdjust + transform.precision);
      break;
    case 'height-minus':
      next.heightAdjust = clampDimension(transform.heightAdjust - transform.precision);
      break;
    default:
      break;
  }

  return next;
}

function withNewTimelineRandomSeed(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    timeline: {
      stub: {
        ...project.timeline.stub,
        shaderSequence: {
          ...project.timeline.stub.shaderSequence,
          randomSeedToken: createTimelineRandomSeedToken(),
        },
      },
    },
  };
}

function normalizeProject(project: ProjectDocument): ProjectDocument {
  const uniformDefinitions = parseUniforms(project.studio.activeShaderCode);
  const defaultProject = createDefaultProject(project.sessionId);
  const mergedLibraryAssets = mergeBundledAssets(project.library?.assets ?? []);
  const requestedActiveAssetId =
    project.playback?.activeAssetId ??
    project.library?.activeAssetId ??
    DEFAULT_BUNDLED_ASSET_ID;
  const normalizedActiveAssetId = mergedLibraryAssets.some(
    (asset) => asset.id === requestedActiveAssetId,
  )
    ? requestedActiveAssetId
    : DEFAULT_BUNDLED_ASSET_ID;
  const mergedSavedShaders = [
    ...Object.values(DEFAULT_SHADERS),
    ...project.studio.savedShaders,
  ].reduce<SavedShader[]>((collection, shader) => {
    const shaderUniformValues = 'uniformValues' in shader ? shader.uniformValues : undefined;
    const shaderVersions = 'versions' in shader ? shader.versions : undefined;
    const shaderLastValidCode = 'lastValidCode' in shader ? shader.lastValidCode : undefined;
    const shaderLastValidUniformValues =
      'lastValidUniformValues' in shader ? shader.lastValidUniformValues : undefined;
    const shaderCompileError = 'compileError' in shader ? shader.compileError : undefined;
    const defaultPreset = DEFAULT_SHADERS[shader.id];
    const normalizedName = defaultPreset?.name ?? shader.name;
    const normalizedCode = shader.code;
    const normalizedUniformValues = getSyncedShaderUniformValues(
      normalizedCode,
      shaderUniformValues ?? defaultPreset?.uniformValues,
    );
    const normalizedLastValidCode = shaderLastValidCode ?? normalizedCode;
    const normalizedShader: SavedShader = {
      ...shader,
      name: normalizedName,
      description: defaultPreset?.description ?? shader.description,
      template: defaultPreset?.template ?? shader.template ?? 'stage',
      group: defaultPreset?.group ?? shader.group,
      code: normalizedCode,
      versions: getShaderVersionTrail(
        {
          name: normalizedName,
          code: normalizedCode,
          versions: shaderVersions,
          isTemporary: defaultPreset
            ? false
            : 'isTemporary' in shader
              ? shader.isTemporary
              : undefined,
        },
        {
          fallbackVersions:
            shader.id === project.studio.activeShaderId ? project.studio.shaderVersions : undefined,
          fallbackName: normalizedName,
          fallbackCode: normalizedCode,
        },
      ),
      uniformValues: normalizedUniformValues,
      lastValidCode: normalizedLastValidCode,
      lastValidUniformValues: getSyncedShaderUniformValues(
        normalizedLastValidCode,
        shaderLastValidUniformValues ?? normalizedUniformValues,
      ),
      isTemporary: defaultPreset
        ? false
        : 'isTemporary' in shader
          ? shader.isTemporary
          : undefined,
      isDirty: defaultPreset ? false : 'isDirty' in shader ? shader.isDirty : undefined,
      sourceShaderId: defaultPreset
        ? undefined
        : 'sourceShaderId' in shader
          ? shader.sourceShaderId
          : undefined,
      ownerTimelineStepId: defaultPreset
        ? undefined
        : 'ownerTimelineStepId' in shader
          ? shader.ownerTimelineStepId
          : undefined,
      pendingAiJobCount: 0,
      hasUnreadAiResult: defaultPreset
        ? false
        : 'hasUnreadAiResult' in shader
          ? Boolean(shader.hasUnreadAiResult)
          : false,
      compileError: defaultPreset ? undefined : shaderCompileError?.trim() ? shaderCompileError : undefined,
    };
    const existingIndex = collection.findIndex((item) => item.id === normalizedShader.id);
    if (existingIndex >= 0) {
      collection[existingIndex] = normalizedShader;
    } else {
      collection.push(normalizedShader);
    }
    return collection;
  }, []);
  const legacySettings = project.ai?.settings as Partial<
    AiSettings & {
      shaderModel?: string;
    }
  >;
  const normalizedAiSettings: AiSettings = {
    ...defaultProject.ai.settings,
    ...legacySettings,
    openaiApiKey: legacySettings.openaiApiKey?.trim()
      ? legacySettings.openaiApiKey
      : localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY) ?? '',
    anthropicApiKey: legacySettings.anthropicApiKey?.trim()
      ? legacySettings.anthropicApiKey
      : localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) ?? '',
    googleApiKey: legacySettings.googleApiKey?.trim()
      ? legacySettings.googleApiKey
      : localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY) ?? '',
    runwayApiKey: legacySettings.runwayApiKey ?? '',
    shaderProvider: legacySettings.shaderProvider === 'openai' || legacySettings.shaderProvider === 'anthropic'
      ? legacySettings.shaderProvider
      : 'google',
    openaiShaderModel: legacySettings.openaiShaderModel?.trim()
      ? legacySettings.openaiShaderModel
      : legacySettings.shaderModel?.trim() ? legacySettings.shaderModel : DEFAULT_OPENAI_SHADER_MODEL,
    anthropicShaderModel: legacySettings.anthropicShaderModel?.trim()
      ? legacySettings.anthropicShaderModel
      : DEFAULT_ANTHROPIC_SHADER_MODEL,
    googleShaderModel:
      legacySettings.googleShaderModel ?? DEFAULT_GOOGLE_SHADER_MODEL,
    localShaderModel: legacySettings.localShaderModel === LEGACY_ULTRA_MODEL_ID
      ? ULTRA_MODEL_ID
      : legacySettings.localShaderModel ?? defaultProject.ai.settings.localShaderModel,
    videoGenProvider: 'runway',
  };
  const normalizedActiveShader =
    mergedSavedShaders.find((shader) => shader.id === project.studio.activeShaderId) ?? null;
  const normalizedStudioShaderVersions = getShaderVersionTrail(normalizedActiveShader, {
    fallbackVersions: project.studio.shaderVersions,
    fallbackName: parseShaderName(project.studio.activeShaderCode),
    fallbackCode: project.studio.activeShaderCode,
  });
  const normalizedTimelineSteps = (
    project.timeline?.stub?.shaderSequence?.steps?.length
      ? project.timeline.stub.shaderSequence.steps
      : defaultProject.timeline.stub.shaderSequence.steps
  ).map((step) => {
    const durationSeconds = clampTimelineStepDuration(step.durationSeconds);
    return {
      ...step,
      disabled: Boolean(step.disabled),
      durationSeconds,
      transitionDurationSeconds: clampTransitionDuration(
        durationSeconds,
        step.transitionDurationSeconds,
      ),
      transitionEffect: normalizeTimelineTransitionEffect(step.transitionEffect),
      assetSettings: normalizeTimelineStepAssetSettings(step.assetSettings),
    };
  });
  const requestedPinnedStepId =
    project.timeline?.stub?.shaderSequence?.pinnedStepId ??
    defaultProject.timeline.stub.shaderSequence.pinnedStepId;
  const normalizedPinnedStepId =
    requestedPinnedStepId &&
    normalizedTimelineSteps.some(
      (step) => step.id === requestedPinnedStepId && !step.disabled,
    )
      ? requestedPinnedStepId
      : null;

  return {
    ...project,
    name: project.name?.trim() || defaultProject.name,
    ai: {
      settings: normalizedAiSettings,
    },
    playback: {
      ...defaultProject.playback,
      ...project.playback,
      activeAssetId: normalizedActiveAssetId,
      transport: {
        ...restoreTransport({
          ...defaultProject.playback.transport,
          ...project.playback?.transport,
          loop: true,
        }),
      },
    },
    library: {
      ...defaultProject.library,
      ...project.library,
      assets: mergedLibraryAssets,
      activeAssetId: normalizedActiveAssetId,
    },
    timeline: {
      stub: {
        ...defaultProject.timeline.stub,
        ...project.timeline?.stub,
        markers: project.timeline?.stub?.markers ?? defaultProject.timeline.stub.markers,
        tracks: project.timeline?.stub?.tracks ?? defaultProject.timeline.stub.tracks,
        shaderSequence: {
          ...defaultProject.timeline.stub.shaderSequence,
          ...project.timeline?.stub?.shaderSequence,
          mode:
            project.timeline?.stub?.shaderSequence?.mode ??
            defaultProject.timeline.stub.shaderSequence.mode,
          editorView:
            project.timeline?.stub?.shaderSequence?.editorView ??
            defaultProject.timeline.stub.shaderSequence.editorView,
          stagePreviewMode:
            project.timeline?.stub?.shaderSequence?.stagePreviewMode ??
            defaultProject.timeline.stub.shaderSequence.stagePreviewMode,
          focusedStepId:
            project.timeline?.stub?.shaderSequence?.focusedStepId ??
            defaultProject.timeline.stub.shaderSequence.focusedStepId,
          pinnedStepId: normalizedPinnedStepId,
          randomSeedToken:
            typeof project.timeline?.stub?.shaderSequence?.randomSeedToken === 'string' &&
            project.timeline.stub.shaderSequence.randomSeedToken.trim()
              ? project.timeline.stub.shaderSequence.randomSeedToken
              : createTimelineRandomSeedToken(),
          singleStepLoopEnabled:
            project.timeline?.stub?.shaderSequence?.singleStepLoopEnabled ??
            defaultProject.timeline.stub.shaderSequence.singleStepLoopEnabled,
          randomChoiceEnabled:
            project.timeline?.stub?.shaderSequence?.randomChoiceEnabled ??
            defaultProject.timeline.stub.shaderSequence.randomChoiceEnabled,
          sharedTransitionEnabled:
            project.timeline?.stub?.shaderSequence?.sharedTransitionEnabled ??
            defaultProject.timeline.stub.shaderSequence.sharedTransitionEnabled,
          sharedTransitionEffect: normalizeTimelineTransitionEffect(
            project.timeline?.stub?.shaderSequence?.sharedTransitionEffect,
            defaultProject.timeline.stub.shaderSequence.sharedTransitionEffect,
          ),
          sharedTransitionDurationSeconds: clampTransitionDuration(
            600,
            project.timeline?.stub?.shaderSequence?.sharedTransitionDurationSeconds ??
              defaultProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
          ),
          sharedSectionDurationSeconds: clampTimelineStepDuration(
            project.timeline?.stub?.shaderSequence?.sharedSectionDurationSeconds ??
              defaultProject.timeline.stub.shaderSequence.sharedSectionDurationSeconds,
          ),
          steps: normalizedTimelineSteps,
        },
      },
    },
    export: {
      stub: {
        ...defaultProject.export.stub,
        ...project.export?.stub,
      },
    },
    studio: {
      ...project.studio,
      shaderChatHistory: project.studio.shaderChatHistory ?? [],
      activeShaderName: parseShaderName(project.studio.activeShaderCode),
      shaderVersions: normalizedStudioShaderVersions,
      savedShaders: mergedSavedShaders,
      uniformValues: syncUniformValues(project.studio.uniformValues, uniformDefinitions),
    },
  };
}

function sanitizeAiMessage(message: string): string {
  return message
    .replaceAll('Google Gemini', 'AI')
    .replaceAll('OpenAI', 'AI')
    .replaceAll('Gemini', 'AI')
    .replaceAll('Google AI', 'AI')
    .replaceAll('Google', 'AI');
}

type DesktopResizeTarget = 'left' | 'right' | 'right-split';
type FilePickerSource = 'library' | 'timeline-picker';

const DESKTOP_PANE_MIN_WIDTH = 180;
const DESKTOP_PANE_MAX_WIDTH = 520;
const DESKTOP_TIMELINE_MIN_HEIGHT = 220;
const DESKTOP_TIMELINE_MAX_HEIGHT = 520;

function createShaderVersion(
  prompt: string,
  name: string,
  code: string,
  id = crypto.randomUUID(),
) {
  return {
    id,
    prompt,
    name,
    code,
    createdAt: new Date().toISOString(),
  };
}

function getDefaultShaderVersionPrompt(
  shader: Pick<SavedShader, 'isTemporary'> | null | undefined,
): string {
  return shader?.isTemporary ? 'Timeline Shader' : 'Base Node Source';
}

function getShaderVersionTrail(
  shader:
    | (Pick<SavedShader, 'name' | 'code'> & Partial<Pick<SavedShader, 'versions' | 'isTemporary'>>)
    | null
    | undefined,
  options?: {
    fallbackVersions?: ShaderVersion[];
    fallbackPrompt?: string;
    fallbackName?: string;
    fallbackCode?: string;
  },
): ShaderVersion[] {
  if (shader?.versions?.length) {
    return [...shader.versions];
  }

  if (options?.fallbackVersions?.length) {
    return [...options.fallbackVersions];
  }

  const nextName = options?.fallbackName ?? shader?.name ?? 'Mapshroom Shader';
  const nextCode = options?.fallbackCode ?? shader?.code ?? '';
  return [
    createShaderVersion(
      options?.fallbackPrompt ?? getDefaultShaderVersionPrompt(shader),
      nextName,
      nextCode,
    ),
  ];
}

function areUniformValuesEqual(
  left: ShaderUniformValueMap | undefined,
  right: ShaderUniformValueMap | undefined,
): boolean {
  if (left === right) {
    return true;
  }

  const leftKeys = Object.keys(left ?? {});
  const rightKeys = Object.keys(right ?? {});
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftValue = left?.[key];
    const rightValue = right?.[key];

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return (
        Array.isArray(leftValue) &&
        Array.isArray(rightValue) &&
        leftValue.length === rightValue.length &&
        leftValue.every((component, index) => component === rightValue[index])
      );
    }

    return leftValue === rightValue;
  });
}

function getSyncedShaderUniformValues(
  code: string,
  uniformValues: ShaderUniformValueMap | undefined,
): ShaderUniformValueMap {
  return syncUniformValues(uniformValues ?? {}, parseUniforms(code));
}

function applyActiveShaderPatch(
  currentProject: ProjectDocument,
  patch: Partial<
    Pick<
      ProjectDocument['studio'],
      | 'activeShaderId'
      | 'activeShaderName'
      | 'activeShaderCode'
      | 'shaderChatHistory'
      | 'shaderVersions'
      | 'uniformValues'
    >
  >,
): ProjectDocument {
  const nextActiveShaderId = patch.activeShaderId ?? currentProject.studio.activeShaderId;
  const nextActiveShaderCode = patch.activeShaderCode ?? currentProject.studio.activeShaderCode;
  const nextActiveShaderName = patch.activeShaderName ?? parseShaderName(nextActiveShaderCode);
  const nextUniformValues = getSyncedShaderUniformValues(
    nextActiveShaderCode,
    patch.uniformValues ?? currentProject.studio.uniformValues,
  );
  const activeSavedShader =
    currentProject.studio.savedShaders.find((shader) => shader.id === nextActiveShaderId) ?? null;
  const shouldSyncActiveSavedShader = Boolean(activeSavedShader?.isTemporary);
  const nextShaderVersions = patch.shaderVersions
    ? [...patch.shaderVersions]
    : nextActiveShaderId === currentProject.studio.activeShaderId
      ? currentProject.studio.shaderVersions
      : getShaderVersionTrail(activeSavedShader, {
          fallbackName: nextActiveShaderName,
          fallbackCode: nextActiveShaderCode,
        });

  return {
    ...currentProject,
    studio: {
      ...currentProject.studio,
      ...patch,
      activeShaderId: nextActiveShaderId,
      activeShaderName: nextActiveShaderName,
      activeShaderCode: nextActiveShaderCode,
      shaderVersions: nextShaderVersions,
      uniformValues: nextUniformValues,
      savedShaders: shouldSyncActiveSavedShader && activeSavedShader
        ? currentProject.studio.savedShaders.map((shader) =>
            shader.id === activeSavedShader.id
              ? {
                  ...shader,
                  name: nextActiveShaderName,
                  code: nextActiveShaderCode,
                  versions: nextShaderVersions,
                  uniformValues: nextUniformValues,
                  isDirty: true,
                }
              : shader,
          )
        : currentProject.studio.savedShaders,
    },
  };
}

function applyPersistedSliderCache(
  project: ProjectDocument,
  sliderCache: Record<string, ShaderUniformValueMap>,
): ProjectDocument {
  if (Object.keys(sliderCache).length === 0) {
    return project;
  }

  const nextSavedShaders = project.studio.savedShaders.map((shader) => {
    const cachedValues = sliderCache[shader.id];
    if (!cachedValues) {
      return shader;
    }

    return {
      ...shader,
      uniformValues: getSyncedShaderUniformValues(shader.code, cachedValues),
    };
  });

  const activeCachedValues = sliderCache[project.studio.activeShaderId];

  return {
    ...project,
    studio: {
      ...project.studio,
      savedShaders: nextSavedShaders,
      uniformValues: activeCachedValues
        ? getSyncedShaderUniformValues(project.studio.activeShaderCode, activeCachedValues)
        : project.studio.uniformValues,
    },
  };
}

function createSliderCacheSnapshot(
  project: ProjectDocument,
): Record<string, ShaderUniformValueMap> {
  const cache: Record<string, ShaderUniformValueMap> = {};

  for (const shader of project.studio.savedShaders) {
    if (shader.uniformValues) {
      cache[shader.id] = shader.uniformValues;
    }
  }

  cache[project.studio.activeShaderId] = project.studio.uniformValues;
  return cache;
}

function createSavedShaderRecord(
  name: string,
  code: string,
  uniformValues: ShaderUniformValueMap = {},
  options: Partial<
    Pick<
      SavedShader,
      | 'compileError'
      | 'description'
      | 'template'
      | 'group'
      | 'inputAssetId'
      | 'isTemporary'
      | 'isDirty'
      | 'lastValidCode'
      | 'lastValidUniformValues'
      | 'sourceShaderId'
      | 'versions'
      | 'ownerTimelineStepId'
    >
  > = {},
): SavedShader {
  const label = name.trim() || 'Mapshroom Shader';
  const syncedUniformValues = getSyncedShaderUniformValues(code, uniformValues);
  const lastValidCode = options.lastValidCode ?? code;

  return {
    id: `${options.isTemporary ? 'timeline' : 'saved'}-${crypto.randomUUID()}`,
    name: label,
    code,
    versions: getShaderVersionTrail(
      {
        name: label,
        code,
        versions: options.versions,
        isTemporary: options.isTemporary,
      },
      {
        fallbackName: label,
        fallbackCode: code,
      },
    ),
    description: options.description ?? 'Saved from the current workspace state.',
    template: options.template ?? 'stage',
    group: options.group ?? 'Saved',
    inputAssetId: options.inputAssetId ?? null,
    uniformValues: syncedUniformValues,
    lastValidCode,
    lastValidUniformValues: getSyncedShaderUniformValues(
      lastValidCode,
      options.lastValidUniformValues ?? syncedUniformValues,
    ),
    isTemporary: options.isTemporary,
    isDirty: options.isDirty,
    sourceShaderId: options.sourceShaderId,
    ownerTimelineStepId: options.ownerTimelineStepId,
    pendingAiJobCount: 0,
    hasUnreadAiResult: false,
    compileError: options.compileError?.trim() ? options.compileError : undefined,
  };
}

function createDuplicateShaderName(
  savedShaders: SavedShader[],
  sourceName: string,
): string {
  const normalizedSourceName = sourceName.trim() || 'Mapshroom Shader';
  const baseName =
    normalizedSourceName.replace(/\s+Copy(?:\s+\d+)?$/i, '').trim() || normalizedSourceName;
  const existingNames = new Set(
    savedShaders.map((shader) => shader.name.trim().toLowerCase()).filter(Boolean),
  );

  let suffix = 1;
  while (true) {
    const candidateName = suffix === 1 ? `${baseName} Copy` : `${baseName} Copy ${suffix}`;
    if (!existingNames.has(candidateName.toLowerCase())) {
      return candidateName;
    }
    suffix += 1;
  }
}

function cloneShaderVersionsWithName(
  versions: ShaderVersion[] | undefined,
  name: string,
): ShaderVersion[] | undefined {
  if (!versions?.length) {
    return undefined;
  }

  return versions.map((version) => ({
    ...version,
    id: crypto.randomUUID(),
    name,
  }));
}

function getPendingAiJobCount(shader: SavedShader | null | undefined): number {
  return Math.max(0, shader?.pendingAiJobCount ?? 0);
}

function pruneTemporaryTimelineShaders(
  project: ProjectDocument,
  keepShaderIds: string[] = [],
): ProjectDocument {
  const referencedShaderIds = new Set([
    project.studio.activeShaderId,
    ...keepShaderIds,
    ...project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
  ]);
  const nextSavedShaders = project.studio.savedShaders.filter(
    (shader) => !shader.isTemporary || referencedShaderIds.has(shader.id),
  );

  if (nextSavedShaders.length === project.studio.savedShaders.length) {
    return project;
  }

  return {
    ...project,
    studio: {
      ...project.studio,
      savedShaders: nextSavedShaders,
    },
  };
}

function assignTimelineStepAssetToProject(
  currentProject: ProjectDocument,
  stepId: string,
  assetId: string | null,
  shouldSyncActiveShader: boolean,
): { project: ProjectDocument; statusMessage: string } {
  const nextInputAssetId = assetId?.trim() || null;
  const step = currentProject.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
  if (!step) {
    return { project: currentProject, statusMessage: '' };
  }

  const sourceShader =
    currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId) ?? null;
  if (!sourceShader) {
    return { project: currentProject, statusMessage: '' };
  }

  const isOwnedDraft = sourceShader.isTemporary && sourceShader.ownerTimelineStepId === stepId;
  const editableShader = isOwnedDraft
    ? sourceShader
    : createSavedShaderRecord(
        sourceShader.name,
        sourceShader.code,
        sourceShader.uniformValues,
        {
          description: 'Linked timeline shader.',
          template: sourceShader.template ?? 'stage',
          group: 'Timeline',
          inputAssetId: sourceShader.inputAssetId ?? null,
          isTemporary: true,
          isDirty: sourceShader.isDirty,
          sourceShaderId: sourceShader.sourceShaderId ?? sourceShader.id,
          ownerTimelineStepId: stepId,
          versions: sourceShader.versions,
          lastValidCode: sourceShader.lastValidCode,
          lastValidUniformValues: sourceShader.lastValidUniformValues,
          compileError: sourceShader.compileError,
        },
      );
  const nextSavedShaders = (isOwnedDraft
    ? currentProject.studio.savedShaders
    : [...currentProject.studio.savedShaders, editableShader]
  ).map((shader) =>
    shader.id === editableShader.id
      ? {
          ...shader,
          inputAssetId: nextInputAssetId,
          isDirty: true,
          hasUnreadAiResult: false,
        }
      : shader,
  );
  const assignedAsset = nextInputAssetId
    ? currentProject.library.assets.find((assetRecord) => assetRecord.id === nextInputAssetId) ?? null
    : null;
  const shouldApplyInitialImageFit =
    assignedAsset?.kind === 'image' && !sourceShader.inputAssetId;
  const nextSteps = currentProject.timeline.stub.shaderSequence.steps.map((item) =>
    item.id === stepId
      ? {
          ...item,
          shaderId: editableShader.id,
          ...(nextInputAssetId && shouldApplyInitialImageFit
            ? {
                assetSettings: normalizeTimelineStepAssetSettings({
                  ...item.assetSettings,
                  fitMode: 'contain',
                }),
              }
            : nextInputAssetId
              ? {}
            : {
                assetSettings: normalizeTimelineStepAssetSettings({
                  ...item.assetSettings,
                  useStepAssetAsShaderBase: false,
                }),
              }),
        }
      : item,
  );
  const assignedAssetName = nextInputAssetId ? assignedAsset?.name ?? 'selected asset' : null;
  const statusMessage = nextInputAssetId
    ? `Assigned "${assignedAssetName}" to "${editableShader.name}".`
    : `"${editableShader.name}" now uses the live stage asset.`;

  return {
    project: pruneTemporaryTimelineShaders({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderId: shouldSyncActiveShader
          ? editableShader.id
          : currentProject.studio.activeShaderId,
        activeShaderName: shouldSyncActiveShader
          ? editableShader.name
          : currentProject.studio.activeShaderName,
        activeShaderCode: shouldSyncActiveShader
          ? editableShader.code
          : currentProject.studio.activeShaderCode,
        shaderVersions: shouldSyncActiveShader
          ? currentProject.studio.activeShaderId === editableShader.id
            ? currentProject.studio.shaderVersions
            : getShaderVersionTrail(editableShader)
          : currentProject.studio.shaderVersions,
        uniformValues: shouldSyncActiveShader
          ? getSyncedShaderUniformValues(editableShader.code, editableShader.uniformValues)
          : currentProject.studio.uniformValues,
        savedShaders: nextSavedShaders,
      },
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            focusedStepId: stepId,
            steps: nextSteps,
          },
        },
      },
    }),
    statusMessage,
  };
}

function getPreferredTimelineStepId(
  steps: ProjectDocument['timeline']['stub']['shaderSequence']['steps'],
  preferredStepId?: string | null,
): string | null {
  if (!steps.length) {
    return null;
  }

  if (preferredStepId && steps.some((step) => step.id === preferredStepId)) {
    return preferredStepId;
  }

  return steps[0]?.id ?? null;
}

export function WorkspaceRoute() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filePickerSourceRef = useRef<FilePickerSource>('library');
  const timelineImportStepIdRef = useRef<string | null>(null);
  const stageViewportRef = useRef<HTMLElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputWindowRef = useRef<Window | null>(null);
  const [outputWindowOpen, setOutputWindowOpen] = useState(false);
  const sessionSyncRef = useRef<ReturnType<typeof createSessionSync> | null>(null);
  const midiOutputSyncRef = useRef<ReturnType<typeof createMidiOutputSync> | null>(null);
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() =>
    loadUiPreferences(DEFAULT_UI_PREFERENCES),
  );
  const [aiPrompt, setAiPrompt] = useState('');
  const [compilerError, setCompilerError] = useState('');
  const [compileFeedbackVersion, setCompileFeedbackVersion] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [aiFeedbackMessage, setAiFeedbackMessage] = useState('');
  const [aiFeedbackTone, setAiFeedbackTone] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [shaderCompileNonce, setShaderCompileNonce] = useState(0);
  const [preferLiveShaderCompilePreview, setPreferLiveShaderCompilePreview] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanelKey>(null);
  const [newUniformName, setNewUniformName] = useState('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [apiSettingsVariant, setApiSettingsVariant] = useState<'setup' | 'settings'>('settings');
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [segmentationQueue, setSegmentationQueue] = useState<string[]>([]);
  const [segmentationPanel, setSegmentationPanel] = useState<'refine' | 'depth'>('refine');
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSliceStudioDialogOpen, setIsSliceStudioDialogOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [presetSelectionAddsToTimeline, setPresetSelectionAddsToTimeline] = useState(false);
  const [previewShaderId, setPreviewShaderId] = useState<string | null>(null);
  const [studioPreviewOverride, setStudioPreviewOverride] = useState(false);
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);
  const [timelineAssetPickerRequest, setTimelineAssetPickerRequest] = useState<{
    stepId: string | null;
    token: number;
  }>({
    stepId: null,
    token: 0,
  });
  const [desktopStageKeyboardArmed, setDesktopStageKeyboardArmed] = useState(false);
  const [editingTimelineStepId, setEditingTimelineStepId] = useState<string | null>(null);
  const [timelineScrollToStepRequest, setTimelineScrollToStepRequest] = useState<{
    stepId: string;
    token: number;
  } | null>(null);
  const [activeAssetDurationSeconds, setActiveAssetDurationSeconds] = useState<number | null>(null);
  const [savedProjects, setSavedProjects] = useState<ProjectLibraryEntry[]>(() => loadProjectLibrary());
  const [shareLinkState, setShareLinkState] = useState<ProjectShareLinkResult | null>(null);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [shareLinkError, setShareLinkError] = useState('');
  const [desktopLayout, setDesktopLayout] = useState({
    leftSidebarWidth: 360,
    rightSidebarWidth: 360,
    timelineHeight: 300,
  });
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiPanelVisible, setMidiPanelVisible] = useState(false);
  const [midiMode, setMidiMode] = useState<MidiControllerMode>('shader-uniforms');
  const [midiGuideOpen, setMidiGuideOpen] = useState(false);
  const [midiManualMixArmed, setMidiManualMixArmed] = useState(false);
  const [midiManualMixSeedToken, setMidiManualMixSeedToken] = useState(() =>
    createTimelineRandomSeedToken(),
  );
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const appOpenTrackedRef = useRef(false);
  const [midiManualMix, setMidiManualMix] = useState({
    stepIndex: 0,
    nextEndpoint: 'max' as 'max' | 'min',
    progress: 0,
  });
  const hasLoadedInitialProjectRef = useRef(false);
  const generatedShaderRetryRef = useRef<Record<string, {
    sourcePrompt: string;
    code: string;
    autoRepairUsed: boolean;
    versionId: string | null;
    retryInFlight: boolean;
  }>>({});
  const resizeStateRef = useRef<{
    target: DesktopResizeTarget;
    startX: number;
    startY: number;
    leftSidebarWidth: number;
    rightSidebarWidth: number;
    timelineHeight: number;
  } | null>(null);
  const activeSessionId = project?.sessionId ?? null;
  const pinnedTimelineStepId = project?.timeline.stub.shaderSequence.pinnedStepId ?? null;

  useEffect(() => {
    const entryCount = registerOnboardingEntry();
    const timeoutId = window.setTimeout(() => {
      const shouldShow = entryCount <= ONBOARDING_AUTO_OPEN_LIMIT;
      setShowOnboardingGuide(shouldShow);
      if (!shouldShow) {
        signalOnboardingComplete();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!project || appOpenTrackedRef.current) {
      return;
    }
    if (getAnalyticsConsent() !== 'granted') {
      return;
    }
    appOpenTrackedRef.current = true;
    const presence = getAnalyticsAiPresence(project.ai.settings);
    setAnalyticsAiPresence(presence);
    trackAppOpen(presence);
  }, [project]);

  const updateProject = useCallback((updater: (currentProject: ProjectDocument) => ProjectDocument) => {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      return updater(currentProject);
    });
  }, []);

  const applyCompilerFeedback = useCallback((message: string) => {
    setCompilerError(message);
    setPreferLiveShaderCompilePreview(false);
    setCompileFeedbackVersion((currentValue) => currentValue + 1);
  }, []);

  useEffect(() => {
    if (hasLoadedInitialProjectRef.current) {
      return;
    }

    hasLoadedInitialProjectRef.current = true;
    let cancelled = false;

    void (async () => {
      if (window.location.href.includes('share=')) {
        return;
      }

      if (cancelled) {
        return;
      }

      const sessionId = getOrCreateSessionId();
      // Existing installs that still point at the huge bundled Statue timeline
      // get a fresh starter project with a small random shader set.
      if (isBundledProjectSessionId(sessionId)) {
        const nextSessionId = crypto.randomUUID();
        const starterProject = normalizeProject(createDefaultProject(nextSessionId));
        persistActiveSessionId(nextSessionId);
        saveProjectDocument(starterProject);
        setProject(starterProject);
        return;
      }

      persistActiveSessionId(sessionId);
      const loadedProject = loadProjectDocument(sessionId) ?? createDefaultProject(sessionId);
      const sliderCache = loadShaderSliderCache(sessionId);
      setProject(applyPersistedSliderCache(normalizeProject(loadedProject), sliderCache));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const importedSharedProject = await importProjectFromSharedUrl();
        if (cancelled || !importedSharedProject) {
          return;
        }

        const normalizedImportedProject = normalizeProject(importedSharedProject.project);
        setProject(normalizedImportedProject);
        setSavedProjects(
          saveProjectToLibrary(normalizedImportedProject, normalizedImportedProject.name),
        );
        persistActiveSessionId(normalizedImportedProject.sessionId);
        setStatusMessage(
          `Imported shared project "${normalizedImportedProject.name}" as a new local project.`,
        );
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error ? error.message : 'Unable to load the shared project link.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.key, location.pathname, location.search]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    sessionSyncRef.current?.destroy();
    midiOutputSyncRef.current?.destroy();
    sessionSyncRef.current = createSessionSync(activeSessionId, (incomingProject) => {
      setProject((currentProject) => {
        if (!currentProject || currentProject.sessionId !== incomingProject.sessionId) {
          return currentProject;
        }
        return normalizeProject(incomingProject);
      });
    });
    midiOutputSyncRef.current = createMidiOutputSync(activeSessionId, () => undefined);

    return () => {
      sessionSyncRef.current?.destroy();
      sessionSyncRef.current = null;
      midiOutputSyncRef.current?.destroy();
      midiOutputSyncRef.current = null;
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!project) {
      return;
    }

    persistActiveSessionId(project.sessionId);

    const timeoutId = window.setTimeout(() => {
      saveProjectDocument(project);
      saveShaderSliderCache(project.sessionId, createSliderCacheSnapshot(project));
      sessionSyncRef.current?.publish(project);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [project]);

  useEffect(() => {
    saveUiPreferences(uiPreferences);
  }, [uiPreferences]);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = uiPreferences.colorTheme;
    return () => {
      delete document.documentElement.dataset.colorTheme;
    };
  }, [uiPreferences.colorTheme]);

  useEffect(() => {
    if (!isProjectDialogOpen) {
      return;
    }

    setSavedProjects(loadProjectLibrary());
  }, [isProjectDialogOpen]);

  const handleSaveProject = useCallback((name: string) => {
    if (!project) {
      return;
    }

    const trimmedName = name.trim() || 'Untitled Project';
    if (isBundledProjectSessionId(project.sessionId)) {
      const newSessionId = crypto.randomUUID();
      const nextProject = normalizeProject({
        ...project,
        sessionId: newSessionId,
        name: trimmedName,
      });

      setProject(nextProject);
      saveProjectDocument(nextProject);
      setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
      persistActiveSessionId(nextProject.sessionId);
      setStatusMessage(`Saved "${trimmedName}" as a new project.`);
      setIsProjectDialogOpen(false);
      trackUiClick('save_project', { mode: 'from_bundled' });
      return;
    }

    const nextProject = {
      ...project,
      name: trimmedName,
    };

    setProject(nextProject);
    saveProjectDocument(nextProject);
    setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
    persistActiveSessionId(nextProject.sessionId);
    setStatusMessage(`Saved project "${trimmedName}".`);
    setIsProjectDialogOpen(false);
    trackUiClick('save_project');
  }, [project]);

  const handleSaveAsNewProject = useCallback((name: string) => {
    if (!project) {
      return;
    }

    const trimmedName = name.trim() || `${project.name || 'Untitled Project'} Copy`;
    const nextProject = normalizeProject({
      ...project,
      sessionId: crypto.randomUUID(),
      name: trimmedName,
    });

    setProject(nextProject);
    saveProjectDocument(nextProject);
    setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
    persistActiveSessionId(nextProject.sessionId);
    setStatusMessage(`Saved "${trimmedName}" as a new project.`);
    setIsProjectDialogOpen(false);
    trackUiClick('save_project_as');
  }, [project]);

  const handleCreateNewProject = useCallback(() => {
    const confirmed = window.confirm(
      'Create a new project? Unsaved changes in the current workspace will be lost unless you save first.',
    );
    if (!confirmed) {
      return;
    }

    const nextSessionId = crypto.randomUUID();
    const nextProject = normalizeProject(createDefaultProject(nextSessionId));

    setProject(nextProject);
    persistActiveSessionId(nextSessionId);
    setIsProjectDialogOpen(false);
    setEditingTimelineStepId(null);
    setPreviewShaderId(null);
    setStudioPreviewOverride(false);
    clearGeneratedShaderRetry();
    setCompilerError('');
    setStatusMessage('Created a new project.');
    trackUiClick('create_project');
  }, []);

  const handleOpenSavedProject = useCallback((sessionId: string) => {
    const loadedProject = loadProjectDocument(sessionId);
    if (!loadedProject) {
      setStatusMessage('That saved project is no longer available on this device.');
      setSavedProjects(removeProjectFromLibrary(sessionId));
      return;
    }

    const sliderCache = loadShaderSliderCache(sessionId);
    const normalizedProject = applyPersistedSliderCache(
      normalizeProject(loadedProject),
      sliderCache,
    );
    setProject(normalizedProject);
    persistActiveSessionId(sessionId);
    setIsProjectDialogOpen(false);
    setStatusMessage(`Opened project "${normalizedProject.name}".`);
    trackUiClick('open_saved_project');
  }, []);

  const handleGenerateShareLink = useCallback(async () => {
    if (!project) {
      return;
    }

    setIsGeneratingShareLink(true);
    setShareLinkError('');

    try {
      const nextShareLink = await createProjectShareLink(project);
      setShareLinkState(nextShareLink);
      setStatusMessage(`Share link ready for "${project.name}".`);
      track('share_project', { outcome: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate the project share link.';
      setShareLinkError(message);
      setStatusMessage(message);
      track('share_project', { outcome: 'error' });
    } finally {
      setIsGeneratingShareLink(false);
    }
  }, [project]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLinkState) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLinkState.url);
      } else {
        window.prompt('Copy the share link below.', shareLinkState.url);
      }
      setStatusMessage('Share link copied.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to copy the share link.';
      setShareLinkError(message);
      setStatusMessage(message);
    }
  }, [shareLinkState]);

  const handleOpenShareDialog = useCallback(() => {
    setIsShareDialogOpen(true);
    setShareLinkState(null);
    setShareLinkError('');
    void handleGenerateShareLink();
  }, [handleGenerateShareLink]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      setDesktopLayout((currentValue) => {
        const deltaX = event.clientX - resizeState.startX;
        const deltaY = event.clientY - resizeState.startY;

        if (resizeState.target === 'left') {
          return {
            ...currentValue,
            leftSidebarWidth: Math.max(
              DESKTOP_PANE_MIN_WIDTH,
              Math.min(DESKTOP_PANE_MAX_WIDTH, resizeState.leftSidebarWidth + deltaX),
            ),
          };
        }

        if (resizeState.target === 'right') {
          return {
            ...currentValue,
            rightSidebarWidth: Math.max(
              DESKTOP_PANE_MIN_WIDTH,
              Math.min(DESKTOP_PANE_MAX_WIDTH, resizeState.rightSidebarWidth - deltaX),
            ),
          };
        }

        return {
          ...currentValue,
          timelineHeight: Math.max(
            DESKTOP_TIMELINE_MIN_HEIGHT,
            Math.min(DESKTOP_TIMELINE_MAX_HEIGHT, resizeState.timelineHeight - deltaY),
          ),
        };
      });
    };

    const handlePointerUp = () => {
      if (!resizeStateRef.current) {
        return;
      }

      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!isMobile && mobilePanel !== null) {
      setMobilePanel(null);
    }
  }, [isMobile, mobilePanel]);

  useEffect(() => {
    if (isMobile && uiPreferences.mobileUiMode !== 'full' && mobilePanel !== null) {
      setMobilePanel(null);
    }
  }, [isMobile, mobilePanel, uiPreferences.mobileUiMode]);

  useEffect(() => {
    if ((!isMobile || uiPreferences.mobileUiMode === 'hidden') && isMobileTimelineOpen) {
      setIsMobileTimelineOpen(false);
    }
  }, [isMobile, isMobileTimelineOpen, uiPreferences.mobileUiMode]);

  useEffect(() => {
    if (aiFeedbackTone !== 'success' && aiFeedbackTone !== 'error') return;
    const timer = setTimeout(() => {
      setAiFeedbackMessage('');
      setAiFeedbackTone('idle');
    }, 4000);
    return () => clearTimeout(timer);
  }, [aiFeedbackMessage, aiFeedbackTone]);

  const uniformDefinitions = useMemo(
    () => (project ? parseUniforms(project.studio.activeShaderCode) : {}),
    [project],
  );

  useEffect(() => {
    if (!project) {
      return;
    }

    const nextUniformValues = syncUniformValues(project.studio.uniformValues, uniformDefinitions);
    const nextName = parseShaderName(project.studio.activeShaderCode);

    if (nextUniformValues !== project.studio.uniformValues || nextName !== project.studio.activeShaderName) {
      setProject((currentProject) => {
        if (!currentProject) {
          return currentProject;
        }

        return {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderName: nextName,
            uniformValues: nextUniformValues,
          },
        };
      });
    }
  }, [project, uniformDefinitions]);

  const activeTimelineDraft = useMemo(() => {
    if (!project) {
      return null;
    }

    return (
      project.studio.savedShaders.find(
        (shader) => shader.id === project.studio.activeShaderId && shader.isTemporary,
      ) ?? null
    );
  }, [project]);

  useEffect(() => {
    if (!project) {
      return;
    }

    const activeShader = project.studio.savedShaders.find(
      (shader) => shader.id === project.studio.activeShaderId,
    );
    if (!activeShader) {
      return;
    }

    const nextCompileError = compilerError.trim() ? compilerError : undefined;
    const nextLastValidCode = nextCompileError
      ? activeShader.lastValidCode ?? activeShader.code
      : project.studio.activeShaderCode;
    const nextLastValidUniformValues = nextCompileError
      ? getRenderableShaderUniformValues(activeShader)
      : getSyncedShaderUniformValues(
          project.studio.activeShaderCode,
          project.studio.uniformValues,
        );

    if (
      (activeShader.compileError ?? undefined) === nextCompileError &&
      (activeShader.lastValidCode ?? activeShader.code) === nextLastValidCode &&
      areUniformValuesEqual(activeShader.lastValidUniformValues, nextLastValidUniformValues)
    ) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        savedShaders: currentProject.studio.savedShaders.map((shader) =>
          shader.id === currentProject.studio.activeShaderId
            ? {
                ...shader,
                compileError: nextCompileError,
                lastValidCode: nextLastValidCode,
                lastValidUniformValues: nextLastValidUniformValues,
              }
            : shader,
        ),
      },
    }));
  }, [compileFeedbackVersion, compilerError, project, updateProject]);

  const editingTimelineStepIndex = useMemo(() => {
    if (!project || !editingTimelineStepId) {
      return null;
    }

    const stepIndex = project.timeline.stub.shaderSequence.steps.findIndex(
      (step) => step.id === editingTimelineStepId,
    );
    return stepIndex >= 0 ? stepIndex : null;
  }, [editingTimelineStepId, project]);

  useEffect(() => {
    if (!project || !activeTimelineDraft) {
      return;
    }

    const nextName = parseShaderName(project.studio.activeShaderCode);
    const nextUniformValues = getSyncedShaderUniformValues(
      project.studio.activeShaderCode,
      project.studio.uniformValues,
    );

    if (
      activeTimelineDraft.code === project.studio.activeShaderCode &&
      activeTimelineDraft.name === nextName &&
      areUniformValuesEqual(activeTimelineDraft.uniformValues, nextUniformValues)
    ) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        savedShaders: currentProject.studio.savedShaders.map((shader) =>
          shader.id === activeTimelineDraft.id
            ? {
                ...shader,
                name: parseShaderName(currentProject.studio.activeShaderCode),
                code: currentProject.studio.activeShaderCode,
                uniformValues: nextUniformValues,
                isDirty: true,
              }
            : shader,
        ),
      },
    }));
  }, [activeTimelineDraft, project, updateProject]);

  const activeAsset = useMemo(() => {
    if (!project) {
      return null;
    }

    const activeId = project.playback.activeAssetId || project.library.activeAssetId;
    return project.library.assets.find((asset) => asset.id === activeId) ?? null;
  }, [project]);

  const activeAssetResolution = useAssetObjectUrl(activeAsset);
  const activeAssetUrl = activeAssetResolution.url;
  const segmentationAsset = useMemo(() => {
    if (!project || !segmentationQueue[0]) return null;
    return project.library.assets.find((asset) => asset.id === segmentationQueue[0]) ?? null;
  }, [project, segmentationQueue]);
  const segmentationAssetResolution = useAssetObjectUrl(segmentationAsset);
  const lastMissingAssetIdRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveAssetDurationSeconds(null);

    if (
      !activeAsset ||
      activeAsset.kind !== 'video' ||
      !activeAssetUrl ||
      activeAssetResolution.status !== 'ready'
    ) {
      return;
    }

    let disposed = false;
    const probe = document.createElement('video');
    const cleanup = () => {
      probe.onloadedmetadata = null;
      probe.onerror = null;
      probe.removeAttribute('src');
      probe.load();
    };

    probe.preload = 'metadata';
    probe.src = activeAssetUrl;
    probe.onloadedmetadata = () => {
      if (!disposed) {
        setActiveAssetDurationSeconds(
          Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null,
        );
      }
      cleanup();
    };
    probe.onerror = () => {
      if (!disposed) {
        setActiveAssetDurationSeconds(null);
      }
      cleanup();
    };

    return () => {
      disposed = true;
      cleanup();
    };
  }, [activeAsset, activeAssetResolution.status, activeAssetUrl]);

  const clearGeneratedShaderRetry = (shaderId?: string) => {
    if (!shaderId) {
      generatedShaderRetryRef.current = {};
      return;
    }

    delete generatedShaderRetryRef.current[shaderId];
  };

  useEffect(() => {
    if (!activeAsset || activeAssetResolution.status !== 'missing') {
      lastMissingAssetIdRef.current = null;
      return;
    }

    if (lastMissingAssetIdRef.current === activeAsset.id) {
      return;
    }

    lastMissingAssetIdRef.current = activeAsset.id;
    setStatusMessage(`Stored asset "${activeAsset.name}" could not be restored. Load it again.`);
  }, [activeAsset, activeAssetResolution.status]);

  const openFilePicker = (source: FilePickerSource = 'library', timelineStepId: string | null = null) => {
    filePickerSourceRef.current = source;
    timelineImportStepIdRef.current = source === 'timeline-picker' ? timelineStepId : null;
    fileInputRef.current?.click();
  };

  const beginDesktopResize = (target: DesktopResizeTarget, clientX: number, clientY: number) => {
    resizeStateRef.current = {
      target,
      startX: clientX,
      startY: clientY,
      leftSidebarWidth: desktopLayout.leftSidebarWidth,
      rightSidebarWidth: desktopLayout.rightSidebarWidth,
      timelineHeight: desktopLayout.timelineHeight,
    };
    document.body.style.cursor = target === 'right-split' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const filePickerSource = filePickerSourceRef.current;
    const timelineImportStepId = timelineImportStepIdRef.current;
    filePickerSourceRef.current = 'library';
    timelineImportStepIdRef.current = null;
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const uploadedAssets: AssetRecord[] = [];

    for (const file of files) {
      const kind = detectAssetKind(file);
      if (!kind) {
        continue;
      }

      const assetRecord: AssetRecord = {
        id: crypto.randomUUID(),
        name: file.name,
        kind,
        mimeType: file.type,
        size: file.size,
        lastModified: file.lastModified,
        createdAt: new Date().toISOString(),
        sourceType: 'uploaded',
      };

      const saved = await putAssetBlob(assetRecord.id, file);
      if (saved) {
        uploadedAssets.push(assetRecord);
      }
    }

    if (!uploadedAssets.length) {
      setStatusMessage('No supported assets were added.');
      event.target.value = '';
      return;
    }

    let timelineAssignmentMessage = '';

    updateProject((currentProject) => {
      const nextAssets = [...currentProject.library.assets, ...uploadedAssets];
      const currentActiveId =
        currentProject.playback.activeAssetId ?? currentProject.library.activeAssetId;
      const preserveCurrentActiveAsset =
        filePickerSource === 'timeline-picker' && Boolean(currentActiveId);
      const nextActiveId = preserveCurrentActiveAsset
        ? currentActiveId
        : uploadedAssets[0]?.id ??
          currentProject.library.activeAssetId ??
          currentProject.playback.activeAssetId;
      const shouldAutoPlay = currentProject.library.assets.length === 0 && Boolean(nextActiveId);

      const projectWithUploads = {
        ...currentProject,
        library: {
          ...currentProject.library,
          assets: nextAssets,
          activeAssetId: nextActiveId,
        },
        playback: {
          ...currentProject.playback,
          activeAssetId: nextActiveId,
          transport: shouldAutoPlay
            ? playTransport(currentProject.playback.transport)
            : currentProject.playback.transport,
        },
      };

      if (filePickerSource !== 'timeline-picker' || !timelineImportStepId) {
        return projectWithUploads;
      }

      const importedAssetId = uploadedAssets[0]?.id ?? null;
      if (!importedAssetId) {
        return projectWithUploads;
      }

      const step = projectWithUploads.timeline.stub.shaderSequence.steps.find(
        (item) => item.id === timelineImportStepId,
      );
      const sourceShader = step
        ? projectWithUploads.studio.savedShaders.find((shader) => shader.id === step.shaderId) ?? null
        : null;
      const shouldSyncActiveShader =
        editingTimelineStepId === timelineImportStepId ||
        (sourceShader !== null &&
          (projectWithUploads.studio.activeShaderId === sourceShader.id ||
            projectWithUploads.studio.activeShaderId === step?.shaderId));
      const assignment = assignTimelineStepAssetToProject(
        projectWithUploads,
        timelineImportStepId,
        importedAssetId,
        shouldSyncActiveShader,
      );
      timelineAssignmentMessage = assignment.statusMessage;
      return assignment.project;
    });

    setStatusMessage(
      timelineAssignmentMessage
        ? timelineAssignmentMessage
        : filePickerSource === 'timeline-picker'
        ? `${uploadedAssets.length} asset${uploadedAssets.length > 1 ? 's' : ''} added to the library.`
        : `${uploadedAssets.length} asset${uploadedAssets.length > 1 ? 's' : ''} added.`,
    );
    const imageAssetIds = uploadedAssets.filter((asset) => asset.kind === 'image').map((asset) => asset.id);
    if (imageAssetIds.length) setSegmentationQueue((current) => [...current, ...imageAssetIds]);
    event.target.value = '';
  };

  const handlePlayToggle = () => {
    updateProject((currentProject) => {
      const wasPlaying = currentProject.playback.transport.isPlaying;
      const startsFromBeginning =
        !wasPlaying &&
        currentProject.playback.transport.currentTimeSeconds <=
          TIMELINE_RANDOM_RESEED_EPSILON_SECONDS;
      const nextProject = startsFromBeginning
        ? withNewTimelineRandomSeed(currentProject)
        : currentProject;

      return {
        ...nextProject,
        playback: {
          ...nextProject.playback,
          transport: wasPlaying
            ? pauseTransport(nextProject.playback.transport)
            : playTransport(nextProject.playback.transport),
        },
      };
    });
  };

  const handleAssetSelect = (assetId: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      library: {
        ...currentProject.library,
        activeAssetId: assetId,
      },
      playback: {
        ...currentProject.playback,
        activeAssetId: assetId,
      },
    }));
  };

  const handleAssetRename = (assetId: string, name: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      library: {
        ...currentProject.library,
        assets: currentProject.library.assets.map((asset) =>
          asset.id === assetId ? { ...asset, name } : asset,
        ),
      },
    }));
  };

  const handleAssetMaskOpen = useCallback((assetId: string, panel: 'refine' | 'depth' = 'refine') => {
    const asset = project?.library.assets.find((item) => item.id === assetId);
    if (!asset || asset.kind !== 'image') {
      setStatusMessage(
        panel === 'depth'
          ? 'Depth map is available for image assets.'
          : 'Background removal is available for image assets.',
      );
      return;
    }
    setSegmentationPanel(panel);
    setSegmentationQueue([assetId]);
  }, [project]);

  const handleAssetMaskClose = useCallback(() => {
    setSegmentationQueue((current) => current.slice(1));
  }, []);

  const handleAssetMaskApply = useCallback(async (blob: Blob, resultKind: 'mask' | 'draw' | 'depth') => {
    const sourceAssetId = segmentationQueue[0];
    const sourceAsset = project?.library.assets.find((asset) => asset.id === sourceAssetId);
    if (!sourceAsset) {
      setSegmentationQueue((current) => current.slice(1));
      return false;
    }
    const outputSuffix = resultKind === 'depth' ? 'depth-map' : resultKind === 'draw' ? 'painted' : 'masked';
    const maskedAsset: AssetRecord = {
      ...sourceAsset,
      id: crypto.randomUUID(),
      name: `${sourceAsset.name.replace(/\.[^.]+$/, '')}-${outputSuffix}.png`,
      mimeType: 'image/png',
      size: blob.size,
      lastModified: Date.now(),
      createdAt: new Date().toISOString(),
      sourceType: 'uploaded',
    };
    const saved = await putAssetBlob(maskedAsset.id, blob);
    if (!saved) {
      setStatusMessage('The masked asset could not be saved in this browser.');
      return false;
    }
    updateProject((currentProject) => ({
      ...currentProject,
      library: {
        ...currentProject.library,
        assets: [...currentProject.library.assets, maskedAsset],
        activeAssetId: maskedAsset.id,
      },
      playback: { ...currentProject.playback, activeAssetId: maskedAsset.id },
    }));
    setStatusMessage(`${resultKind === 'depth' ? 'Depth map' : resultKind === 'draw' ? 'Painted asset' : 'Masked asset'} “${maskedAsset.name}” added and selected.`);
    setSegmentationQueue((current) => current.slice(1));
    return true;
  }, [project, segmentationQueue, updateProject]);

  const handleAssetRemove = (assetId: string) => {
    const removedAsset = project?.library.assets.find((asset) => asset.id === assetId) ?? null;
    void deleteAssetBlob(assetId);
    updateProject((currentProject) => {
      const nextAssets = currentProject.library.assets.filter((asset) => asset.id !== assetId);
      const removedWasActive = currentProject.library.activeAssetId === assetId || currentProject.playback.activeAssetId === assetId;
      const nextActiveId = removedWasActive ? nextAssets.at(-1)?.id ?? null : currentProject.library.activeAssetId;
      return {
        ...currentProject,
        library: { ...currentProject.library, assets: nextAssets, activeAssetId: nextActiveId },
        playback: {
          ...currentProject.playback,
          activeAssetId: removedWasActive ? nextActiveId : currentProject.playback.activeAssetId,
          transport: removedWasActive && nextActiveId === null ? pauseTransport(currentProject.playback.transport) : currentProject.playback.transport,
        },
      };
    });
    if (removedAsset) setStatusMessage(`Removed asset "${removedAsset.name}".`);
  };

  const handleTimelineSeek = useCallback((nextTimeSeconds: number) => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: seekTransport(currentProject.playback.transport, nextTimeSeconds),
      },
    }));
  }, [updateProject]);

  const handleTimelineStop = useCallback(() => {
    updateProject((currentProject) => {
      const currentTimeSeconds = getTransportTimeSeconds(currentProject.playback.transport);
      const nextProject =
        currentTimeSeconds > TIMELINE_RANDOM_RESEED_EPSILON_SECONDS
          ? withNewTimelineRandomSeed(currentProject)
          : currentProject;

      return {
        ...nextProject,
        playback: {
          ...nextProject.playback,
          transport: {
            ...nextProject.playback.transport,
            isPlaying: false,
            currentTimeSeconds: 0,
            anchorTimestampMs: null,
          },
        },
      };
    });
  }, [updateProject]);

  const handleTimelineSequenceModeChange = useCallback((mode: ProjectDocument['timeline']['stub']['shaderSequence']['mode']) => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            mode,
          },
        },
      },
    }));
  }, [updateProject]);

  const handleTimelineStagePreviewModeChange = useCallback(
    (stagePreviewMode: TimelineStagePreviewMode) => {
      setStudioPreviewOverride(false);
      updateProject((currentProject) => ({
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              stagePreviewMode,
            },
          },
        },
      }));
    },
    [updateProject],
  );

  const handleTimelineSharedTransitionChange = useCallback((
    patch: {
      sharedTransitionEnabled?: boolean;
      sharedTransitionEffect?: TimelineTransitionEffect;
      sharedTransitionDurationSeconds?: number;
      sharedSectionDurationSeconds?: number;
    },
  ) => {
    updateProject((currentProject) => {
      const shaderSequence = currentProject.timeline.stub.shaderSequence;
      const nextSharedTransitionDurationSeconds = clampTransitionDuration(
        600,
        patch.sharedTransitionDurationSeconds ??
          shaderSequence.sharedTransitionDurationSeconds,
      );
      const usesSharedTransition = shouldUseSharedTransition(
        shaderSequence.mode,
        patch.sharedTransitionEnabled ?? shaderSequence.sharedTransitionEnabled,
      );
      const nextSteps =
        patch.sharedTransitionDurationSeconds !== undefined
          ? applyMixDurationToTimelineSteps(
              shaderSequence.steps,
              nextSharedTransitionDurationSeconds,
            )
          : shaderSequence.steps;

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...shaderSequence,
              ...patch,
              sharedTransitionDurationSeconds: usesSharedTransition
                ? nextSharedTransitionDurationSeconds
                : shaderSequence.sharedTransitionDurationSeconds,
              sharedSectionDurationSeconds: clampTimelineStepDuration(
                patch.sharedSectionDurationSeconds ??
                  shaderSequence.sharedSectionDurationSeconds,
              ),
              steps: nextSteps,
            },
          },
        },
      };
    });
  }, [updateProject]);

  const handleTimelineMixDurationChange = useCallback((mixDurationSeconds: number) => {
    updateProject((currentProject) => {
      const shaderSequence = currentProject.timeline.stub.shaderSequence;
      const nextSteps = applyMixDurationToTimelineSteps(shaderSequence.steps, mixDurationSeconds);
      const smallestStepDurationSeconds = nextSteps.reduce((shortestDuration, step) => {
        if (!isTimelineStepEnabled(step)) {
          return shortestDuration;
        }

        return Math.min(shortestDuration, clampTimelineStepDuration(step.durationSeconds));
      }, Number.POSITIVE_INFINITY);
      const usesSharedTransition = shouldUseSharedTransition(
        shaderSequence.mode,
        shaderSequence.sharedTransitionEnabled,
      );

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...shaderSequence,
              sharedTransitionDurationSeconds: usesSharedTransition
                ? clampTransitionDuration(
                    Number.isFinite(smallestStepDurationSeconds)
                      ? smallestStepDurationSeconds
                      : 600,
                    mixDurationSeconds,
                  )
                : shaderSequence.sharedTransitionDurationSeconds,
              steps: nextSteps,
            },
          },
        },
      };
    });
  }, [updateProject]);

  const handleTimelineSingleStepLoopToggle = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            singleStepLoopEnabled: !currentProject.timeline.stub.shaderSequence.singleStepLoopEnabled,
            randomChoiceEnabled: currentProject.timeline.stub.shaderSequence.singleStepLoopEnabled
              ? currentProject.timeline.stub.shaderSequence.randomChoiceEnabled
              : false,
          },
        },
      },
    }));
  }, [updateProject]);

  const handleTimelineStepChange = useCallback((
    stepId: string,
    patch: Partial<ProjectDocument['timeline']['stub']['shaderSequence']['steps'][number]>,
  ) => {
    const shouldRelinkSelection = Boolean(patch.shaderId && editingTimelineStepId === stepId);

    updateProject((currentProject) =>
      pruneTemporaryTimelineShaders({
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              focusedStepId: stepId,
              pinnedStepId:
                patch.disabled &&
                currentProject.timeline.stub.shaderSequence.pinnedStepId === stepId
                  ? null
                  : currentProject.timeline.stub.shaderSequence.pinnedStepId,
              steps: currentProject.timeline.stub.shaderSequence.steps.map((step) => {
                if (step.id !== stepId) {
                  return step;
                }

                const durationSeconds = clampTimelineStepDuration(
                  patch.durationSeconds ?? step.durationSeconds,
                );
                const assetSettings = patch.assetSettings
                  ? normalizeTimelineStepAssetSettings(patch.assetSettings)
                  : normalizeTimelineStepAssetSettings(step.assetSettings);

                return {
                  ...step,
                  ...patch,
                  durationSeconds,
                  transitionDurationSeconds: clampTransitionDuration(
                    durationSeconds,
                    patch.transitionDurationSeconds ?? step.transitionDurationSeconds,
                  ),
                  assetSettings,
                };
              }),
            },
          },
        },
      }),
    );
    if (shouldRelinkSelection) {
      window.setTimeout(() => {
        void selectTimelineStepForEditing(stepId, {
          suppressStatus: true,
          focusStudioOnMobile: false,
        });
      }, 0);
    }
  }, [editingTimelineStepId, selectTimelineStepForEditing, updateProject]);

  const handleTimelinePinnedStepToggle = useCallback((stepId: string) => {
    if (!project) {
      return;
    }

    const nextPinnedStepId = pinnedTimelineStepId === stepId ? null : stepId;
    const step = project.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
    if (!step || step.disabled) {
      return;
    }

    const shaderName =
      project.studio.savedShaders.find((shader) => shader.id === step.shaderId)?.name ??
      `Step ${project.timeline.stub.shaderSequence.steps.findIndex((item) => item.id === stepId) + 1}`;

    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            pinnedStepId: nextPinnedStepId,
          },
        },
      },
    }));
    setStatusMessage(
      nextPinnedStepId ? `Pinned "${shaderName}" beside the live stage.` : 'Cleared the pinned compare shader.',
    );
  }, [pinnedTimelineStepId, project, updateProject]);

  const handleTimelineAssignStepAsset = useCallback((stepId: string, assetId: string | null) => {
    const nextInputAssetId = assetId?.trim() || null;
    let nextStatusMessage = '';

    updateProject((currentProject) => {
      const step = currentProject.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
      const sourceShader = step
        ? currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId) ?? null
        : null;
      const shouldSyncActiveShader =
        editingTimelineStepId === stepId ||
        (sourceShader !== null && currentProject.studio.activeShaderId === sourceShader.id);
      const assignment = assignTimelineStepAssetToProject(
        currentProject,
        stepId,
        nextInputAssetId,
        shouldSyncActiveShader,
      );
      nextStatusMessage = assignment.statusMessage;
      return assignment.project;
    });

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [editingTimelineStepId, updateProject]);

  const handleTimelineRemoveStep = useCallback((stepId: string) => {
    const targetStep = project?.timeline.stub.shaderSequence.steps.find((step) => step.id === stepId);
    const targetShaderName =
      targetStep
        ? project?.studio.savedShaders.find((shader) => shader.id === targetStep.shaderId)?.name ??
          'this shader'
        : 'this shader';
    const confirmed = window.confirm(`Remove "${targetShaderName}" from the timeline?`);
    if (!confirmed) {
      return;
    }

    let nextSelectedStepId: string | null = null;
    let nextStatusMessage = '';

    updateProject((currentProject) => {
      const currentSteps = currentProject.timeline.stub.shaderSequence.steps;
      const removedStepIndex = currentSteps.findIndex((step) => step.id === stepId);
      if (removedStepIndex < 0) {
        return currentProject;
      }

      const removedStep = currentSteps[removedStepIndex];
      const removedShaderName =
        currentProject.studio.savedShaders.find((shader) => shader.id === removedStep.shaderId)?.name ??
        `Step ${removedStepIndex + 1}`;
      const nextSteps = currentSteps.filter((step) => step.id !== stepId);

      if (!nextSteps.length) {
        return currentProject;
      }

      if (editingTimelineStepId === stepId) {
        nextSelectedStepId = nextSteps[Math.min(removedStepIndex, nextSteps.length - 1)]?.id ?? null;
      }

      nextStatusMessage = nextSelectedStepId
        ? `Removed "${removedShaderName}" and linked the editor to the next timeline shader.`
        : `Removed "${removedShaderName}" from the timeline.`;

      return pruneTemporaryTimelineShaders({
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              focusedStepId: getPreferredTimelineStepId(
                nextSteps,
                currentProject.timeline.stub.shaderSequence.focusedStepId === stepId
                  ? nextSelectedStepId
                  : currentProject.timeline.stub.shaderSequence.focusedStepId,
              ),
              pinnedStepId:
                currentProject.timeline.stub.shaderSequence.pinnedStepId === stepId
                  ? null
                  : currentProject.timeline.stub.shaderSequence.pinnedStepId,
              steps: nextSteps,
            },
          },
        },
      });
    });

    if (nextSelectedStepId) {
      void selectTimelineStepForEditing(nextSelectedStepId, {
        suppressStatus: true,
        focusStudioOnMobile: false,
      });
    } else if (editingTimelineStepId === stepId) {
      setEditingTimelineStepId(null);
    }

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [editingTimelineStepId, project, selectTimelineStepForEditing, updateProject]);

  const handleTimelineDuplicateStep = useCallback((stepId: string) => {
    let nextStatusMessage = '';

    updateProject((currentProject) => {
      const steps = currentProject.timeline.stub.shaderSequence.steps;
      const index = steps.findIndex((step) => step.id === stepId);
      if (index < 0) {
        return currentProject;
      }

      const step = steps[index];
      const stepShader =
        currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId) ?? null;
      const duplicateStepId = crypto.randomUUID();
      let nextSavedShaders = currentProject.studio.savedShaders;
      let duplicateShaderId = step.shaderId;
      const duplicateShaderName = createDuplicateShaderName(
        currentProject.studio.savedShaders,
        stepShader?.name ?? currentProject.studio.activeShaderName,
      );

      if (stepShader) {
        const duplicateShader = createSavedShaderRecord(
          duplicateShaderName,
          stepShader.code,
          stepShader.uniformValues,
          {
            description: 'Linked timeline shader.',
            template: stepShader.template ?? 'stage',
            group: 'Timeline',
            inputAssetId: stepShader.inputAssetId ?? null,
            isTemporary: true,
            isDirty: stepShader.isDirty,
            sourceShaderId: stepShader.sourceShaderId ?? stepShader.id,
            ownerTimelineStepId: duplicateStepId,
            versions: cloneShaderVersionsWithName(stepShader.versions, duplicateShaderName),
            lastValidCode: stepShader.lastValidCode,
            lastValidUniformValues: stepShader.lastValidUniformValues,
            compileError: stepShader.compileError,
          },
        );
        nextSavedShaders = [...currentProject.studio.savedShaders, duplicateShader];
        duplicateShaderId = duplicateShader.id;
      }

      const duplicateStep = {
        ...step,
        id: duplicateStepId,
        shaderId: duplicateShaderId,
      };
      const nextSteps = [...steps];
      nextSteps.splice(index + 1, 0, duplicateStep);
      const shaderName =
        currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId)?.name ??
        currentProject.studio.activeShaderName;
      nextStatusMessage = `Duplicated "${shaderName}" as "${duplicateShaderName}" in the timeline.`;

      return pruneTemporaryTimelineShaders({
        ...currentProject,
        studio: {
          ...currentProject.studio,
          savedShaders: nextSavedShaders,
        },
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              enabled: true,
              focusedStepId: duplicateStepId,
              steps: nextSteps,
            },
          },
        },
      });
    });

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [updateProject]);

  const handleTimelineResizeBoundary = useCallback((
    leftStepId: string,
    rightStepId: string,
    leftDurationSeconds: number,
    rightDurationSeconds: number,
  ) => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            steps: currentProject.timeline.stub.shaderSequence.steps.map((step) => {
              if (step.id === leftStepId) {
                const durationSeconds = clampTimelineStepDuration(leftDurationSeconds);
                return {
                  ...step,
                  durationSeconds,
                  transitionDurationSeconds: clampTransitionDuration(
                    durationSeconds,
                    step.transitionDurationSeconds,
                  ),
                };
              }

              if (step.id === rightStepId) {
                const durationSeconds = clampTimelineStepDuration(rightDurationSeconds);
                return {
                  ...step,
                  durationSeconds,
                  transitionDurationSeconds: clampTransitionDuration(
                    durationSeconds,
                    step.transitionDurationSeconds,
                  ),
                };
              }

              return step;
            }),
          },
        },
      },
    }));
  }, [updateProject]);

  const handleTimelineDurationChange = useCallback((durationSeconds: number) => {
    updateProject((currentProject) => {
      const nextDurationSeconds = roundTimelineSeconds(Math.max(0.5, Math.min(36000, durationSeconds)));

      if (currentProject.timeline.stub.shaderSequence.steps.length === 0) {
        return {
          ...currentProject,
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              durationSeconds: nextDurationSeconds,
            },
          },
        };
      }

      const steps = currentProject.timeline.stub.shaderSequence.steps;
      const currentTotalDurationSeconds = getShaderTimelineDuration(steps);
      const minimumTotalDurationSeconds = steps.length * 0.5;
      const clampedTotalDurationSeconds = Math.max(
        minimumTotalDurationSeconds,
        nextDurationSeconds,
      );
      const scaledSteps = scaleTimelineStepDurations(steps, clampedTotalDurationSeconds);
      const scaleRatio =
        currentTotalDurationSeconds > 0
          ? clampedTotalDurationSeconds / currentTotalDurationSeconds
          : 1;
      const smallestStepDurationSeconds = scaledSteps.reduce(
        (shortestDuration, step) =>
          Math.min(shortestDuration, clampTimelineStepDuration(step.durationSeconds)),
        Number.POSITIVE_INFINITY,
      );

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            durationSeconds: clampedTotalDurationSeconds,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              sharedTransitionDurationSeconds: clampTransitionDuration(
                Number.isFinite(smallestStepDurationSeconds)
                  ? smallestStepDurationSeconds
                  : clampedTotalDurationSeconds,
                currentProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds * scaleRatio,
              ),
              steps: scaledSteps,
            },
          },
        },
      };
    });
  }, [updateProject]);

  const handleMappingAction = (action: MappingAction) => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: applyMappingTransform(currentProject.mapping.stageTransform, action),
      },
    }));
  };

  const handleMappingReset = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          offsetX: 0,
          offsetY: 0,
          widthAdjust: 0,
          heightAdjust: 0,
        },
      },
    }));
  };

  const setMoveMode = (enabled: boolean) => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          moveMode: enabled,
        },
      },
    }));
  };

  const toggleMoveMode = () => {
    setMoveMode(!project?.mapping.stageTransform.moveMode);
  };

  const toggleRotationLock = async () => {
    const shouldLock = !project?.mapping.stageTransform.rotationLocked;
    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'portrait') => Promise<void>;
      unlock?: () => void;
    };

    if (shouldLock) {
      try {
        await orientationApi.lock?.(
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        );
      } catch (error) {
        console.debug('Rotation lock is not available on this browser.', error);
      }
    } else {
      try {
        orientationApi.unlock?.();
      } catch (error) {
        console.debug('Rotation unlock is not available on this browser.', error);
      }
    }

    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          rotationLocked: !currentProject.mapping.stageTransform.rotationLocked,
        },
      },
    }));
  };

  const updateStagePrecision = (nextPrecision: number) => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          precision: nextPrecision,
        },
      },
    }));
  };

  const handleUniformChange = (name: string, value: ShaderUniformValue) => {
    updateProject((currentProject) =>
      applyActiveShaderPatch(currentProject, {
        uniformValues: {
          ...currentProject.studio.uniformValues,
          [name]: value,
        },
      }),
    );
  };

  const selectTimelineStepByIndex = useCallback((stepIndex: number) => {
    const step = project?.timeline.stub.shaderSequence.steps[stepIndex];
    if (!step) {
      return;
    }

    void selectTimelineStepForEditing(step.id, {
      stagePreviewMode: 'focused',
      updateTimelineFocus: false,
    });
    setTimelineScrollToStepRequest({
      stepId: step.id,
      token: performance.now(),
    });
    setStatusMessage(`MIDI selected timeline step ${stepIndex + 1}.`);
  }, [project]);

  const getMidiTimelineStepIndex = useCallback(() => {
    const steps = project?.timeline.stub.shaderSequence.steps ?? [];
    if (!steps.length) {
      return -1;
    }

    const currentStepId =
      editingTimelineStepId ??
      project?.timeline.stub.shaderSequence.focusedStepId ??
      steps[0]?.id;
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);
    return currentIndex >= 0 ? currentIndex : 0;
  }, [editingTimelineStepId, project]);

  const triggerTimelineShaderByOffset = useCallback((
    offset: number,
    mode: 'cut' | 'mix',
  ) => {
    const steps = project?.timeline.stub.shaderSequence.steps ?? [];
    if (!steps.length) {
      return;
    }

    const currentIndex = getMidiTimelineStepIndex();
    const targetIndex = Math.max(0, Math.min(steps.length - 1, currentIndex + offset));
    const targetStep = steps[targetIndex];
    if (!targetStep || targetStep.disabled) {
      return;
    }

    if (mode === 'cut' || targetIndex === 0) {
      selectTimelineStepByIndex(targetIndex);
      setStatusMessage(`MIDI cut to timeline step ${targetIndex + 1}.`);
      return;
    }

    const mixDurationSeconds = clampTransitionDuration(
      clampTimelineStepDuration(steps[targetIndex - 1]?.durationSeconds ?? 1),
      project?.timeline.stub.shaderSequence.sharedTransitionDurationSeconds ??
        MIDI_MIX_DURATION_STEP_SECONDS,
    );
    const targetStartSeconds = steps
      .slice(0, targetIndex)
      .reduce((totalSeconds, step) => totalSeconds + clampTimelineStepDuration(step.durationSeconds), 0);
    const transitionStartSeconds = Math.max(0, targetStartSeconds - mixDurationSeconds);

    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: playTransport(
          seekTransport(currentProject.playback.transport, transitionStartSeconds),
        ),
      },
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            stagePreviewMode: 'timeline',
            focusedStepId: targetStep.id,
            sharedTransitionEnabled: true,
            sharedTransitionDurationSeconds: mixDurationSeconds,
          },
        },
      },
    }));
    setTimelineScrollToStepRequest({
      stepId: targetStep.id,
      token: performance.now(),
    });
    setStatusMessage(`MIDI mixed to timeline step ${targetIndex + 1}.`);
  }, [
    getMidiTimelineStepIndex,
    project,
    selectTimelineStepByIndex,
    updateProject,
  ]);

  const updateMidiMixVelocity = useCallback((normalizedValue: number) => {
    const safeValue = Math.max(0, Math.min(1, normalizedValue));
    const durationSeconds = roundTimelineSeconds(
      MIDI_MIX_DURATION_MAX_SECONDS -
        safeValue * (MIDI_MIX_DURATION_MAX_SECONDS - MIDI_MIX_DURATION_MIN_SECONDS),
    );
    handleTimelineMixDurationChange(durationSeconds);
    setStatusMessage(`MIDI mix speed set to ${durationSeconds.toFixed(2)}s.`);
  }, [handleTimelineMixDurationChange]);

  const adjustMidiMixVelocity = useCallback((direction: 'faster' | 'slower') => {
    const currentDuration =
      project?.timeline.stub.shaderSequence.sharedTransitionDurationSeconds ??
      MIDI_MIX_DURATION_STEP_SECONDS;
    const nextDuration = roundTimelineSeconds(
      Math.max(
        MIDI_MIX_DURATION_MIN_SECONDS,
        Math.min(
          MIDI_MIX_DURATION_MAX_SECONDS,
          currentDuration +
            (direction === 'faster'
              ? -MIDI_MIX_DURATION_STEP_SECONDS
              : MIDI_MIX_DURATION_STEP_SECONDS),
        ),
      ),
    );
    handleTimelineMixDurationChange(nextDuration);
    setStatusMessage(`MIDI mix speed set to ${nextDuration.toFixed(2)}s.`);
  }, [handleTimelineMixDurationChange, project]);

  const handleMidiCycleMixMode = useCallback(() => {
    const currentEffect =
      project?.timeline.stub.shaderSequence.sharedTransitionEffect ?? 'mix';
    const currentIndex = TIMELINE_TRANSITION_EFFECT_OPTIONS.findIndex(
      (option) => option.value === currentEffect,
    );
    const nextEffect =
      TIMELINE_TRANSITION_EFFECT_OPTIONS[
        (Math.max(0, currentIndex) + 1) % TIMELINE_TRANSITION_EFFECT_OPTIONS.length
      ]?.value ?? 'mix';

    handleTimelineSharedTransitionChange({
      sharedTransitionEnabled: true,
      sharedTransitionEffect: nextEffect,
    });
    setStatusMessage(`MIDI mix mode set to ${nextEffect}.`);
  }, [handleTimelineSharedTransitionChange, project]);

  const handleMidiTimelineFaderChange = useCallback((
    faderIndex: number,
    normalizedValue: number,
  ) => {
    if (!midiManualMixArmed) {
      return;
    }

    if (faderIndex !== 7) {
      return;
    }

    const enabledSteps =
      project?.timeline.stub.shaderSequence.steps.filter(isTimelineStepEnabled) ?? [];
    if (enabledSteps.length < 2) {
      return;
    }

    const safeValue = Math.max(0, Math.min(1, normalizedValue));
    setMidiManualMix((currentValue) => {
      const boundedStepIndex =
        ((currentValue.stepIndex % enabledSteps.length) + enabledSteps.length) % enabledSteps.length;

      if (
        currentValue.nextEndpoint === 'max' &&
        safeValue >= MIDI_MANUAL_MIX_MAX_TRIGGER
      ) {
        return {
          stepIndex: currentValue.stepIndex + 1,
          nextEndpoint: 'min',
          progress: 0,
        };
      }

      if (
        currentValue.nextEndpoint === 'min' &&
        safeValue <= MIDI_MANUAL_MIX_MIN_TRIGGER
      ) {
        return {
          stepIndex: currentValue.stepIndex + 1,
          nextEndpoint: 'max',
          progress: 0,
        };
      }

      return {
        ...currentValue,
        stepIndex: boundedStepIndex,
        progress: currentValue.nextEndpoint === 'max' ? safeValue : 1 - safeValue,
      };
    });
  }, [midiManualMixArmed, project]);

  const armMidiManualMix = useCallback(() => {
    const timeline = project?.timeline.stub;
    if (!project || !timeline) {
      setMidiManualMixArmed(true);
      return;
    }

    const playbackSteps = getEffectiveTimelinePlaybackSteps({
      mode: timeline.shaderSequence.mode,
      randomChoiceEnabled: timeline.shaderSequence.randomChoiceEnabled,
      steps: timeline.shaderSequence.steps,
      sharedSectionDurationSeconds: timeline.shaderSequence.sharedSectionDurationSeconds,
      sharedTransitionEnabled: timeline.shaderSequence.sharedTransitionEnabled,
      sharedTransitionDurationSeconds: timeline.shaderSequence.sharedTransitionDurationSeconds,
      pinnedStepId: timeline.shaderSequence.pinnedStepId ?? null,
    }).filter(isTimelineStepEnabled);

    if (playbackSteps.length < 2) {
      setMidiManualMixArmed(true);
      return;
    }

    const timelineRandomSeedToken =
      timeline.shaderSequence.randomSeedToken || project.sessionId;
    const currentRandomSeedSalt =
      timeline.shaderSequence.mode === 'double'
        ? `double-primary:${timelineRandomSeedToken}`
        : timeline.shaderSequence.mode === 'random' ||
            timeline.shaderSequence.mode === 'randomMix' ||
            timeline.shaderSequence.randomChoiceEnabled
          ? `random:${timelineRandomSeedToken}`
          : '';
    const currentState = resolveShaderTimelineState({
      shaders: project.studio.savedShaders,
      mode: timeline.shaderSequence.mode ?? 'sequence',
      focusedStepId: timeline.shaderSequence.focusedStepId ?? null,
      singleStepLoopEnabled: timeline.shaderSequence.singleStepLoopEnabled ?? false,
      randomChoiceEnabled: timeline.shaderSequence.randomChoiceEnabled ?? false,
      sharedTransitionEnabled: timeline.shaderSequence.sharedTransitionEnabled ?? false,
      sharedTransitionEffect: timeline.shaderSequence.sharedTransitionEffect ?? 'mix',
      sharedTransitionDurationSeconds:
        timeline.shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
      sharedSectionDurationSeconds: timeline.shaderSequence.sharedSectionDurationSeconds ?? 8,
      steps: playbackSteps,
      timeSeconds: getTransportTimeSeconds(project.playback.transport),
      loop: project.playback.transport.loop,
      randomSeedSalt: currentRandomSeedSalt,
    });
    const currentStepId =
      currentState?.currentStep.id ??
      editingTimelineStepId ??
      timeline.shaderSequence.focusedStepId ??
      playbackSteps[0]?.id ??
      null;

    const nextSeedToken = createTimelineRandomSeedToken();
    const manualMode =
      timeline.shaderSequence.mode === 'double'
        ? 'randomMix'
        : timeline.shaderSequence.randomChoiceEnabled
          ? 'random'
          : timeline.shaderSequence.mode;
    const manualCycleIndex = currentState?.cycleIndex ?? 0;
    const manualSteps = getTimelineCycleSteps({
      mode: manualMode,
      steps: playbackSteps,
      cycleIndex: manualCycleIndex,
      randomSeedSalt: nextSeedToken,
    });
    const currentIndex = Math.max(0, manualSteps.findIndex((step) => step.id === currentStepId));

    setMidiManualMixSeedToken(nextSeedToken);
    setMidiManualMix({
      stepIndex: manualCycleIndex * manualSteps.length + currentIndex,
      nextEndpoint: 'max',
      progress: 0,
    });
    setMidiManualMixArmed(true);
  }, [editingTimelineStepId, project]);

  const handleMidiTimelineTransport = useCallback((action: MidiTimelineTransportAction) => {
    switch (action) {
      case 'play':
        updateProject((currentProject) => {
          const startsFromBeginning =
            !currentProject.playback.transport.isPlaying &&
            currentProject.playback.transport.currentTimeSeconds <=
              TIMELINE_RANDOM_RESEED_EPSILON_SECONDS;
          const nextProject = startsFromBeginning
            ? withNewTimelineRandomSeed(currentProject)
            : currentProject;

          return {
            ...nextProject,
            playback: {
              ...nextProject.playback,
              transport: playTransport(nextProject.playback.transport),
            },
          };
        });
        return;
      case 'stop':
        updateProject((currentProject) => ({
          ...currentProject,
          playback: {
            ...currentProject.playback,
            transport: pauseTransport(currentProject.playback.transport),
          },
        }));
        return;
      case 'record':
        selectShader(project?.studio.activeShaderId ?? '', { addToTimeline: true });
        setStatusMessage('MIDI added the active shader to the timeline.');
        return;
      case 'previous-cut':
        triggerTimelineShaderByOffset(-1, 'cut');
        return;
      case 'next-cut':
        triggerTimelineShaderByOffset(1, 'cut');
        return;
      case 'previous-mix':
        triggerTimelineShaderByOffset(-1, 'mix');
        return;
      case 'next-mix':
        triggerTimelineShaderByOffset(1, 'mix');
        return;
      case 'mix-faster':
        adjustMidiMixVelocity('faster');
        return;
      case 'mix-slower':
        adjustMidiMixVelocity('slower');
        return;
      case 'cycle-mix-mode':
        handleMidiCycleMixMode();
        return;
      case 'manual-mix-on':
        armMidiManualMix();
        setStatusMessage('MIDI slider mix enabled.');
        return;
      case 'manual-mix-off':
        setMidiManualMixArmed(false);
        setStatusMessage('MIDI slider mix disabled. Timeline timing controls are active.');
        return;
      case 'select-left':
        selectTimelineStepByIndex(getMidiTimelineStepIndex() - 1);
        return;
      case 'select-right':
        selectTimelineStepByIndex(getMidiTimelineStepIndex() + 1);
        return;
      default:
        return;
    }
  }, [
    adjustMidiMixVelocity,
    armMidiManualMix,
    getMidiTimelineStepIndex,
    handleMidiCycleMixMode,
    handleTimelineStop,
    project,
    selectTimelineStepByIndex,
    triggerTimelineShaderByOffset,
    updateProject,
  ]);

  const midiController = useMidiController({
    enabled: midiEnabled,
    mode: midiMode,
    uniformDefinitions,
    onUniformChange: handleUniformChange,
    onModeChange: setMidiMode,
    onTimelineTransport: handleMidiTimelineTransport,
    onTimelineFaderChange: handleMidiTimelineFaderChange,
    onTimelineMixVelocityChange: updateMidiMixVelocity,
  });

  const handleToggleMidi = () => {
    setMidiEnabled((currentValue) => {
      if (!currentValue) {
        setMidiPanelVisible(true);
        return true;
      }

      if (!midiPanelVisible) {
        setMidiPanelVisible(true);
        return currentValue;
      }

      setMidiPanelVisible(false);
      return false;
    });
  };

  const selectShader = (
    shaderId: string,
    options: { addToTimeline?: boolean } = {},
  ) => {
    if (!project) {
      return;
    }

    const shader = project.studio.savedShaders.find((item) => item.id === shaderId);
    if (!shader) {
      return;
    }

    const nextEditingStepId = shader.isTemporary ? shader.ownerTimelineStepId ?? null : null;
    const shouldAddToTimeline = Boolean(options.addToTimeline && !shader.isTemporary);

    updateProject((currentProject) => {
      const currentShader =
        currentProject.studio.savedShaders.find((item) => item.id === shaderId) ?? shader;
      const nextStep =
        shouldAddToTimeline && !currentShader.isTemporary
          ? createTimelineShaderStep(currentShader.id)
          : null;

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          activeShaderId: currentShader.id,
          activeShaderName: currentShader.name,
          activeShaderCode: currentShader.code,
          shaderChatHistory: [],
          shaderVersions: getShaderVersionTrail(currentShader),
          uniformValues: getSyncedShaderUniformValues(
            currentShader.code,
            currentShader.uniformValues,
          ),
          savedShaders: currentProject.studio.savedShaders.map((item) =>
            item.id === currentShader.id
              ? {
                  ...item,
                  hasUnreadAiResult: false,
                }
              : item,
          ),
        },
        timeline: nextStep
          ? {
              stub: {
                ...currentProject.timeline.stub,
                shaderSequence: {
                  ...currentProject.timeline.stub.shaderSequence,
                  enabled: true,
                  focusedStepId: nextStep.id,
                  steps: [...currentProject.timeline.stub.shaderSequence.steps, nextStep],
                },
              },
            }
          : currentProject.timeline,
      };
    });
    setEditingTimelineStepId(nextEditingStepId);
    setPreviewShaderId(null);
    setStudioPreviewOverride(!shouldAddToTimeline && !shader.isTemporary);
    clearGeneratedShaderRetry();
    setStatusMessage(
      shader.isTemporary
        ? `Editing linked timeline shader "${shader.name}".`
        : shouldAddToTimeline
          ? `Loaded preset "${shader.name}" and added it to the timeline.`
          : `Loaded preset "${shader.name}" in the console preview.`,
    );
    setPreferLiveShaderCompilePreview(false);
    setCompilerError(shader.compileError ?? '');
    closeMobileShaderDialog();
  };

  const hasDesktopDialogOpen =
    !isMobile &&
    (isApiSettingsOpen ||
      isAssetLibraryOpen ||
      isProjectDialogOpen ||
      isShareDialogOpen ||
      isPresetBrowserOpen ||
      isSliceStudioDialogOpen);

  const cyclePreviewShader = (direction: 1 | -1) => {
    if (!project) {
      return;
    }

    const availableShaders = project.studio.savedShaders;
    if (availableShaders.length < 2) {
      return;
    }

    const activeIndex = availableShaders.findIndex(
      (shader) => shader.id === project.studio.activeShaderId,
    );
    const nextIndex =
      activeIndex === -1
        ? direction > 0
          ? 0
          : availableShaders.length - 1
        : (activeIndex + direction + availableShaders.length) % availableShaders.length;
    const nextShader = availableShaders[nextIndex];

    if (!nextShader || nextShader.id === project.studio.activeShaderId) {
      return;
    }

    selectShader(nextShader.id);
  };

  useEffect(() => {
    if (isMobile) {
      setDesktopStageKeyboardArmed(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const stageElement = stageViewportRef.current;
      const target = event.target instanceof Node ? event.target : null;
      if (!stageElement || !target) {
        setDesktopStageKeyboardArmed(false);
        return;
      }

      setDesktopStageKeyboardArmed(stageElement.contains(target));
    };

    const handleFocusIn = (event: FocusEvent) => {
      const stageElement = stageViewportRef.current;
      const target = event.target instanceof Node ? event.target : null;
      if (!stageElement || !target) {
        return;
      }

      setDesktopStageKeyboardArmed(stageElement.contains(target));
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('focusin', handleFocusIn, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile || !desktopStageKeyboardArmed) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasDesktopDialogOpen || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        cyclePreviewShader(1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        cyclePreviewShader(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [cyclePreviewShader, desktopStageKeyboardArmed, hasDesktopDialogOpen, isMobile]);

  useEffect(() => {
    if (hasDesktopDialogOpen) {
      setDesktopStageKeyboardArmed(false);
    }
  }, [hasDesktopDialogOpen]);

  const handleStageViewportPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (isMobile || hasDesktopDialogOpen) {
      return;
    }

    const stageElement = event.currentTarget;
    setDesktopStageKeyboardArmed(true);
    window.requestAnimationFrame(() => {
      stageElement.focus();
    });
  };

  const saveCurrentShader = () => {
    if (!project) {
      return;
    }

    const label =
      window.prompt('Name this shader node', project.studio.activeShaderName || 'Mapshroom Shader')
        ?.trim() || '';

    if (!label) {
      return;
    }

    updateProject((currentProject) => {
      const nextUniformValues = getSyncedShaderUniformValues(
        currentProject.studio.activeShaderCode,
        currentProject.studio.uniformValues,
      );
      const activeShader = currentProject.studio.savedShaders.find(
        (shader) => shader.id === currentProject.studio.activeShaderId,
      );

      if (activeShader?.isTemporary) {
        return {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderName: label,
            savedShaders: currentProject.studio.savedShaders.map((shader) =>
              shader.id === activeShader.id
                ? {
                    ...shader,
                    name: label,
                    code: currentProject.studio.activeShaderCode,
                    versions: currentProject.studio.shaderVersions,
                    uniformValues: nextUniformValues,
                    description: 'Saved from the timeline editor.',
                    group: 'Saved',
                    isTemporary: false,
                    isDirty: false,
                    sourceShaderId: undefined,
                    ownerTimelineStepId: undefined,
                    hasUnreadAiResult: false,
                    lastValidCode: shader.lastValidCode,
                    lastValidUniformValues: shader.lastValidUniformValues,
                    compileError: shader.compileError,
                  }
                : shader,
            ),
          },
        };
      }

      const savedShader = createSavedShaderRecord(
        label,
        currentProject.studio.activeShaderCode,
        nextUniformValues,
        {
          description: activeShader?.description ?? 'Saved from the current workspace state.',
          template: activeShader?.template ?? 'stage',
          group: activeShader?.group ?? 'Saved',
          inputAssetId: activeShader?.inputAssetId ?? null,
          versions: currentProject.studio.shaderVersions,
        },
      );

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          savedShaders: [...currentProject.studio.savedShaders, savedShader],
          activeShaderId: savedShader.id,
          activeShaderName: label,
          shaderVersions: currentProject.studio.shaderVersions,
        },
      };
    });
    setStatusMessage(
      activeTimelineDraft
        ? `Saved linked timeline shader "${label}" to the library.`
        : `Saved shader "${label}" to the library.`,
    );
  };

  const createNewShader = () => {
    const nextCode = blankShaderTemplate;
    const nextName = parseShaderName(nextCode);
    const nextStepId = crypto.randomUUID();
    const nextShaderVersions = [createShaderVersion('New Shader', nextName, nextCode)];
    const nextShader = createSavedShaderRecord(
      nextName,
      nextCode,
      {},
      {
        description: 'Linked timeline shader.',
        template: 'stage',
        group: 'Timeline',
        isTemporary: true,
        isDirty: false,
        ownerTimelineStepId: nextStepId,
        versions: nextShaderVersions,
      },
    );
    const nextStep = {
      ...createTimelineShaderStep(nextShader.id),
      id: nextStepId,
      shaderId: nextShader.id,
    };

    setCompilerError('');
    setPreferLiveShaderCompilePreview(false);
    setAiPrompt('');
    clearGeneratedShaderRetry();
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderId: nextShader.id,
        activeShaderName: nextName,
        activeShaderCode: nextCode,
        shaderChatHistory: [],
        shaderVersions: nextShaderVersions,
        uniformValues: getSyncedShaderUniformValues(nextCode, nextShader.uniformValues),
        savedShaders: [...currentProject.studio.savedShaders, nextShader],
      },
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            enabled: true,
            focusedStepId: nextStepId,
            steps: [...currentProject.timeline.stub.shaderSequence.steps, nextStep],
          },
        },
      },
    }));
    setEditingTimelineStepId(nextStepId);
    setStatusMessage(`Started ${nextName} and linked it into the timeline.`);
  };

  const restoreShaderVersion = (versionId: string) => {
    if (!project) {
      return;
    }

    const version = project.studio.shaderVersions.find((item) => item.id === versionId);
    if (!version) {
      return;
    }

    clearGeneratedShaderRetry();
    setPreferLiveShaderCompilePreview(true);
    updateProject((currentProject) =>
      applyActiveShaderPatch(currentProject, {
        activeShaderCode: version.code,
        activeShaderName: version.name,
      }),
    );
    setStatusMessage(`Restored "${version.name}".`);
  };

  const reloadShaderCode = () => {
    if (!project) {
      return;
    }

    clearGeneratedShaderRetry();
    setCompilerError('');
    setPreferLiveShaderCompilePreview(true);
    setShaderCompileNonce((currentValue) => currentValue + 1);
    setStatusMessage('Recompiling current code...');
  };

  const handleShaderMutation = async (
    prompt: string,
    options?: {
      historyPrompt?: string;
      trigger?: 'generate' | 'fix' | 'quick_add';
    },
  ) => {
    if (!project) {
      return;
    }

    const llmTrigger = options?.trigger ?? 'generate';
    const aiReady = hasConfiguredShaderAi(project.ai.settings);
    if (!aiReady) {
      setApiSettingsVariant('setup');
      setIsApiSettingsOpen(true);
      setAiFeedbackTone('idle');
      setAiFeedbackMessage('Choose a local model or connect an AI provider to generate shaders.');
      return;
    }

    const trimmedPrompt = prompt.trim();
    const historyPrompt = options?.historyPrompt?.trim() || trimmedPrompt;
    if (!trimmedPrompt) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage('Write a shader prompt first, then generate.');
      setStatusMessage('Add a prompt before generating.');
      return;
    }

    const requestedShaderId = project.studio.activeShaderId;
    const requestedShader = project.studio.savedShaders.find(
      (shader) => shader.id === requestedShaderId,
    );
    const nextAutosavedShader = requestedShader
      ? null
      : createSavedShaderRecord(
          project.studio.activeShaderName,
          project.studio.activeShaderCode,
          project.studio.uniformValues,
          {
            description: 'Autosaved shader from the workspace editor.',
            template: 'stage',
            group: 'Autosaved',
            versions: project.studio.shaderVersions,
          },
        );
    const targetShaderId = nextAutosavedShader?.id ?? requestedShaderId;
    const currentCode = project.studio.activeShaderCode;
    const chatHistorySnapshot =
      requestedShader && requestedShader.id === project.studio.activeShaderId
        ? project.studio.shaderChatHistory
        : [];

    setCompilerError('');
    clearGeneratedShaderRetry(targetShaderId);
    setAiFeedbackTone('loading');
    setAiFeedbackMessage('');
    setStatusMessage(
      editingTimelineStepIndex !== null
        ? `Generating shader for timeline step ${editingTimelineStepIndex + 1}...`
        : 'Generating shader...',
    );

    updateProject((currentProject) => {
      const shouldRetargetActiveShader =
        nextAutosavedShader !== null && currentProject.studio.activeShaderId === requestedShaderId;
      const baseSavedShaders =
        nextAutosavedShader && !currentProject.studio.savedShaders.some((shader) => shader.id === targetShaderId)
          ? [...currentProject.studio.savedShaders, nextAutosavedShader]
          : currentProject.studio.savedShaders;

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          activeShaderId: shouldRetargetActiveShader ? targetShaderId : currentProject.studio.activeShaderId,
          activeShaderName: shouldRetargetActiveShader
            ? nextAutosavedShader?.name ?? currentProject.studio.activeShaderName
            : currentProject.studio.activeShaderName,
          activeShaderCode: shouldRetargetActiveShader
            ? nextAutosavedShader?.code ?? currentProject.studio.activeShaderCode
            : currentProject.studio.activeShaderCode,
          uniformValues: shouldRetargetActiveShader
            ? getSyncedShaderUniformValues(
                nextAutosavedShader?.code ?? currentProject.studio.activeShaderCode,
                nextAutosavedShader?.uniformValues ?? currentProject.studio.uniformValues,
              )
            : currentProject.studio.uniformValues,
          savedShaders: baseSavedShaders.map((shader) =>
            shader.id === targetShaderId
              ? {
                  ...shader,
                  pendingAiJobCount: getPendingAiJobCount(shader) + 1,
                  hasUnreadAiResult: false,
                }
              : shader,
          ),
        },
      };
    });

    const userMessage = buildShaderMutationPrompt(trimmedPrompt, currentCode);

    try {
      const nextCode = await requestShaderMutation({
        settings: project.ai.settings,
        prompt: trimmedPrompt,
        currentCode,
        chatHistory: chatHistorySnapshot,
        stageImage: project.ai.settings.visionEnabled
          ? stageCanvasRef.current?.toDataURL('image/jpeg', 0.82)
          : undefined,
      });
      const nextName = parseShaderName(nextCode);
      const validationError = validateShaderCodeCompilation(nextCode);
      const versionId = crypto.randomUUID();
      generatedShaderRetryRef.current[targetShaderId] = {
        sourcePrompt: trimmedPrompt,
        code: nextCode,
        autoRepairUsed: false,
        versionId,
        retryInFlight: false,
      };
      let appliedToActiveShader = false;

      updateProject((currentProject) => {
        const targetShader = currentProject.studio.savedShaders.find(
          (shader) => shader.id === targetShaderId,
        );
        if (!targetShader) {
          return currentProject;
        }

        appliedToActiveShader = currentProject.studio.activeShaderId === targetShaderId;
        const nextShaderVersion = createShaderVersion(historyPrompt, nextName, nextCode, versionId);
        const nextShaderVersions = [
          ...(appliedToActiveShader
            ? currentProject.studio.shaderVersions
            : getShaderVersionTrail(targetShader)),
          nextShaderVersion,
        ];
        const nextUniformValues = getSyncedShaderUniformValues(
          nextCode,
          appliedToActiveShader ? currentProject.studio.uniformValues : targetShader.uniformValues,
        );
        const nextLastValidCode = validationError
          ? targetShader.lastValidCode ?? targetShader.code
          : nextCode;
        const nextLastValidUniformValues = validationError
          ? getRenderableShaderUniformValues(targetShader)
          : nextUniformValues;

        return {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderName: appliedToActiveShader ? nextName : currentProject.studio.activeShaderName,
            activeShaderCode: appliedToActiveShader ? nextCode : currentProject.studio.activeShaderCode,
            uniformValues: appliedToActiveShader
              ? nextUniformValues
              : currentProject.studio.uniformValues,
            shaderChatHistory: appliedToActiveShader
              ? [
                  ...currentProject.studio.shaderChatHistory,
                  { role: 'user' as const, text: userMessage },
                  { role: 'model' as const, text: `\`\`\`glsl\n${nextCode}\n\`\`\`` },
                ]
              : currentProject.studio.shaderChatHistory,
            shaderVersions: appliedToActiveShader
              ? nextShaderVersions
              : currentProject.studio.shaderVersions,
            savedShaders: currentProject.studio.savedShaders.map((shader) =>
              shader.id === targetShaderId
                ? {
                    ...shader,
                    name: nextName,
                    code: nextCode,
                    versions: nextShaderVersions,
                    uniformValues: nextUniformValues,
                    lastValidCode: nextLastValidCode,
                    lastValidUniformValues: nextLastValidUniformValues,
                    compileError: validationError ?? undefined,
                    isDirty: true,
                    pendingAiJobCount: Math.max(0, getPendingAiJobCount(shader) - 1),
                    hasUnreadAiResult: appliedToActiveShader ? false : true,
                  }
                : shader,
            ),
          },
        };
      });
      setAiPrompt((currentPrompt) =>
        currentPrompt.trim() === trimmedPrompt ? '' : currentPrompt,
      );
      if (validationError && appliedToActiveShader) {
        setPreferLiveShaderCompilePreview(true);
        applyCompilerFeedback(validationError);
        setStatusMessage(
          `Shader returned with GLSL errors. Keeping the previous valid render for ${nextName}.`,
        );
      } else if (appliedToActiveShader) {
        setPreferLiveShaderCompilePreview(true);
        setAiFeedbackTone('success');
        setAiFeedbackMessage(`Shader applied to the stage: ${nextName}.`);
        setStatusMessage(`Shader updated: ${nextName}`);
        closeMobileShaderDialog();
      } else if (validationError) {
        clearGeneratedShaderRetry(targetShaderId);
        setStatusMessage(
          `AI updated "${nextName}" but it has GLSL errors, so the previous valid render is still in use.`,
        );
      } else {
        setStatusMessage(`AI finished and updated "${nextName}" in the timeline.`);
      }
      trackLlmRequest({
        provider: project.ai.settings.shaderProvider,
        runtime: project.ai.settings.shaderRuntime,
        outcome: 'success',
        trigger: llmTrigger,
      });
    } catch (error) {
      const message = error instanceof Error ? sanitizeAiMessage(error.message) : 'Shader generation failed.';
      let failedOnActiveShader = false;

      updateProject((currentProject) => {
        failedOnActiveShader = currentProject.studio.activeShaderId === targetShaderId;

        return {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            savedShaders: currentProject.studio.savedShaders.map((shader) =>
              shader.id === targetShaderId
                ? {
                    ...shader,
                    pendingAiJobCount: Math.max(0, getPendingAiJobCount(shader) - 1),
                  }
                : shader,
            ),
          },
        };
      });

      trackLlmRequest({
        provider: project.ai.settings.shaderProvider,
        runtime: project.ai.settings.shaderRuntime,
        outcome: 'error',
        trigger: llmTrigger,
      });

      if (failedOnActiveShader) {
        setCompilerError(message);
        setAiFeedbackTone('error');
        setAiFeedbackMessage(message);
        setStatusMessage('Shader generation failed.');
      } else {
        setStatusMessage(`Background shader generation failed: ${message}`);
      }
      clearGeneratedShaderRetry(targetShaderId);
    }
  };

  useEffect(() => {
    if (!project || !compilerError.trim()) {
      return;
    }

    const activeShaderId = project.studio.activeShaderId;
    const generatedShaderState = generatedShaderRetryRef.current[activeShaderId];
    if (!generatedShaderState || generatedShaderState.autoRepairUsed) {
      return;
    }

    if (generatedShaderState.code !== project.studio.activeShaderCode) {
      return;
    }

    if (!compilerError.startsWith('GLSL Error:')) {
      return;
    }

    if (generatedShaderState.retryInFlight) {
      return;
    }

    if (generatedShaderState.autoRepairUsed) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage(compilerError);
      setStatusMessage('Shader still has GLSL errors.');
      clearGeneratedShaderRetry(activeShaderId);
      return;
    }

    generatedShaderState.autoRepairUsed = true;
    generatedShaderState.retryInFlight = true;

    const originalPrompt = generatedShaderState.sourcePrompt;
    const brokenCode = project.studio.activeShaderCode;
    const repairPrompt = `${originalPrompt}

The previous shader failed to compile in WebGL GLSL. Fix the shader and return a corrected full shader.

Compiler error:
${compilerError}`;

    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        savedShaders: currentProject.studio.savedShaders.map((shader) =>
          shader.id === activeShaderId
            ? {
                ...shader,
                pendingAiJobCount: getPendingAiJobCount(shader) + 1,
              }
            : shader,
        ),
      },
    }));
    setAiFeedbackTone('loading');
    setAiFeedbackMessage(
      'Generated shader hit a GLSL error. Retrying once with the compiler error.',
    );
    setStatusMessage('Retrying shader after GLSL error...');

    void requestShaderMutation({
      settings: project.ai.settings,
      prompt: repairPrompt,
      currentCode: brokenCode,
    })
      .then((nextCode) => {
        const nextName = parseShaderName(nextCode);
        const validationError = validateShaderCodeCompilation(nextCode);
        const versionId = crypto.randomUUID();
        generatedShaderRetryRef.current[activeShaderId] = {
          sourcePrompt: originalPrompt,
          code: nextCode,
          autoRepairUsed: true,
          versionId,
          retryInFlight: false,
        };

        updateProject((currentProject) => {
          const nextUniformValues = getSyncedShaderUniformValues(
            nextCode,
            currentProject.studio.uniformValues,
          );
          const activeShader =
            currentProject.studio.savedShaders.find((shader) => shader.id === activeShaderId) ?? null;
          const nextShaderVersions = [
            ...currentProject.studio.shaderVersions,
            createShaderVersion('Auto-fix after GLSL error', nextName, nextCode, versionId),
          ];
          const nextLastValidCode = validationError
            ? activeShader?.lastValidCode ?? activeShader?.code ?? currentProject.studio.activeShaderCode
            : nextCode;
          const nextLastValidUniformValues = validationError && activeShader
            ? getRenderableShaderUniformValues(activeShader)
            : nextUniformValues;

          return {
            ...currentProject,
            studio: {
              ...currentProject.studio,
              activeShaderName: nextName,
              activeShaderCode: nextCode,
              uniformValues: nextUniformValues,
              shaderVersions: nextShaderVersions,
              savedShaders: currentProject.studio.savedShaders.map((shader) =>
                shader.id === activeShaderId
                  ? {
                      ...shader,
                      name: nextName,
                      code: nextCode,
                      versions: nextShaderVersions,
                      uniformValues: nextUniformValues,
                      lastValidCode: nextLastValidCode,
                      lastValidUniformValues: nextLastValidUniformValues,
                      compileError: validationError ?? undefined,
                      isDirty: true,
                      pendingAiJobCount: Math.max(0, getPendingAiJobCount(shader) - 1),
                      hasUnreadAiResult: false,
                    }
                  : shader,
              ),
            },
          };
        });
        if (validationError) {
          setPreferLiveShaderCompilePreview(true);
          applyCompilerFeedback(validationError);
          setStatusMessage(
            `Auto-fix still has GLSL errors. Keeping the previous valid render for ${nextName}.`,
          );
        } else {
          setPreferLiveShaderCompilePreview(true);
          setAiFeedbackTone('success');
          setAiFeedbackMessage(`Shader auto-fixed and applied: ${nextName}.`);
          setStatusMessage(`Shader auto-fixed: ${nextName}`);
        }
        trackLlmRequest({
          provider: project.ai.settings.shaderProvider,
          runtime: project.ai.settings.shaderRuntime,
          outcome: 'success',
          trigger: 'fix',
        });
      })
      .catch((error) => {
        const message =
          error instanceof Error ? sanitizeAiMessage(error.message) : 'Shader auto-fix failed.';
        setCompilerError(message);
        setAiFeedbackTone('error');
        setAiFeedbackMessage(message);
        setStatusMessage('Shader auto-fix failed.');
        clearGeneratedShaderRetry(activeShaderId);
        trackLlmRequest({
          provider: project.ai.settings.shaderProvider,
          runtime: project.ai.settings.shaderRuntime,
          outcome: 'error',
          trigger: 'fix',
        });
        updateProject((currentProject) => ({
          ...currentProject,
          studio: {
            ...currentProject.studio,
            savedShaders: currentProject.studio.savedShaders.map((shader) =>
              shader.id === activeShaderId
                ? {
                    ...shader,
                    pendingAiJobCount: Math.max(0, getPendingAiJobCount(shader) - 1),
                  }
                : shader,
            ),
          },
        }));
      })
      .finally(() => {});
  }, [compilerError, project, updateProject]);

  const handleFixError = () => {
    if (!project || !compilerError.trim()) return;
    const errorSnapshot = compilerError;
    void handleShaderMutation(
      `Fix the following error in this shader and return a corrected version.
The shader MUST start with // NAME: <name> on the first line.
The shader MUST define: vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution)
Do NOT declare void main() or write to gl_FragColor.
Use WebGL 1.0 GLSL syntax with texture2D().

Error:
${errorSnapshot}`,
      { trigger: 'fix' },
    );
  };

  const handleUniformQuickAdd = async () => {
    const sanitized = newUniformName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!sanitized) {
      return;
    }

    setNewUniformName('');
    await handleShaderMutation(
      `Integrate a new parameter named '${sanitized}'. Add 'uniform float ${sanitized}; // @min 0.0 @max 1.0 @default 0.5' and use it.`,
      { historyPrompt: `Add slider: ${sanitized}`, trigger: 'quick_add' },
    );
  };

  const handleOutputWindowOpen = () => {
    if (!project) {
      return;
    }

    const nextUrl = `${window.location.origin}${window.location.pathname}#/output/${project.sessionId}`;
    const existingWindow = outputWindowRef.current;
    const publishProjectToOutput = () => {
      sessionSyncRef.current?.publish(project);
    };

    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      publishProjectToOutput();
      setOutputWindowOpen(true);
      setStatusMessage('Projection window focused.');
      return;
    }

    const popup = window.open(nextUrl, 'mapshroom-output', 'popup,width=1440,height=900');
    if (!popup) {
      setStatusMessage('Popup blocked. Allow popups to open the output window.');
      return;
    }

    outputWindowRef.current = popup;
    setOutputWindowOpen(true);
    publishProjectToOutput();
    window.setTimeout(publishProjectToOutput, 200);
    window.setTimeout(publishProjectToOutput, 800);
    setStatusMessage('Projection window opened.');
  };

  useEffect(() => {
    if (!outputWindowOpen) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!outputWindowRef.current || outputWindowRef.current.closed) {
        outputWindowRef.current = null;
        setOutputWindowOpen(false);
      }
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [outputWindowOpen]);

  const updateAiSetting = (field: keyof AiSettings, value: string | boolean) => {
    if (typeof value === 'string') {
      const storageKey = field === 'openaiApiKey'
        ? OPENAI_API_KEY_STORAGE_KEY
        : field === 'anthropicApiKey'
          ? ANTHROPIC_API_KEY_STORAGE_KEY
          : field === 'googleApiKey'
            ? GOOGLE_API_KEY_STORAGE_KEY
            : null;
      if (storageKey && value) localStorage.setItem(storageKey, value);
      else if (storageKey) localStorage.removeItem(storageKey);
    }
    const nextSettings = project
      ? {
          ...project.ai.settings,
          [field]: value,
        }
      : null;
    updateProject((currentProject) => ({
      ...currentProject,
      ai: {
        settings: {
          ...currentProject.ai.settings,
          [field]: value,
        },
      },
    }));
    if (nextSettings) {
      trackApiPresence(getAnalyticsAiPresence(nextSettings));
    }
  };

  const updateWorkspaceMode = (mode: WorkspaceMode) => {
    setUiPreferences((currentValue) => ({
      ...currentValue,
      workspaceMode: mode,
    }));
  };

  const updateMobileUiMode = (mode: MobileUiMode) => {
    setUiPreferences((currentValue) => ({
      ...currentValue,
      mobileUiMode: mode,
    }));
  };

  const toggleSidebarVisibility = () => {
    setUiPreferences((currentValue) => ({
      ...currentValue,
      sidebarVisible: !currentValue.sidebarVisible,
    }));
  };

  const handleClearLocalData = async () => {
    const confirmed = window.confirm(
      'Clear all saved Mapshroom data for this site on this device? This removes projects, imported assets, UI settings, and local cache.',
    );
    if (!confirmed) {
      return;
    }

    setIsClearingLocalData(true);

    try {
      if (outputWindowRef.current && !outputWindowRef.current.closed) {
        outputWindowRef.current.close();
      }
      outputWindowRef.current = null;
      setOutputWindowOpen(false);
      sessionSyncRef.current?.destroy();
      midiOutputSyncRef.current?.destroy();
      await clearPersistedSiteData();
      window.location.reload();
    } catch (error) {
      console.warn('Unable to clear local site data.', error);
      setIsClearingLocalData(false);
      setStatusMessage('Unable to clear local data.');
    }
  };

  const toggleDesktopSlidersWindow = () => {
    setUiPreferences((currentValue) => {
      const nextEnabled = !currentValue.desktopSlidersWindowEnabled;

      return {
        ...currentValue,
        desktopSlidersWindowEnabled: nextEnabled,
        sidebarVisible: nextEnabled ? true : currentValue.sidebarVisible,
      };
    });
  };

  const handleMobileToggleMapping = () => {
    updateMobileUiMode('full');
    toggleMoveMode();
  };

  const handleOpenMobileTimeline = () => {
    setMobilePanel(null);
    setMoveMode(false);
    setIsMobileTimelineOpen(true);
  };

  const handleStageReveal = useCallback(() => {
    if (!isMobile || uiPreferences.mobileUiMode !== 'hidden') return;
    updateMobileUiMode('bar');
  }, [isMobile, uiPreferences.mobileUiMode]);

  const handleMobileHide = () => {
    setMobilePanel(null);
    setMoveMode(false);
    setIsMobileTimelineOpen(false);
    updateMobileUiMode('hidden');
  };

  const handleMobilePanelChange = (panel: MobilePanelKey) => {
    if (panel && uiPreferences.mobileUiMode !== 'full') {
      updateMobileUiMode('full');
    }
    if (panel !== null) {
      setMoveMode(false);
    }
    setMobilePanel(panel);
  };

  const requestTimelineAssetPicker = useCallback((stepId: string) => {
    if (isMobile) {
      updateMobileUiMode('full');
      setIsMobileTimelineOpen(true);
    }

    setTimelineAssetPickerRequest((currentValue) => ({
      stepId,
      token: currentValue.token + 1,
    }));
  }, [isMobile, updateMobileUiMode]);

  const closeMobileShaderDialog = () => {
    if (!isMobile) {
      return;
    }

    setIsPresetBrowserOpen(false);
    setMobilePanel((currentPanel) => (currentPanel === 'studio' ? null : currentPanel));

    if (uiPreferences.mobileUiMode === 'full') {
      updateMobileUiMode('bar');
    }
  };

  function selectTimelineStepForEditing(
    stepId: string,
    options?: {
      suppressStatus?: boolean;
      focusStudioOnMobile?: boolean;
      stagePreviewMode?: TimelineStagePreviewMode;
      seekTimeSeconds?: number | null;
      updateTimelineFocus?: boolean;
    },
  ) {
    let nextStatusMessage = '';
    let nextCompilerError = '';
    let didSelectStep = false;

    updateProject((currentProject) => {
      const step = currentProject.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
      if (!step) {
        return currentProject;
      }

      const sourceShader = currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId);
      if (!sourceShader) {
        return currentProject;
      }

      didSelectStep = true;

      const stepIndex = currentProject.timeline.stub.shaderSequence.steps.findIndex(
        (item) => item.id === stepId,
      );
      const isOwnedDraft = sourceShader.isTemporary && sourceShader.ownerTimelineStepId === stepId;
      const editableShader = isOwnedDraft
        ? sourceShader
        : createSavedShaderRecord(
            sourceShader.name,
            sourceShader.code,
            sourceShader.uniformValues,
            {
              description: 'Linked timeline shader.',
              template: sourceShader.template ?? 'stage',
              group: 'Timeline',
              inputAssetId: sourceShader.inputAssetId ?? null,
              isTemporary: true,
              isDirty: false,
              sourceShaderId: sourceShader.sourceShaderId ?? sourceShader.id,
              ownerTimelineStepId: stepId,
              versions: sourceShader.versions,
              lastValidCode: sourceShader.lastValidCode,
              lastValidUniformValues: sourceShader.lastValidUniformValues,
              compileError: sourceShader.compileError,
            },
          );
      const nextSavedShaders = isOwnedDraft
        ? currentProject.studio.savedShaders
        : [...currentProject.studio.savedShaders, editableShader];
      const nextSteps = currentProject.timeline.stub.shaderSequence.steps.map((item) =>
        item.id === stepId ? { ...item, shaderId: editableShader.id } : item,
      );
      const isAlreadyActive = currentProject.studio.activeShaderId === editableShader.id;

      nextStatusMessage = isOwnedDraft
        ? `Editing linked shader for timeline step ${stepIndex + 1}.`
        : `Linked timeline step ${stepIndex + 1} to its own editable shader.`;
      nextCompilerError = editableShader.compileError ?? '';
      const shouldUpdateTimelineFocus = options?.updateTimelineFocus !== false;

      return pruneTemporaryTimelineShaders(
        {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderId: editableShader.id,
            activeShaderName: editableShader.name,
            activeShaderCode: editableShader.code,
            shaderChatHistory: isAlreadyActive ? currentProject.studio.shaderChatHistory : [],
            shaderVersions: isAlreadyActive
              ? currentProject.studio.shaderVersions
              : getShaderVersionTrail(editableShader),
            uniformValues: getSyncedShaderUniformValues(
              editableShader.code,
              editableShader.uniformValues,
            ),
            savedShaders: nextSavedShaders.map((shader) =>
              shader.id === editableShader.id
                ? {
                    ...shader,
                    hasUnreadAiResult: false,
                  }
                : shader,
            ),
          },
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              shaderSequence: {
                ...currentProject.timeline.stub.shaderSequence,
                stagePreviewMode:
                  options?.stagePreviewMode ??
                  currentProject.timeline.stub.shaderSequence.stagePreviewMode,
                focusedStepId: shouldUpdateTimelineFocus
                  ? stepId
                  : currentProject.timeline.stub.shaderSequence.focusedStepId,
                steps: nextSteps,
              },
            },
          },
          playback:
            options?.seekTimeSeconds !== undefined && options.seekTimeSeconds !== null
              ? {
                  ...currentProject.playback,
                  transport: seekTransport(
                    currentProject.playback.transport,
                    options.seekTimeSeconds,
                  ),
                }
              : currentProject.playback,
        },
        [editableShader.id],
      );
    });

    clearGeneratedShaderRetry();
    setCompilerError(nextCompilerError);
    setPreferLiveShaderCompilePreview(false);
    setStudioPreviewOverride(false);
    setEditingTimelineStepId(stepId);

    if (isMobile && options?.focusStudioOnMobile !== false) {
      updateMobileUiMode('full');
      setMobilePanel('studio');
      setIsMobileTimelineOpen(false);
    }

    if (nextStatusMessage && !options?.suppressStatus) {
      setStatusMessage(nextStatusMessage);
    }

    return didSelectStep;
  }

  const handleTimelineEditStep = useCallback((stepId: string) => {
    void selectTimelineStepForEditing(stepId, {
      stagePreviewMode: 'focused',
      updateTimelineFocus: false,
    });
  }, [selectTimelineStepForEditing]);

  const handlePinnedIndicatorClick = useCallback(() => {
    if (!pinnedTimelineStepId) {
      return;
    }

    handleTimelineEditStep(pinnedTimelineStepId);
    setTimelineScrollToStepRequest({
      stepId: pinnedTimelineStepId,
      token: performance.now(),
    });

    if (isMobile) {
      setIsMobileTimelineOpen(true);
    }
  }, [handleTimelineEditStep, isMobile, pinnedTimelineStepId]);

  const handleStageNavigateToTimelineStep = useCallback(
    (stepId: string) => {
      handleTimelineEditStep(stepId);
      setTimelineScrollToStepRequest({
        stepId,
        token: performance.now(),
      });

      if (isMobile) {
        setIsMobileTimelineOpen(true);
      }
    },
    [handleTimelineEditStep, isMobile],
  );

  useEffect(() => {
    if (!project) {
      return;
    }

    const publishLiveOutputState = () => {
      const outputTimelineStub = project.timeline.stub;
      const outputTimelinePlaybackSteps = getEffectiveTimelinePlaybackSteps({
        mode: outputTimelineStub.shaderSequence.mode,
        randomChoiceEnabled: outputTimelineStub.shaderSequence.randomChoiceEnabled,
        steps: outputTimelineStub.shaderSequence.steps,
        sharedSectionDurationSeconds:
          outputTimelineStub.shaderSequence.sharedSectionDurationSeconds,
        sharedTransitionEnabled: outputTimelineStub.shaderSequence.sharedTransitionEnabled,
        sharedTransitionDurationSeconds:
          outputTimelineStub.shaderSequence.sharedTransitionDurationSeconds,
        pinnedStepId: outputTimelineStub.shaderSequence.pinnedStepId ?? null,
      }).filter(isTimelineStepEnabled);
      const outputMidiMode =
        outputTimelineStub.shaderSequence.mode === 'double'
          ? 'randomMix'
          : outputTimelineStub.shaderSequence.randomChoiceEnabled
            ? 'random'
            : outputTimelineStub.shaderSequence.mode;
      const outputCycleIndex =
        outputTimelinePlaybackSteps.length > 0
          ? Math.floor(Math.max(0, midiManualMix.stepIndex) / outputTimelinePlaybackSteps.length)
          : 0;
      const outputMidiSteps = getTimelineCycleSteps({
        mode: outputMidiMode,
        steps: outputTimelinePlaybackSteps,
        cycleIndex: outputCycleIndex,
        randomSeedSalt: midiManualMixSeedToken,
      });
      const outputStepIndex =
        outputMidiSteps.length > 0
          ? ((midiManualMix.stepIndex % outputMidiSteps.length) + outputMidiSteps.length) %
            outputMidiSteps.length
          : 0;
      const outputCurrentStep = outputMidiSteps[outputStepIndex] ?? null;
      const outputNextStep =
        outputMidiSteps.length > 1
          ? outputMidiSteps[(outputStepIndex + 1) % outputMidiSteps.length] ?? null
          : null;
      const outputFollowingStep =
        outputMidiSteps.length > 2
          ? outputMidiSteps[(outputStepIndex + 2) % outputMidiSteps.length] ?? null
          : outputMidiSteps.length > 1
            ? outputMidiSteps[outputStepIndex] ?? null
            : null;
      const outputMidiEnabled =
        midiEnabled &&
        midiMode === 'timeline-mixer' &&
        midiManualMixArmed &&
        Boolean(outputCurrentStep && outputNextStep);

      midiOutputSyncRef.current?.publish({
        enabled: outputMidiEnabled,
        currentStepId: outputCurrentStep?.id ?? null,
        nextStepId: outputNextStep?.id ?? null,
        followingStepId: outputFollowingStep?.id ?? null,
        progress: midiManualMix.progress,
        updatedAt: Date.now(),
        transport: project.playback.transport,
      });
    };

    publishLiveOutputState();

    if (!project.playback.transport.isPlaying) {
      return;
    }

    const intervalId = window.setInterval(publishLiveOutputState, 250);
    return () => window.clearInterval(intervalId);
  }, [midiEnabled, midiManualMix, midiManualMixArmed, midiManualMixSeedToken, midiMode, project]);

  useEffect(() => {
    if (!project) {
      return;
    }
    signalProjectReady();
  }, [project]);

  if (!project) {
    return null;
  }

  const stageTransform = project.mapping.stageTransform;
  const workspacePreviewStageTransform = isMobile ? stageTransform : DEFAULT_STAGE_TRANSFORM;
  const mobileUiMode = uiPreferences.mobileUiMode;
  const mobileChromeVisible = mobileUiMode !== 'hidden';
  const stageControlsVisible = isMobile
    ? mobileUiMode === 'full' && stageTransform.moveMode
    : uiPreferences.chromeVisible && stageTransform.moveMode;
  const timelineStub = project.timeline.stub;
  const liveShaderEntry = {
    ...project.studio.savedShaders.find((shader) => shader.id === project.studio.activeShaderId),
    id: project.studio.activeShaderId,
    name: project.studio.activeShaderName,
    code: project.studio.activeShaderCode,
    description: 'Current shader from the editor.',
    group: 'Autosaved',
    uniformValues: project.studio.uniformValues,
  };
  const timelineSelectableShaders = project.studio.savedShaders.some(
    (shader) => shader.id === project.studio.activeShaderId,
  )
    ? project.studio.savedShaders
    : [liveShaderEntry, ...project.studio.savedShaders];
  const timelineSequenceEnabled = timelineStub.shaderSequence.steps.length > 0;
  const previewShader =
    previewShaderId ? project.studio.savedShaders.find((shader) => shader.id === previewShaderId) ?? null : null;
  const workspaceStageMirrorsOutput = outputWindowOpen && !isMobile;
  const workspaceStagePreviewShader = workspaceStageMirrorsOutput ? null : previewShader;
  const timelinePlaybackSteps = getEffectiveTimelinePlaybackSteps({
    mode: timelineStub.shaderSequence.mode,
    randomChoiceEnabled: timelineStub.shaderSequence.randomChoiceEnabled,
    steps: timelineStub.shaderSequence.steps,
    sharedSectionDurationSeconds: timelineStub.shaderSequence.sharedSectionDurationSeconds,
    sharedTransitionEnabled: timelineStub.shaderSequence.sharedTransitionEnabled,
    sharedTransitionDurationSeconds: timelineStub.shaderSequence.sharedTransitionDurationSeconds,
    pinnedStepId: pinnedTimelineStepId,
  });
  const playableTimelineSteps = timelinePlaybackSteps.filter(isTimelineStepEnabled);
  const midiManualMixMode =
    timelineStub.shaderSequence.mode === 'double'
      ? 'randomMix'
      : timelineStub.shaderSequence.randomChoiceEnabled
        ? 'random'
        : timelineStub.shaderSequence.mode;
  const midiManualMixCycleIndex =
    playableTimelineSteps.length > 0
      ? Math.floor(Math.max(0, midiManualMix.stepIndex) / playableTimelineSteps.length)
      : 0;
  const midiManualMixPlaybackSteps = getTimelineCycleSteps({
    mode: midiManualMixMode,
    steps: playableTimelineSteps,
    cycleIndex: midiManualMixCycleIndex,
    randomSeedSalt: midiManualMixSeedToken,
  });
  const midiManualMixStepIndex =
    midiManualMixPlaybackSteps.length > 0
      ? ((midiManualMix.stepIndex % midiManualMixPlaybackSteps.length) + midiManualMixPlaybackSteps.length) %
        midiManualMixPlaybackSteps.length
      : 0;
  const midiManualMixCurrentStep = midiManualMixPlaybackSteps[midiManualMixStepIndex] ?? null;
  const midiManualMixNextStep =
    midiManualMixPlaybackSteps.length > 1
      ? midiManualMixPlaybackSteps[(midiManualMixStepIndex + 1) % midiManualMixPlaybackSteps.length] ?? null
      : null;
  const midiManualMixFollowingStep =
    midiManualMixPlaybackSteps.length > 2
      ? midiManualMixPlaybackSteps[(midiManualMixStepIndex + 2) % midiManualMixPlaybackSteps.length] ?? null
      : midiManualMixPlaybackSteps.length > 1
        ? midiManualMixPlaybackSteps[midiManualMixStepIndex] ?? null
        : null;
  const midiManualMixEnabled =
    midiEnabled &&
    midiMode === 'timeline-mixer' &&
    midiManualMixArmed &&
    Boolean(midiManualMixCurrentStep && midiManualMixNextStep);

  const timelineMarkers = timelineSequenceEnabled
    ? timelineStub.shaderSequence.mode === 'random'
      ? playableTimelineSteps.map((_, index) => `Pick ${index + 1}`)
      : playableTimelineSteps.map((step, index) => {
          const shaderName =
            timelineSelectableShaders.find((shader) => shader.id === step.shaderId)?.name ??
            `Step ${index + 1}`;
          return shaderName;
        })
    : timelineStub.markers;
  const timelineTracks = timelineSequenceEnabled
    ? [
        {
          id: 'timeline-track-shader-sequence',
          label:
            timelineStub.shaderSequence.mode === 'random'
              ? 'Random Flow'
              : timelineStub.shaderSequence.mode === 'randomMix'
                ? 'Random Mix'
                : timelineStub.shaderSequence.mode === 'double'
                  ? 'Double Flow'
                : 'Shader Flow',
          type: timelineStub.shaderSequence.mode,
        },
        ...timelineStub.tracks,
      ]
    : timelineStub.tracks;
  const timelineDurationSeconds = timelineSequenceEnabled
    ? getShaderTimelineDuration(timelinePlaybackSteps)
    : activeAsset?.kind === 'video' && activeAssetDurationSeconds
      ? activeAssetDurationSeconds
      : timelineStub.durationSeconds;
  const activeShaderRecord =
    project.studio.savedShaders.find((shader) => shader.id === project.studio.activeShaderId) ?? null;
  const aiLoading = getPendingAiJobCount(activeShaderRecord) > 0;
  const activeTimelineDraftSource =
    activeTimelineDraft?.sourceShaderId
      ? project.studio.savedShaders.find((shader) => shader.id === activeTimelineDraft.sourceShaderId) ?? null
      : null;
  const timelineDraftTargetLabel =
    editingTimelineStepIndex !== null ? `Timeline Step ${editingTimelineStepIndex + 1}` : null;
  const timelineSelectionInfo: TimelineSelectionInfo | undefined =
    editingTimelineStepId
      ? {
          label: timelineDraftTargetLabel ?? 'Timeline Shader',
          shaderName: project.studio.activeShaderName,
          sourceName: activeTimelineDraftSource?.name ?? null,
          isDirty: Boolean(activeTimelineDraft?.isDirty),
          isLinked: Boolean(activeTimelineDraft),
        }
      : undefined;
  const inspectorTimelineStepId =
    editingTimelineStepId ?? project.timeline.stub.shaderSequence.focusedStepId ?? null;
  const inspectorTimelineStep =
    inspectorTimelineStepId
      ? project.timeline.stub.shaderSequence.steps.find((step) => step.id === inspectorTimelineStepId) ??
        null
      : null;
  const inspectorTimelineStepIndex = inspectorTimelineStep
    ? project.timeline.stub.shaderSequence.steps.findIndex((step) => step.id === inspectorTimelineStep.id)
    : -1;
  const inspectorTimelineShader = inspectorTimelineStep
    ? project.studio.savedShaders.find((shader) => shader.id === inspectorTimelineStep.shaderId) ?? null
    : null;
  const inspectorTimelineAssignedAsset =
    inspectorTimelineShader?.inputAssetId
      ? project.library.assets.find((asset) => asset.id === inspectorTimelineShader.inputAssetId) ?? null
      : null;
  const inspectorTimelineAssetSettings = inspectorTimelineStep
    ? normalizeTimelineStepAssetSettings(inspectorTimelineStep.assetSettings)
    : null;
  const handleActiveShaderCodeChange = (value: string) => {
    clearGeneratedShaderRetry();
    setCompilerError('');
    setPreferLiveShaderCompilePreview(true);
    setShaderCompileNonce((currentValue) => currentValue + 1);
    updateProject((currentProject) =>
      applyActiveShaderPatch(currentProject, {
        activeShaderCode: value,
      }),
    );
  };

  const aiPanel = (
    <AiPanel
      prompt={aiPrompt}
      aiLoading={aiLoading}
      feedbackMessage={aiFeedbackMessage}
      feedbackTone={aiFeedbackTone}
      shaderError={compilerError}
      onPromptChange={setAiPrompt}
      onPromptIntent={() => {
        const settings = project.ai.settings;
        const configured = hasConfiguredShaderAi(settings);
        if (!configured) {
          setApiSettingsVariant('setup');
          setIsApiSettingsOpen(true);
        }
      }}
      onSubmit={() => {
        void handleShaderMutation(aiPrompt);
      }}
      onFixError={handleFixError}
    />
  );

  const showDesktopSlidersWindow =
    !isMobile && uiPreferences.chromeVisible && uiPreferences.desktopSlidersWindowEnabled;

  const studioPanel = (
    <StudioPanel
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      onSaveShader={saveCurrentShader}
      uniformDefinitions={uniformDefinitions}
      uniformValues={project.studio.uniformValues}
      onUniformChange={handleUniformChange}
      newUniformName={newUniformName}
      onNewUniformNameChange={setNewUniformName}
      onQuickAddUniform={() => {
        void handleUniformQuickAdd();
      }}
      shaderCode={project.studio.activeShaderCode}
      onShaderCodeChange={handleActiveShaderCodeChange}
      compilerError={compilerError}
      aiLoading={aiLoading}
      onFixError={handleFixError}
      onBrowsePresets={() => setIsPresetBrowserOpen(true)}
      onReloadShaderCode={reloadShaderCode}
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
      showUniformPanel={!showDesktopSlidersWindow}
      timelineSelection={timelineSelectionInfo}
    />
  );

  const slidersPanel = showDesktopSlidersWindow ? (
    <UniformPanel
      title="Sliders Window"
      uniformDefinitions={uniformDefinitions}
      uniformValues={project.studio.uniformValues}
      onUniformChange={handleUniformChange}
      newUniformName={newUniformName}
      onNewUniformNameChange={setNewUniformName}
      onQuickAddUniform={() => {
        void handleUniformQuickAdd();
      }}
    />
  ) : null;
  const desktopSlidersPanel =
    slidersPanel ?? (
      <UniformPanel
        title="Sliders"
        uniformDefinitions={uniformDefinitions}
        uniformValues={project.studio.uniformValues}
        onUniformChange={handleUniformChange}
        newUniformName={newUniformName}
        onNewUniformNameChange={setNewUniformName}
        onQuickAddUniform={() => {
          void handleUniformQuickAdd();
        }}
      />
    );

  const mobileShaderPanel = (
    <>
      {aiPanel}
      {studioPanel}
    </>
  );

  const desktopShaderToolsPanel = (
    <ShaderStudioControlsSection
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      onSaveShader={saveCurrentShader}
      onBrowsePresets={() => setIsPresetBrowserOpen(true)}
      timelineSelection={timelineSelectionInfo}
    />
  );

  const desktopCodePanel = (
    <ShaderCodeSection
      shaderCode={project.studio.activeShaderCode}
      onShaderCodeChange={handleActiveShaderCodeChange}
      compilerError={compilerError}
      aiLoading={aiLoading}
      onFixError={handleFixError}
      onReloadShaderCode={reloadShaderCode}
    />
  );

  const desktopHistoryPanel = (
    <ShaderVersionTrailSection
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
    />
  );

  const mappingPanel = (
    <MappingPanel
      stageTransform={stageTransform}
      onToggleMoveMode={toggleMoveMode}
      onReset={handleMappingReset}
      onPrecisionChange={updateStagePrecision}
      onToggleRotationLock={() => {
        void toggleRotationLock();
      }}
      onAction={handleMappingAction}
      showPrecisionSlider={!isMobile}
    />
  );

  const timelineStepAssetPanel = (
    <TimelineStepAssetPanel
      stepLabel={
        inspectorTimelineStepIndex >= 0 ? `Timeline Step ${inspectorTimelineStepIndex + 1}` : null
      }
      shaderName={inspectorTimelineShader?.name ?? null}
      assignedAsset={inspectorTimelineAssignedAsset}
      settings={inspectorTimelineAssetSettings}
      onSettingsChange={
        inspectorTimelineStep && inspectorTimelineAssetSettings
          ? (patch) =>
              handleTimelineStepChange(inspectorTimelineStep.id, {
                assetSettings: {
                  ...inspectorTimelineAssetSettings,
                  ...patch,
                },
              })
          : null
      }
      onChooseAsset={inspectorTimelineStep ? () => requestTimelineAssetPicker(inspectorTimelineStep.id) : null}
      onImportAsset={
        inspectorTimelineStep ? () => openFilePicker('timeline-picker', inspectorTimelineStep.id) : null
      }
      onUseLiveStageAsset={
        inspectorTimelineStep && inspectorTimelineShader?.inputAssetId
          ? () => handleTimelineAssignStepAsset(inspectorTimelineStep.id, null)
          : null
      }
      isPinnedStep={
        inspectorTimelineStep ? pinnedTimelineStepId === inspectorTimelineStep.id : false
      }
    />
  );

  const timelineBar = (
    <TimelineBar
      assets={project.library.assets}
      assetKind={activeAsset?.kind ?? null}
      assetUrl={activeAssetUrl}
      activeShaderId={project.studio.activeShaderId}
      savedShaders={timelineSelectableShaders}
      editingStepId={editingTimelineStepId}
      pinnedStepId={pinnedTimelineStepId}
      sequence={timelineStub.shaderSequence}
      transport={project.playback.transport}
      durationSeconds={timelineDurationSeconds}
      midiTimelineControlActive={midiEnabled && midiMode === 'timeline-mixer'}
      midiManualMixArmed={midiManualMixArmed}
      markers={timelineMarkers}
      tracks={timelineTracks}
      onSeek={handleTimelineSeek}
      onPlayToggle={handlePlayToggle}
      onStop={handleTimelineStop}
      onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
      onSequenceModeChange={handleTimelineSequenceModeChange}
      onSequenceStagePreviewModeChange={handleTimelineStagePreviewModeChange}
      onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
      onSequenceMixDurationChange={handleTimelineMixDurationChange}
      onSequenceStepChange={handleTimelineStepChange}
      onSequencePinnedStepToggle={handleTimelinePinnedStepToggle}
      onAssignSequenceStepAsset={handleTimelineAssignStepAsset}
      onImportSequenceAsset={(stepId) => openFilePicker('timeline-picker', stepId)}
      assetPickerRequestStepId={timelineAssetPickerRequest.stepId}
      assetPickerRequestToken={timelineAssetPickerRequest.token}
      onAssetPickerRequestHandled={() =>
        setTimelineAssetPickerRequest((currentValue) =>
          currentValue.stepId === null ? currentValue : { ...currentValue, stepId: null },
        )
      }
      onSequenceDurationChange={handleTimelineDurationChange}
      onDuplicateSequenceStep={handleTimelineDuplicateStep}
      onRemoveSequenceStep={handleTimelineRemoveStep}
      onResizeSequenceBoundary={handleTimelineResizeBoundary}
      onEditSequenceStep={handleTimelineEditStep}
      onAddSequenceStep={createNewShader}
      scrollToStepRequest={timelineScrollToStepRequest}
    />
  );

  const sharedTimelineShaderIds = new Set(
    project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
  );
  if (sharedTimelineShaderIds.size === 0 && project.studio.activeShaderId) {
    sharedTimelineShaderIds.add(project.studio.activeShaderId);
  }
  const sharedTimelineShaderCount = sharedTimelineShaderIds.size;

  const useDesktopPaneLayout =
    !isMobile && uiPreferences.chromeVisible && uiPreferences.workspaceMode !== 'immersive';
  const desktopGridTemplateColumns = `minmax(0, 1fr) 10px ${desktopLayout.rightSidebarWidth}px`;
  const desktopMainTopGridTemplateColumns = uiPreferences.sidebarVisible
    ? `${desktopLayout.leftSidebarWidth}px 10px minmax(0, 1fr)`
    : 'minmax(0, 1fr)';

  const stageViewport = (
    <section
      ref={stageViewportRef}
      data-onboarding-area="canvas"
      className={`workspace-stage-column ${
        desktopStageKeyboardArmed ? 'workspace-stage-column-keyboard-active' : ''
      }`}
      tabIndex={isMobile ? -1 : 0}
      aria-label={isMobile ? undefined : 'Stage preview. Use left and right arrow keys to switch shaders.'}
      aria-keyshortcuts={isMobile ? undefined : 'ArrowLeft ArrowRight'}
      onClick={handleStageReveal}
      onPointerDown={handleStageViewportPointerDown}
    >
      <TimelineStageRenderer
        asset={activeAsset}
        assets={project.library.assets}
        assetUrl={activeAssetUrl}
        assetUrlStatus={activeAssetResolution.status}
        activeShaderId={workspaceStagePreviewShader?.id ?? project.studio.activeShaderId}
        activeShaderName={workspaceStagePreviewShader?.name ?? project.studio.activeShaderName}
        activeShaderCode={workspaceStagePreviewShader?.code ?? project.studio.activeShaderCode}
        activeUniformValues={
          workspaceStagePreviewShader
            ? getSyncedShaderUniformValues(
                workspaceStagePreviewShader.code,
                workspaceStagePreviewShader.uniformValues,
              )
            : project.studio.uniformValues
        }
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline.stub}
        pinnedStepId={pinnedTimelineStepId}
        shaderCompileNonce={shaderCompileNonce}
        stageTransform={workspacePreviewStageTransform}
        transport={project.playback.transport}
        forceActiveShaderPreview={
          !workspaceStageMirrorsOutput &&
          (Boolean(workspaceStagePreviewShader) ||
            studioPreviewOverride ||
            (timelineStub.shaderSequence.stagePreviewMode === 'focused' &&
              editingTimelineStepId !== null))
        }
        focusedPreviewStepId={editingTimelineStepId}
        midiManualMix={{
          enabled: midiManualMixEnabled,
          currentStepId: midiManualMixCurrentStep?.id ?? null,
          nextStepId: midiManualMixNextStep?.id ?? null,
          followingStepId: midiManualMixFollowingStep?.id ?? null,
          progress: midiManualMix.progress,
        }}
        preferActiveShaderCompilePreview={preferLiveShaderCompilePreview}
        onPinnedIndicatorClick={handlePinnedIndicatorClick}
        onNavigateToTimelineStep={handleStageNavigateToTimelineStep}
        onCompilerError={applyCompilerFeedback}
        onCanvasReady={(canvas) => { stageCanvasRef.current = canvas; }}
      />

      {aiLoading ? (
        <div className="ai-loading-overlay">
          <div className="ai-loading-spinner" />
          <span>Generating shader...</span>
        </div>
      ) : null}

      {isMobile && uiPreferences.chromeVisible && aiFeedbackMessage ? (
        <div className={`mobile-feedback-banner mobile-feedback-banner-${aiFeedbackTone}`}>
          {aiFeedbackMessage}
        </div>
      ) : null}

      {isMobile && compilerError ? (
        <div className="mobile-feedback-banner mobile-feedback-banner-error">
          <span>{compilerError}</span>
          <button
            type="button"
            className="fix-error-button"
            disabled={aiLoading}
            onClick={handleFixError}
          >
            {aiLoading ? 'Fixing...' : 'Fix Error'}
          </button>
        </div>
      ) : null}

      {stageControlsVisible ? (
        <div className={`stage-mapping-overlay ${isMobile ? 'stage-mapping-overlay-mobile' : ''}`}>
          <MappingPad
            onAction={handleMappingAction}
            onPrecisionChange={updateStagePrecision}
            precision={stageTransform.precision}
            variant={isMobile ? 'overlay' : 'default'}
          />
        </div>
      ) : null}

      {isMobile && stageControlsVisible ? (
        <MobilePrecisionOverlay
          precision={stageTransform.precision}
          onPrecisionChange={updateStagePrecision}
        />
      ) : null}

      {isMobile && mobilePanel === 'sliders' && mobileUiMode === 'full' ? (
        <MobileUniformOverlay
          uniformDefinitions={uniformDefinitions}
          uniformValues={project.studio.uniformValues}
          onUniformChange={handleUniformChange}
          onClose={() => handleMobilePanelChange(null)}
        />
      ) : null}

      {!isMobile && uiPreferences.chromeVisible && !useDesktopPaneLayout ? (
        <button
          type="button"
          className={`sidebar-rail-button ${
            uiPreferences.sidebarVisible ? 'sidebar-rail-button-active' : ''
          }`}
          onClick={toggleSidebarVisibility}
        >
          {uiPreferences.sidebarVisible ? 'Hide Panels' : 'Show Panels'}
        </button>
      ) : null}
    </section>
  );

  return (
    <div
      className={`workspace-shell ${isMobile ? 'workspace-shell-mobile' : ''} ${
        uiPreferences.workspaceMode === 'immersive' ? 'workspace-shell-immersive' : ''
      } ${uiPreferences.chromeVisible ? 'workspace-shell-chrome' : 'workspace-shell-clean'} ${
        uiPreferences.sidebarVisible ? 'workspace-shell-sidebar-open' : 'workspace-shell-sidebar-closed'
      } ${isMobile ? `workspace-shell-mobile-ui-${mobileUiMode}` : ''}`}
    >
      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>

      {!isMobile && midiEnabled && midiPanelVisible ? (
        <MidiControllerPanel
          status={midiController.status}
          mode={midiController.mode}
          devices={midiController.devices}
          events={midiController.events}
          errorMessage={midiController.errorMessage}
          faderBindings={midiController.faderBindings}
          manualMixProgress={midiManualMix.progress}
          onClearEvents={midiController.clearEvents}
          onOpenGuide={() => setMidiGuideOpen(true)}
          onClose={() => setMidiPanelVisible(false)}
        />
      ) : null}

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelection}
      />

      <MidiControllerGuideDialog
        open={midiGuideOpen}
        onClose={() => setMidiGuideOpen(false)}
      />

      <SliceStudioDialog
        open={isSliceStudioDialogOpen}
        onClose={() => setIsSliceStudioDialogOpen(false)}
      />

      {!isMobile && uiPreferences.chromeVisible ? (
        <WorkspaceToolbar
          isPlaying={project.playback.transport.isPlaying}
          workspaceMode={uiPreferences.workspaceMode}
          sidebarVisible={uiPreferences.sidebarVisible}
          desktopSlidersWindowEnabled={uiPreferences.desktopSlidersWindowEnabled}
          colorTheme={uiPreferences.colorTheme}
          onOpenProjects={() => {
            trackUiClick('open_projects');
            setIsProjectDialogOpen(true);
          }}
          onOpenShare={() => {
            trackUiClick('open_share');
            handleOpenShareDialog();
          }}
          onOpenExport={() => {
            trackUiClick('open_export');
            setIsExportDialogOpen(true);
          }}
          onOpenAssets={() => {
            trackUiClick('open_assets');
            setIsAssetLibraryOpen(true);
          }}
          onOpenSettings={() => {
            trackUiClick('open_settings');
            setApiSettingsVariant('settings');
            setIsApiSettingsOpen(true);
          }}
          onNewShader={() => {
            trackUiClick('new_shader');
            createNewShader();
            setMobilePanel(null);
          }}
          onOpenPresetBrowser={() => {
            trackUiClick('open_presets');
            setIsPresetBrowserOpen(true);
          }}
          onPlayToggle={() => {
            trackUiClick(project.playback.transport.isPlaying ? 'timeline_pause' : 'timeline_play');
            handlePlayToggle();
          }}
          onOpenOutput={() => {
            trackUiClick('open_output');
            handleOutputWindowOpen();
          }}
          onToggleSidebarVisibility={toggleSidebarVisibility}
          onToggleDesktopSlidersWindow={toggleDesktopSlidersWindow}
          onToggleColorTheme={() =>
            setUiPreferences((currentPreferences) => ({
              ...currentPreferences,
              colorTheme: currentPreferences.colorTheme === 'pink' ? 'green' : 'pink',
            }))
          }
          midiEnabled={midiEnabled}
          midiPanelVisible={midiPanelVisible}
          onToggleMidi={() => {
            trackUiClick('toggle_midi');
            handleToggleMidi();
          }}
          onToggleWorkspaceMode={() =>
            updateWorkspaceMode(uiPreferences.workspaceMode === 'immersive' ? 'split' : 'immersive')
          }
          onOpenSliceStudio={() => {
            trackUiClick('open_slicer');
            setIsSliceStudioDialogOpen(true);
          }}
        />
      ) : null}

      <div
        className={`workspace-body ${useDesktopPaneLayout ? 'workspace-body-desktop-grid' : ''}`}
        style={useDesktopPaneLayout ? { gridTemplateColumns: desktopGridTemplateColumns } : undefined}
      >
        {useDesktopPaneLayout ? (
          <>
            <section
              className="workspace-desktop-main"
              style={{ gridTemplateRows: `minmax(0, 1fr) 10px ${desktopLayout.timelineHeight}px` }}
            >
              <div
                className="workspace-desktop-top"
                style={{ gridTemplateColumns: desktopMainTopGridTemplateColumns }}
              >
                {uiPreferences.sidebarVisible ? (
                  <>
                    <aside
                      className="workspace-pane workspace-pane-left"
                      data-onboarding-area="controls"
                      style={{ width: `${desktopLayout.leftSidebarWidth}px` }}
                    >
                      <div className="workspace-pane-scroll">
                        {desktopSlidersPanel}
                        {timelineStepAssetPanel}
                        {mappingPanel}
                      </div>
                    </aside>

                    <div
                      className="workspace-resize-handle workspace-resize-handle-vertical"
                      role="presentation"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        beginDesktopResize('left', event.clientX, event.clientY);
                      }}
                    />
                  </>
                ) : null}

                <div className="workspace-desktop-stage">{stageViewport}</div>
              </div>

              <div
                className="workspace-resize-handle workspace-resize-handle-horizontal"
                role="presentation"
                onMouseDown={(event) => {
                  event.preventDefault();
                  beginDesktopResize('right-split', event.clientX, event.clientY);
                }}
              />

              <section className="workspace-pane-section workspace-pane-timeline">
                <div
                  className="workspace-pane-scroll workspace-pane-scroll-timeline"
                  data-onboarding-area="timeline"
                >
                  {timelineBar}
                </div>
              </section>
            </section>

            <div
              className="workspace-resize-handle workspace-resize-handle-vertical"
              role="presentation"
              onMouseDown={(event) => {
                event.preventDefault();
                beginDesktopResize('right', event.clientX, event.clientY);
              }}
            />

            <aside
              className="workspace-pane workspace-pane-right"
              data-onboarding-area="code"
              style={{ width: `${desktopLayout.rightSidebarWidth}px` }}
            >
              <div className="workspace-pane-scroll workspace-pane-scroll-inspector">
                {aiPanel}
                {desktopShaderToolsPanel}
                {desktopCodePanel}
                {desktopHistoryPanel}
              </div>
            </aside>
          </>
        ) : (
          <>
            {stageViewport}

            {!isMobile && uiPreferences.chromeVisible && uiPreferences.sidebarVisible ? (
              <aside className="workspace-sidebar" data-onboarding-area="controls">
                <div className="workspace-sidebar-scroll">
                  {aiPanel}
                  {studioPanel}
                  {timelineStepAssetPanel}
                  {mappingPanel}
                </div>
              </aside>
            ) : null}
          </>
        )}
      </div>

      {!isMobile && uiPreferences.chromeVisible && !useDesktopPaneLayout ? (
        <div className="workspace-timeline-shell" data-onboarding-area="timeline">
          {timelineBar}
        </div>
      ) : null}

      <AssetLibraryDialog
        open={!isMobile && isAssetLibraryOpen}
        activeAsset={activeAsset}
        assetUrl={activeAssetUrl}
        assets={project.library.assets}
        activeAssetId={activeAsset?.id ?? null}
        onLoadAsset={() => openFilePicker('library')}
        onSelectAsset={handleAssetSelect}
        onRenameAsset={handleAssetRename}
        onEditMask={handleAssetMaskOpen}
        onRemoveAsset={handleAssetRemove}
        onClose={() => setIsAssetLibraryOpen(false)}
      />

      <AssetSegmentationDialog
        asset={segmentationAsset}
        assetUrl={segmentationAssetResolution.url}
        initialPanel={segmentationPanel}
        onApply={handleAssetMaskApply}
        onClose={handleAssetMaskClose}
      />

      {isMobile && mobileChromeVisible ? (
        <MobileChrome
          activeAssetName={activeAsset?.name ?? 'No asset selected'}
          isPlaying={project.playback.transport.isPlaying}
          isTimelineOpen={isMobileTimelineOpen}
          uiMode={mobileUiMode === 'bar' ? 'bar' : 'full'}
          activePanel={mobilePanel}
          onOpenProjects={() => {
            trackUiClick('open_projects');
            setIsProjectDialogOpen(true);
          }}
          onOpenShare={() => {
            trackUiClick('open_share');
            handleOpenShareDialog();
          }}
          onLoadAsset={() => openFilePicker('library')}
          onOpenSettings={() => {
            trackUiClick('open_settings');
            setApiSettingsVariant('settings');
            setIsApiSettingsOpen(true);
          }}
          onOpenTimeline={handleOpenMobileTimeline}
          onToggleMapping={handleMobileToggleMapping}
          onHide={handleMobileHide}
          onPlayToggle={handlePlayToggle}
          onPanelChange={handleMobilePanelChange}
          panels={{
            studio: mobileShaderPanel,
            mapping: (
              <>
                {timelineStepAssetPanel}
                {mappingPanel}
              </>
            ),
          }}
        />
      ) : null}

      <TimelineDialog
        open={isMobile && isMobileTimelineOpen}
        assets={project.library.assets}
        assetKind={activeAsset?.kind ?? null}
        assetUrl={activeAssetUrl}
        activeShaderId={project.studio.activeShaderId}
        savedShaders={timelineSelectableShaders}
        editingStepId={editingTimelineStepId}
        pinnedStepId={pinnedTimelineStepId}
        sequence={timelineStub.shaderSequence}
        transport={project.playback.transport}
        durationSeconds={timelineDurationSeconds}
        midiTimelineControlActive={midiEnabled && midiMode === 'timeline-mixer'}
        midiManualMixArmed={midiManualMixArmed}
        markers={timelineMarkers}
        tracks={timelineTracks}
        onSeek={handleTimelineSeek}
        onPlayToggle={handlePlayToggle}
        onStop={handleTimelineStop}
        onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
        onSequenceModeChange={handleTimelineSequenceModeChange}
        onSequenceStagePreviewModeChange={handleTimelineStagePreviewModeChange}
        onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
        onSequenceMixDurationChange={handleTimelineMixDurationChange}
        onSequenceStepChange={handleTimelineStepChange}
        onSequencePinnedStepToggle={handleTimelinePinnedStepToggle}
        onAssignSequenceStepAsset={handleTimelineAssignStepAsset}
        onImportSequenceAsset={(stepId) => openFilePicker('timeline-picker', stepId)}
        assetPickerRequestStepId={timelineAssetPickerRequest.stepId}
        assetPickerRequestToken={timelineAssetPickerRequest.token}
        onAssetPickerRequestHandled={() =>
          setTimelineAssetPickerRequest((currentValue) =>
            currentValue.stepId === null ? currentValue : { ...currentValue, stepId: null },
          )
        }
        onSequenceDurationChange={handleTimelineDurationChange}
        onDuplicateSequenceStep={handleTimelineDuplicateStep}
        onRemoveSequenceStep={handleTimelineRemoveStep}
        onResizeSequenceBoundary={handleTimelineResizeBoundary}
        onEditSequenceStep={handleTimelineEditStep}
        onAddSequenceStep={createNewShader}
        scrollToStepRequest={timelineScrollToStepRequest}
        onClose={() => setIsMobileTimelineOpen(false)}
      />

      <ApiSettingsDialog
        open={isApiSettingsOpen}
        settings={project.ai.settings}
        variant={apiSettingsVariant}
        isClearingLocalData={isClearingLocalData}
        onClose={() => setIsApiSettingsOpen(false)}
        onChange={updateAiSetting}
        onClearLocalData={() => {
          void handleClearLocalData();
        }}
      />

      <ProjectLibraryDialog
        open={isProjectDialogOpen}
        currentProjectName={project.name}
        activeSessionId={project.sessionId}
        savedProjects={savedProjects}
        onClose={() => setIsProjectDialogOpen(false)}
        onSaveProject={handleSaveProject}
        onSaveAsNewProject={handleSaveAsNewProject}
        onCreateNewProject={handleCreateNewProject}
        onOpenProject={handleOpenSavedProject}
      />

      <ShareProjectDialog
        open={isShareDialogOpen}
        projectName={project.name}
        shareUrl={shareLinkState?.url ?? ''}
        shareHash={shareLinkState?.sha256 ?? ''}
        payloadBytes={shareLinkState?.payloadBytes ?? 0}
        shaderCount={shareLinkState?.shaderCount ?? sharedTimelineShaderCount}
        isGenerating={isGeneratingShareLink}
        errorMessage={shareLinkError}
        onClose={() => setIsShareDialogOpen(false)}
        onGenerate={() => {
          void handleGenerateShareLink();
        }}
        onCopy={() => {
          void handleCopyShareLink();
        }}
      />

      <TimelineExportDialog
        open={isExportDialogOpen}
        sessionId={project.sessionId}
        projectName={project.name}
        activeAsset={activeAsset}
        activeAssetUrl={activeAssetUrl}
        activeAssetUrlStatus={activeAssetResolution.status}
        assets={project.library.assets}
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline.stub}
        pinnedStepId={pinnedTimelineStepId}
        stageTransform={project.mapping.stageTransform}
        durationSeconds={timelineDurationSeconds}
        onClose={() => setIsExportDialogOpen(false)}
        onExportRequested={() => {
          updateProject((currentProject) => ({
            ...currentProject,
            export: {
              stub: {
                ...currentProject.export.stub,
                enabled: true,
                lastRequestedAt: new Date().toISOString(),
              },
            },
          }));
        }}
        onExportCompleted={({ filename, bytes }) => {
          track('export_mp4', { bytes });
          setStatusMessage(
            `Downloaded ${filename} (${(bytes / (1024 * 1024)).toFixed(1)} MB).`,
          );
        }}
      />

      <PresetBrowserDialog
        open={isPresetBrowserOpen}
        presets={timelineSelectableShaders}
        activeShaderId={project.studio.activeShaderId}
        assetUrl={activeAssetUrl}
        addSelectionToTimeline={presetSelectionAddsToTimeline}
        onAddSelectionToTimelineChange={setPresetSelectionAddsToTimeline}
        onPreviewStart={(shaderId) => setPreviewShaderId(shaderId)}
        onPreviewEnd={(shaderId) =>
          setPreviewShaderId((currentShaderId) =>
            !shaderId || currentShaderId === shaderId ? null : currentShaderId,
          )
        }
        onSelect={selectShader}
        onClose={() => {
          setPreviewShaderId(null);
          setIsPresetBrowserOpen(false);
        }}
      />

      {showOnboardingGuide ? (
        <OnboardingGuide
          onClose={() => {
            track('onboarding_complete');
            setShowOnboardingGuide(false);
            signalOnboardingComplete();
          }}
          onDismissPermanently={() => {
            track('onboarding_dismiss');
            dismissOnboardingPermanently();
            setShowOnboardingGuide(false);
            signalOnboardingComplete();
          }}
        />
      ) : null}
    </div>
  );
}
