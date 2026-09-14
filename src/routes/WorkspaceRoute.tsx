import { createUniformRuntime } from '../lib/uniformRuntime';
import { preserveShaderVersion } from '../lib/shaderHistory';
import { chooseRandomShaderReplacement } from '../lib/randomShader';
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick';
import {
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiPanel } from '../components/AiPanel';
import { ShaderChatWorkspace } from '../components/ShaderChatWorkspace';
import { ShaderChatHandoff } from '../components/ShaderChatHandoff';
import { ApiSettingsDialog } from '../components/ApiSettingsDialog';
import { AssetLibraryDialog } from '../components/AssetLibraryDialog';
import { preserveStageFrame, readStageFrameAspectRatio, replaceStageAsset } from '../lib/assetReplacement';
import type { VariantResult } from '../lib/assetVariants';
import {
  captureImageTransfer,
  fetchImageFile,
  getTransferredImageUrl,
  hasImageTransfer,
  imageFileType,
  readClipboardImages,
  validateImageFile,
  type ImageTransfer,
} from '../lib/imageTransfer';
import { useImageDropTarget } from '../lib/useImageDropTarget';
import { AssetSegmentationDialog, type SegmentationSaveOptions } from '../components/AssetSegmentationDialog';
import { AssetSurfacesDialog, type SurfaceEditorInitialOptions } from '../components/AssetSurfacesDialog';
import type { SurfaceOutput } from '../lib/surfaceMapping/types';
import { type MobilePanelKey, MobileChrome } from '../components/MobileChrome';
import { MappingPad, type MappingAction } from '../components/MappingPad';
import { MobilePrecisionOverlay } from '../components/MobilePrecisionOverlay';
import { MobileUniformOverlay } from '../components/MobileUniformOverlay';
import { PlaybackControls } from '../components/PlaybackControls';
import {
  PresetBrowserDialog,
  type PresetSelectionAction,
} from '../components/PresetBrowserDialog';
import { ProBetaDialog, type ProBetaSource } from '../components/ProBetaDialog';
import { ProjectLibraryDialog } from '../components/ProjectLibraryDialog';
import { ShareProjectDialog } from '../components/ShareProjectDialog';
import { ShaderTimelineEditor } from '../components/ShaderTimelineEditor';
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
import { MapshroomBrandLockup } from '../components/MapshroomBrandLockup';
import {
  MapshroomShaderBackdrop,
  OnboardingWelcomeShader,
} from '../components/OnboardingWelcomeShader';
import {
  getAnalyticsConsent,
  setAnalyticsAiPresence,
  signalOnboardingComplete,
  track,
  trackActivationMilestone,
  trackApiPresence,
  trackAppOpen,
  trackLlmRequest,
  trackUiClick,
} from '../lib/analytics';
import {
  BOOT_EXIT_START_EVENT,
  hasBootExitStarted,
  signalProjectReady,
} from '../lib/bootFlow';
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
  createEmptyProject,
  createDefaultProject,
  upgradeLegacyEmptyProject,
} from '../config';
import {
  getTransportTimeSeconds,
  pauseTransport,
  playTransport,
  restoreTransport,
  seekTransport,
  seekTransportPreservingRenderTime,
} from '../lib/clock';
import {
  DEFAULT_BUNDLED_ASSET_ID,
  mergeBundledAssets,
  resolveLiveBundledAssetId,
} from '../lib/bundledAssets';
import { isBundledProjectSessionId } from '../lib/bundledProjects';
import {
  AI_MINIMUM_UI_UNIFORM_COUNT,
  extractGlslCode,
  parseShaderName,
  parseUniforms,
  syncUniformValues,
  validateGeneratedShader,
} from '../lib/shader';
import {
  detectMinimumShaderTarget,
  normalizeOfficialShaderBody,
  OFFICIAL_SHADER_PROFILE,
} from '../lib/shaderCompiler';
import { normalizeProjectShaderSources } from '../lib/shaderProfile';
import { requestShaderMutation } from '../lib/shaderGeneration';
import {
  readConfiguredLocalModel,
  readStoredAiGenerationRoute,
  storeAiGenerationRoute,
  type AiGenerationRoute,
} from '../lib/aiRoute';
import {
  extractShaderApplyLinkFromText,
  loadPendingShaderApplyRequest,
  parseShaderApplyLink,
  removePendingShaderApplyRequest,
  savePendingShaderApplyRequest,
  stripShaderApplyParamsFromUrl,
  type PendingShaderApplyRequest,
  type ShaderApplyTrigger,
} from '../lib/shaderApplyLink';
import {
  isLocalModelReady,
  LEGACY_ULTRA_MODEL_ID,
  ULTRA_MODEL_ID,
} from '../lib/localAi';
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
  getEffectiveTransitionDurationSeconds,
  getTimelineCycleSteps,
  resolveShaderTimelineState,
  applyMixDurationToTimelineSteps,
  isTimelineStepEnabled,
  normalizeTimelineTransitionEffect,
  roundTimelineSeconds,
  shouldUseSharedTransition,
  TIMELINE_TRANSITION_EFFECT_OPTIONS,
} from '../lib/timeline';
import { activateAudioReactiveTimeline, resolveAudioReactiveTimelineState } from '../lib/audioTimeline';
import { normalizeTimelineStepAssetSettings } from '../lib/timelineAssetSettings';
import {
  buildExternalChatShaderPrompt,
  buildShaderMutationPrompt,
} from '../shaders/requestContract';
import { createSessionSync } from '../lib/sessionSync';
import { createLiveUniformSync } from '../lib/liveUniformSync';
import { useMidiController } from '../hooks/useMidiController';
import { useAudioReactivity } from '../hooks/useAudioReactivity';
import {
  isTauri,
} from '../lib/desktop';
import {
  hasStoredCloudApiKey,
  loadDesktopKeyringMarkers,
  migrateBrowserKeysToDesktopKeyring,
  persistCloudApiKey,
  providerForAiKeyField,
} from '../lib/desktopSecrets';
import type {
  MidiControllerMode,
  MidiTimelineTransportAction,
} from '../lib/midi/types';
import { createMidiOutputSync } from '../lib/midi/outputSync';
import { openOutputWindow } from '../lib/openOutputWindow';
import {
  openExternalAiWindow,
  type ExternalAiWindowResult,
} from '../lib/openExternalAiWindow';
import {
  createProjectShareLink,
  importProjectFromSharedUrl,
  type ProjectShareLinkResult,
} from '../lib/projectShare';
import {
  clearPersistedSiteData,
  deletePersistedProject,
  downloadProjectBackup,
  downloadRawPersistedProject,
  hasPersistedProject,
  loadProjectLibrary,
  deleteAssetBlob,
  loadProjectDocument,
  getOrCreateSessionId,
  loadShaderSliderCache,
  loadUiPreferences,
  persistActiveSessionId,
  putAssetBlob,
  parseProjectBackupContents,
  readBrowserStorageUsage,
  browserStorageHasRoom,
  saveProjectToLibrary,
  saveProjectDocument,
  saveUiPreferences,
  checkpointProjectDocument,
  openEditableProject,
} from '../lib/storage';
import { createProjectAutosave, type ProjectSaveStatus } from '../lib/projectAutosave';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import {
  dismissAssetsFirstStepPermanently,
  isAssetsFirstStepSessionEligible,
  isAssetsImportStepPending,
  markAssetsFirstStepSessionEligible,
} from '../lib/assetsFirstStep';
import {
  dismissRepeatFocusFirstStepPermanently,
  isRepeatFocusFirstStepDismissed,
} from '../lib/repeatFocusFirstStep';
import {
  dismissMappingFirstStepPermanently,
  isMappingFirstStepDismissed,
} from '../lib/mappingFirstStep';
import {
  createMappingPositionFile,
  MAX_MAPPING_ROTATION,
  MIN_MAPPING_ROTATION,
  normalizeMappingPosition,
  parseMappingPositionFile,
} from '../lib/mappingPosition';
import {
  DEFAULT_STAGE_DISTORTION,
  normalizeStageDistortion,
} from '../lib/distortion';
import { blankShaderTemplate } from '../shaders/templates/blankShader';
import {
  ONBOARDING_MISSION_COPY,
  resolveOnboardingMissionLocale,
} from '../lib/onboardingMissionCopy';
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
  StageDistortion,
  StageTransform,
  TimelineStagePreviewMode,
  TimelineTransitionEffect,
  UiPreferences,
  WorkspaceMode,
} from '../types';

function hasConfiguredShaderAi(settings: AiSettings): boolean {
  if (settings.shaderRuntime === 'local') {
    return Boolean(
      settings.localShaderModel &&
        (isLocalModelReady(settings.localShaderModel, settings.visionEnabled) ||
          readConfiguredLocalModel() === settings.localShaderModel),
    );
  }
  if (settings.shaderRuntime !== 'api') return false;
  if (settings.shaderProvider === 'openai') {
    return Boolean(hasStoredCloudApiKey(settings.openaiApiKey) && settings.openaiShaderModel);
  }
  if (settings.shaderProvider === 'anthropic') {
    return Boolean(hasStoredCloudApiKey(settings.anthropicApiKey) && settings.anthropicShaderModel);
  }
  return Boolean(hasStoredCloudApiKey(settings.googleApiKey) && settings.googleShaderModel);
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
const MOBILE_ONBOARDING_COPY = {
  en: {
    guideLabel: 'Mobile workspace guide',
    closeGuide: 'Close mobile guide',
    fullTutorial: 'Open the full tutorial',
    back: 'Back',
    next: 'Next',
    finish: 'Start',
    steps: [
      {
        target: 'shader',
        eyebrow: 'Shader',
        title: 'Choose the visual effect',
        copy: 'Tap Shader to explore effects while the image stays in view.',
      },
      {
        target: 'sliders',
        eyebrow: 'Sliders',
        title: 'Shape the effect',
        copy: 'Tap Sliders to adjust the current shader directly over the image.',
      },
      {
        target: 'load',
        eyebrow: 'Load',
        title: 'Load your media',
        copy: 'Tap Load to choose the image or video you want to map.',
      },
    ],
  },
  it: {
    guideLabel: 'Guida dell’area di lavoro mobile',
    closeGuide: 'Chiudi la guida mobile',
    fullTutorial: 'Apri il tutorial completo',
    back: 'Indietro',
    next: 'Avanti',
    finish: 'Inizia',
    steps: [
      {
        target: 'shader',
        eyebrow: 'Shader',
        title: 'Scegli l’effetto visivo',
        copy: 'Tocca Shader per esplorare gli effetti lasciando l’immagine sempre visibile.',
      },
      {
        target: 'sliders',
        eyebrow: 'Slider',
        title: 'Modella l’effetto',
        copy: 'Tocca Sliders per regolare lo shader direttamente sopra l’immagine.',
      },
      {
        target: 'load',
        eyebrow: 'Load',
        title: 'Carica il tuo media',
        copy: 'Tocca Load per scegliere l’immagine o il video da mappare.',
      },
    ],
  },
} as const;
const ONBOARDING_COPY = {
  en: {
    welcomeEyebrow: 'Mapshroom',
    welcomeTitle: 'How would you like to begin?',
    welcomeStartMapping: 'Open the workspace',
    welcomeLearnApp: 'Take the guided tour',
    welcomeWhyLink: 'Why Mapshroom is free',
    welcomeTutorialLink: 'Projector setup',
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
        guideTitle: 'Load media and send it to the projector',
        eyebrow: 'Windows',
        placement: 'topbar',
        points: [
          'Use File, Shader, and View for project, shader, and layout commands.',
          'Click Load Asset to open the asset window and choose or import the image to map.',
          'Click Output to choose a secondary display and open the projection window fullscreen.',
          'If screen listing is unavailable, open fullscreen on this display and move the window to the projector.',
        ],
      },
      {
        title: 'Canvas',
        guideTitle: 'Preview and align the projection',
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
        guideTitle: 'Create and refine the shader effect',
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
        title: 'Slider And Asset Control',
        guideTitle: 'Tune sliders and media for each step',
        eyebrow: 'Controls',
        placement: 'controls',
        points: [
          'Tune shader values with sliders.',
          'Use Step Asset to load dedicated media for a timeline step.',
          'Asset controls appear only after media is assigned.',
        ],
      },
      {
        title: 'Move The Mapping',
        guideTitle: 'Position the mapping on the subject',
        eyebrow: 'Move',
        placement: 'mapping',
        points: [
          'Use the highlighted Move switch in the top bar.',
          'Move opens the direction, size, and precision controls over the canvas.',
          'Click the left or right side of Precision for one step, or drag it horizontally.',
          'Import or export a position JSON to reuse the same framing with another asset.',
          'Rotate opens the output angle slider. Distort is reserved for a future update.',
          'Click Move Off when the projection is aligned.',
        ],
      },
      {
        title: 'Timeline',
        guideTitle: 'Build and preview the complete sequence',
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
    welcomeEyebrow: 'Benvenuto in Mapshroom',
    welcomeTitle: 'Come vuoi iniziare?',
    welcomeStartMapping: "Apri l'area di lavoro",
    welcomeLearnApp: 'Segui il tour guidato',
    welcomeWhyLink: 'Perché Mapshroom è gratuita',
    welcomeTutorialLink: 'Configura il proiettore',
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
        guideTitle: 'Carica i media e inviali al proiettore',
        eyebrow: 'Finestre',
        placement: 'topbar',
        points: [
          'Usa File, Shader e View per i comandi di progetto, shader e layout.',
          "Clicca Load Asset per aprire la finestra degli asset e scegliere o importare l'immagine da mappare.",
          'Clicca Output per scegliere uno schermo secondario e aprire la finestra di proiezione a schermo intero.',
          'Se l’elenco degli schermi non è disponibile, apri a schermo intero su questo display e sposta la finestra sul proiettore.',
        ],
      },
      {
        title: 'Canvas',
        guideTitle: 'Controlla e allinea la proiezione',
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
        guideTitle: 'Crea e perfeziona l’effetto shader',
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
        title: 'Slider e controllo asset',
        guideTitle: 'Regola slider e media di ogni passaggio',
        eyebrow: 'Controlli',
        placement: 'controls',
        points: [
          'Regola i valori dello shader con gli slider.',
          'Usa Step Asset per caricare un contenuto dedicato a un passaggio della timeline.',
          "I controlli dell'asset compaiono solo dopo aver assegnato un contenuto.",
        ],
      },
      {
        title: 'Sposta il mapping',
        guideTitle: 'Posiziona il mapping sul soggetto',
        eyebrow: 'Move',
        placement: 'mapping',
        points: [
          'Usa il pulsante Move evidenziato nella barra superiore.',
          'Move mostra sul canvas i controlli di direzione, dimensione e precisione.',
          'Clicca il lato sinistro o destro di Precision per un passo, oppure trascina in orizzontale.',
          'Importa o esporta un JSON di posizione per riutilizzare la stessa inquadratura con un altro asset.',
          "Rotate apre lo slider dell'angolo di output. Distort è riservato a un aggiornamento futuro.",
          'Clicca Move Off quando la proiezione è allineata.',
        ],
      },
      {
        title: 'Timeline',
        guideTitle: 'Costruisci e prova la sequenza completa',
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

  for (const language of preferredLanguages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('it')) {
      return 'it';
    }
    if (normalized.startsWith('en')) {
      return 'en';
    }
  }

  return 'en';
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
  try {
    sessionStorage.setItem(ONBOARDING_ENTRY_SESSION_KEY, 'true');
  } catch {
    // Onboarding can continue without a session flag if storage is full.
  }
  return nextCount;
}

function dismissOnboardingPermanently(): void {
  setCookieValue(ONBOARDING_ENTRY_COOKIE, '99');
  try {
    sessionStorage.setItem(ONBOARDING_ENTRY_SESSION_KEY, 'true');
  } catch {
    // A full sessionStorage must not block dismissing onboarding.
  }
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

function MappingOutputDisclaimer() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, 2_000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <p className="mapping-output-disclaimer">
      <strong>Output window only</strong>
      <span>
        Movement changes projector output. Distort adds an editable workspace preview.
      </span>
    </p>
  );
}

interface OnboardingGuideProps {
  onClose: () => void;
  onDismissPermanently: () => void;
}

interface MobileOnboardingGuideProps extends OnboardingGuideProps {
  onStepChange: () => void;
}

function MobileOnboardingGuide({
  onClose,
  onDismissPermanently,
  onStepChange,
}: MobileOnboardingGuideProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  useDismissOnOutsideClick(panelRef, true, onDismissPermanently);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [locale] = useState<OnboardingLocale>(() => resolveOnboardingLocale());
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);
  const copy = MOBILE_ONBOARDING_COPY[locale];
  const activeStep = copy.steps[activeStepIndex];
  const isLastStep = activeStepIndex === copy.steps.length - 1;

  useLayoutEffect(() => {
    let animationFrameId = 0;
    const targetSelector = `[data-mobile-onboarding-target="${activeStep.target}"]`;
    const updateTargetRect = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        const targetElement = document.querySelector<HTMLElement>(targetSelector);

        if (!targetElement) {
          setTargetRect(null);
          return;
        }

        const rect = targetElement.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
      });
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    const targetElement = document.querySelector<HTMLElement>(targetSelector);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTargetRect) : null;
    if (targetElement) {
      resizeObserver?.observe(targetElement);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
      resizeObserver?.disconnect();
    };
  }, [activeStep.target]);

  const goToStep = (nextStepIndex: number) => {
    onStepChange();
    setTargetRect(null);
    setActiveStepIndex(nextStepIndex);
  };

  const goToPreviousStep = () => {
    goToStep(Math.max(0, activeStepIndex - 1));
  };

  const goToNextStep = () => {
    if (isLastStep) {
      onClose();
      return;
    }

    goToStep(activeStepIndex + 1);
  };

  const popupWidth = Math.min(312, Math.max(240, window.innerWidth - 24));
  const targetCenterX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
  const popupLeft = Math.max(
    12,
    Math.min(window.innerWidth - popupWidth - 12, targetCenterX - popupWidth / 2),
  );
  const calloutAboveTarget = Boolean(targetRect && targetCenterX >= 0 && targetRect.top > window.innerHeight / 2);
  const arrowLeft = Math.max(18, Math.min(popupWidth - 36, targetCenterX - popupLeft));
  const calloutStyle: (CSSProperties & {
    '--mobile-onboarding-arrow-left': string;
  }) | undefined = targetRect
    ? {
        left: `${popupLeft}px`,
        width: `${popupWidth}px`,
        ...(calloutAboveTarget
          ? { bottom: `${window.innerHeight - targetRect.top + 18}px` }
          : { top: `${targetRect.bottom + 18}px` }),
        '--mobile-onboarding-arrow-left': `${arrowLeft}px`,
      }
    : undefined;
  const highlightStyle = targetRect
    ? {
        top: `${targetRect.top - 5}px`,
        left: `${targetRect.left - 5}px`,
        width: `${targetRect.width + 10}px`,
        height: `${targetRect.height + 10}px`,
      }
    : undefined;

  return (
    <div className="mobile-onboarding-overlay" role="presentation">
      {targetRect ? (
        <span className="mobile-onboarding-highlight" style={highlightStyle} aria-hidden="true" />
      ) : null}
      <section
        ref={panelRef}
        className={`mobile-onboarding-callout ${
          calloutAboveTarget
            ? 'mobile-onboarding-callout-above'
            : 'mobile-onboarding-callout-below'
        }`}
        style={calloutStyle}
        role="dialog"
        aria-modal="false"
        aria-label={copy.guideLabel}
      >
        <header className="mobile-onboarding-callout-header">
          <div>
            <span>{activeStep.eyebrow}</span>
            <small>
              {activeStepIndex + 1}/{copy.steps.length}
            </small>
          </div>
          <button
            type="button"
            className="mobile-onboarding-close"
            onClick={onDismissPermanently}
            aria-label={copy.closeGuide}
          >
            ×
          </button>
        </header>
        <h2>{activeStep.title}</h2>
        <p>{activeStep.copy}</p>
        <footer className="mobile-onboarding-callout-footer">
          <Link to="/tutorial" onClick={onClose}>
            {copy.fullTutorial} ↗
          </Link>
          <div>
            {activeStepIndex > 0 ? (
              <button type="button" className="secondary-button" onClick={goToPreviousStep}>
                {copy.back}
              </button>
            ) : null}
            <button type="button" className="primary-button" onClick={goToNextStep}>
              {isLastStep ? copy.finish : copy.next}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function OnboardingGuide({ onClose, onDismissPermanently }: OnboardingGuideProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  useDismissOnOutsideClick(panelRef, true, onDismissPermanently);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const calloutCardRef = useRef<HTMLElement | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeRevealed, setWelcomeRevealed] = useState(() => hasBootExitStarted());
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [locale] = useState<OnboardingLocale>(() => resolveOnboardingLocale());
  const [missionLocale] = useState(() => resolveOnboardingMissionLocale());
  const [missionShaderActive, setMissionShaderActive] = useState(false);
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [calloutStyle, setCalloutStyle] = useState<CSSProperties | undefined>(undefined);
  const [onboardingTargetMissing, setOnboardingTargetMissing] = useState(false);
  const onboardingCopy = ONBOARDING_COPY[locale];
  const onboardingTotalStepCount = ONBOARDING_SETUP_STEP_COUNT + onboardingCopy.uiAreas.length;
  const activeUiArea =
    activeStepIndex >= ONBOARDING_SETUP_STEP_COUNT
      ? onboardingCopy.uiAreas[activeStepIndex - ONBOARDING_SETUP_STEP_COUNT]
      : null;
  const isLastStep = activeStepIndex === onboardingTotalStepCount - 1;
  const stepLabel = onboardingCopy.stepLabel(activeStepIndex + 1, onboardingTotalStepCount);

  useLayoutEffect(() => {
    overlayRef.current?.scrollTo({ top: 0, left: 0 });
    bodyRef.current?.scrollTo({ top: 0, left: 0 });
  }, [activeStepIndex, showWelcome]);

  useEffect(() => {
    if (welcomeRevealed) {
      return;
    }

    const revealWelcome = () => setWelcomeRevealed(true);
    window.addEventListener(BOOT_EXIT_START_EVENT, revealWelcome);

    return () => window.removeEventListener(BOOT_EXIT_START_EVENT, revealWelcome);
  }, [welcomeRevealed]);

  const goToPreviousStep = () => {
    if (activeStepIndex === 0) {
      setShowWelcome(true);
      return;
    }

    setHighlightRect(null);
    setCalloutStyle(undefined);
    setOnboardingTargetMissing(false);
    setActiveStepIndex((currentValue) => Math.max(0, currentValue - 1));
  };
  const goToNextStep = () => {
    if (isLastStep) {
      onClose();
      return;
    }

    setHighlightRect(null);
    setCalloutStyle(undefined);
    setOnboardingTargetMissing(false);
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
          setCalloutStyle(undefined);
          setOnboardingTargetMissing(true);
          return;
        }

        setOnboardingTargetMissing(false);
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
      ref={overlayRef}
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

      {showWelcome ? (
        <section
          ref={panelRef}
          className={`onboarding-panel onboarding-welcome-panel ${
            welcomeRevealed ? 'onboarding-welcome-panel-ready' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-welcome-title"
        >
          <div className="onboarding-welcome-content">
            <OnboardingWelcomeShader active={welcomeRevealed} />
            <div className="onboarding-welcome-copy">
              <span className="panel-eyebrow">{onboardingCopy.welcomeEyebrow}</span>
              <h2 id="onboarding-welcome-title">{onboardingCopy.welcomeTitle}</h2>
            </div>
            <div className="onboarding-welcome-brand" aria-hidden="true">
              <MapshroomBrandLockup />
            </div>
            <div className="onboarding-welcome-actions">
              <button
                type="button"
                className="primary-button onboarding-welcome-primary"
                onClick={() => setShowWelcome(false)}
              >
                {onboardingCopy.welcomeLearnApp}
              </button>
              <button
                type="button"
                className="secondary-button onboarding-welcome-secondary"
                onClick={onClose}
              >
                {onboardingCopy.welcomeStartMapping}
              </button>
            </div>
            <div
              className="onboarding-welcome-mission"
              onPointerEnter={() => setMissionShaderActive(true)}
              onPointerLeave={() => setMissionShaderActive(false)}
            >
              <MapshroomShaderBackdrop
                active={missionShaderActive}
                continuous
                className="onboarding-welcome-mission-shader"
              />
              <p
                lang={missionLocale}
                dir={missionLocale === 'ar' ? 'rtl' : 'auto'}
              >
                {ONBOARDING_MISSION_COPY[missionLocale]}
              </p>
            </div>
            <nav className="onboarding-welcome-links" aria-label="Mapshroom resources">
              <Link to="/why">{onboardingCopy.welcomeWhyLink}</Link>
              <span aria-hidden="true">|</span>
              <Link to="/tutorial">{onboardingCopy.welcomeTutorialLink}</Link>
            </nav>
          </div>
        </section>
      ) : null}

      {!activeUiArea && !showWelcome ? (
        <section
          ref={panelRef}
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

          <div ref={bodyRef} className="onboarding-body">
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
            ref={(element) => {
              calloutCardRef.current = element;
              panelRef.current = element;
            }}
            className={`onboarding-area-card onboarding-area-card-${activeUiArea.placement} ${
              onboardingTargetMissing
                ? 'onboarding-area-card-fallback'
                : calloutStyle
                  ? 'onboarding-area-card-positioned'
                  : 'onboarding-area-card-measuring'
            }`}
            style={calloutStyle}
          >
            <div className="onboarding-area-card-header">
              <div>
                <span className="panel-eyebrow">{stepLabel}</span>
                <h3>{activeUiArea.guideTitle}</h3>
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

function createMappingPositionFileName(projectName: string): string {
  const safeName = projectName
    .trim()
    // eslint-disable-next-line no-control-regex -- strip unsupported filename characters
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeName || 'mapshroom'}-position.json`;
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
      next.widthAdjust = transform.widthAdjust + transform.precision;
      break;
    case 'width-minus':
      next.widthAdjust = transform.widthAdjust - transform.precision;
      break;
    case 'height-plus':
      next.heightAdjust = transform.heightAdjust + transform.precision;
      break;
    case 'height-minus':
      next.heightAdjust = transform.heightAdjust - transform.precision;
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
  return normalizeProjectDocument(
    normalizeProjectShaderSources(upgradeLegacyEmptyProject(project)),
  );
}

function normalizeProjectDocument(project: ProjectDocument): ProjectDocument {
  const normalizedActiveShaderCode = normalizeOfficialShaderBody(
    project.studio.activeShaderCode,
  );
  const normalizedProjectShaderVersions = project.studio.shaderVersions.map((version) => ({
    ...version,
    code: normalizeOfficialShaderBody(version.code),
    sourceProfile: OFFICIAL_SHADER_PROFILE,
  }));
  const uniformDefinitions = parseUniforms(normalizedActiveShaderCode);
  const defaultProject = createDefaultProject(project.sessionId);
  const mergedLibraryAssets = mergeBundledAssets(project.library?.assets ?? []);
  const requestedActiveAssetId = resolveLiveBundledAssetId(
    project.playback?.activeAssetId ??
      project.library?.activeAssetId ??
      DEFAULT_BUNDLED_ASSET_ID,
  );
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
    const shaderVersions = 'versions' in shader
      ? shader.versions?.map((version) => ({
          ...version,
          code: normalizeOfficialShaderBody(version.code),
          sourceProfile: OFFICIAL_SHADER_PROFILE,
        }))
      : undefined;
    const shaderLastValidCode = 'lastValidCode' in shader ? shader.lastValidCode : undefined;
    const shaderLastValidUniformValues =
      'lastValidUniformValues' in shader ? shader.lastValidUniformValues : undefined;
    const shaderCompileError = 'compileError' in shader ? shader.compileError : undefined;
    const shaderInputAssetId = 'inputAssetId' in shader ? shader.inputAssetId : undefined;
    const defaultPreset = DEFAULT_SHADERS[shader.id];
    const normalizedName = defaultPreset?.name ?? shader.name;
    const normalizedCode = normalizeOfficialShaderBody(shader.code);
    const normalizedUniformValues = getSyncedShaderUniformValues(
      normalizedCode,
      shaderUniformValues ?? defaultPreset?.uniformValues,
    );
    const normalizedLastValidCode = normalizeOfficialShaderBody(
      shaderLastValidCode ?? normalizedCode,
    );
    const normalizedShader: SavedShader = {
      ...shader,
      name: normalizedName,
      description: defaultPreset?.description ?? shader.description,
      template: defaultPreset?.template ?? shader.template ?? 'stage',
      templates: defaultPreset?.templates ?? shader.templates,
      group: defaultPreset?.group ?? shader.group,
      audioReactiveBindings:
        defaultPreset?.audioReactiveBindings ?? shader.audioReactiveBindings,
      code: normalizedCode,
      sourceProfile: OFFICIAL_SHADER_PROFILE,
      minimumTarget:
        defaultPreset?.minimumTarget === 'webgl2' ||
        shader.minimumTarget === 'webgl2' ||
        detectMinimumShaderTarget(normalizedCode) === 'webgl2'
          ? 'webgl2'
          : 'webgl1',
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
            shader.id === project.studio.activeShaderId
              ? normalizedProjectShaderVersions
              : undefined,
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
      inputAssetId: shaderInputAssetId
        ? resolveLiveBundledAssetId(shaderInputAssetId)
        : shaderInputAssetId,
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
    openaiApiKey: isTauri()
      ? ''
      : legacySettings.openaiApiKey?.trim()
        ? legacySettings.openaiApiKey
        : localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY) ?? '',
    anthropicApiKey: isTauri()
      ? ''
      : legacySettings.anthropicApiKey?.trim()
        ? legacySettings.anthropicApiKey
        : localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) ?? '',
    googleApiKey: isTauri()
      ? ''
      : legacySettings.googleApiKey?.trim()
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
    fallbackVersions: normalizedProjectShaderVersions,
    fallbackName: parseShaderName(normalizedActiveShaderCode),
    fallbackCode: normalizedActiveShaderCode,
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
  const normalizedStagePreviewMode =
    project.timeline?.stub?.shaderSequence?.stagePreviewMode ??
    defaultProject.timeline.stub.shaderSequence.stagePreviewMode;
  const normalizedSingleStepLoopEnabled =
    normalizedStagePreviewMode === 'focused' &&
    (project.timeline?.stub?.shaderSequence?.singleStepLoopEnabled ??
      defaultProject.timeline.stub.shaderSequence.singleStepLoopEnabled);
  const requestedRenderTimeOffsetSeconds =
    project.playback?.transport?.renderTimeOffsetSeconds;
  const normalizedRenderTimeOffsetSeconds =
    typeof requestedRenderTimeOffsetSeconds === 'number' &&
    Number.isFinite(requestedRenderTimeOffsetSeconds)
      ? requestedRenderTimeOffsetSeconds
      : 0;
  const requestedStageTransform = project.mapping?.stageTransform;
  const normalizedMappingPosition = normalizeMappingPosition(
    requestedStageTransform,
    defaultProject.mapping.stageTransform,
  );

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
          renderTimeOffsetSeconds: normalizedRenderTimeOffsetSeconds,
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
    mapping: {
      stageTransform: {
        ...defaultProject.mapping.stageTransform,
        ...requestedStageTransform,
        ...normalizedMappingPosition,
        moveMode: Boolean(requestedStageTransform?.moveMode),
        rotationLocked: Boolean(requestedStageTransform?.rotationLocked),
        showGrid: Boolean(requestedStageTransform?.showGrid),
        distortMode: Boolean(requestedStageTransform?.distortMode),
        distortion: normalizeStageDistortion(
          requestedStageTransform?.distortion,
          normalizedMappingPosition.distortion,
        ),
      },
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
          stagePreviewMode: normalizedStagePreviewMode,
          focusedStepId:
            project.timeline?.stub?.shaderSequence?.focusedStepId ??
            defaultProject.timeline.stub.shaderSequence.focusedStepId,
          pinnedStepId: normalizedPinnedStepId,
          randomSeedToken:
            typeof project.timeline?.stub?.shaderSequence?.randomSeedToken === 'string' &&
            project.timeline.stub.shaderSequence.randomSeedToken.trim()
              ? project.timeline.stub.shaderSequence.randomSeedToken
              : createTimelineRandomSeedToken(),
          singleStepLoopEnabled: normalizedSingleStepLoopEnabled,
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
            project.timeline?.stub?.shaderSequence?.mode === 'audioReactive'
              ? Math.max(
                  1,
                  project.timeline?.stub?.shaderSequence
                    ?.sharedSectionDurationSeconds ??
                    defaultProject.timeline.stub.shaderSequence
                      .sharedSectionDurationSeconds,
                )
              : project.timeline?.stub?.shaderSequence
                  ?.sharedSectionDurationSeconds ??
                  defaultProject.timeline.stub.shaderSequence
                    .sharedSectionDurationSeconds,
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
      activeShaderName: parseShaderName(normalizedActiveShaderCode),
      activeShaderCode: normalizedActiveShaderCode,
      activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
      shaderVersions: normalizedStudioShaderVersions,
      savedShaders: mergedSavedShaders,
      uniformValues: syncUniformValues(project.studio.uniformValues, uniformDefinitions),
    },
  };
}

function getProjectTimelinePlaybackSteps(project: ProjectDocument) {
  const sequence = project.timeline.stub.shaderSequence;
  return getEffectiveTimelinePlaybackSteps({
    mode: sequence.mode,
    randomChoiceEnabled: sequence.randomChoiceEnabled,
    steps: sequence.steps,
    sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
    sharedTransitionEnabled: sequence.sharedTransitionEnabled,
    sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
    pinnedStepId: sequence.pinnedStepId ?? null,
  }).filter(isTimelineStepEnabled);
}

function getProjectTimelineRandomSeedSalt(project: ProjectDocument): string {
  const sequence = project.timeline.stub.shaderSequence;
  const randomSeedToken = sequence.randomSeedToken || project.sessionId;

  if (sequence.mode === 'double') {
    return `double-primary:${randomSeedToken}`;
  }

  if (
    sequence.mode === 'random' ||
    sequence.mode === 'randomMix' ||
    sequence.randomChoiceEnabled
  ) {
    return `random:${randomSeedToken}`;
  }

  return '';
}

function getProjectTimelineMode(project: ProjectDocument) {
  const sequence = project.timeline.stub.shaderSequence;
  return sequence.mode === 'double'
    ? 'randomMix' as const
    : sequence.randomChoiceEnabled
      ? 'random' as const
      : sequence.mode;
}

function getProjectTimelineShaders(project: ProjectDocument): SavedShader[] {
  if (
    project.studio.savedShaders.some(
      (shader) => shader.id === project.studio.activeShaderId,
    )
  ) {
    return project.studio.savedShaders;
  }

  return [
    {
      id: project.studio.activeShaderId,
      name: project.studio.activeShaderName,
      code: project.studio.activeShaderCode,
      description: 'Current shader from the editor.',
      group: 'Autosaved',
      uniformValues: project.studio.uniformValues,
    },
    ...project.studio.savedShaders,
  ];
}

function resolveProjectTimelineState(
  project: ProjectDocument,
  singleStepLoopEnabled: boolean,
  nowMs = performance.now(),
) {
  const sequence = project.timeline.stub.shaderSequence;
  return resolveShaderTimelineState({
    shaders: getProjectTimelineShaders(project),
    mode: sequence.mode,
    focusedStepId: sequence.focusedStepId,
    singleStepLoopEnabled,
    randomChoiceEnabled: sequence.randomChoiceEnabled,
    sharedTransitionEnabled: sequence.sharedTransitionEnabled,
    sharedTransitionEffect: sequence.sharedTransitionEffect,
    sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
    sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
    steps: getProjectTimelinePlaybackSteps(project),
    timeSeconds: getTransportTimeSeconds(project.playback.transport, nowMs),
    loop: project.playback.transport.loop,
    randomSeedSalt: getProjectTimelineRandomSeedSalt(project),
  });
}

function getTimelineRepeatSeekTime(
  project: ProjectDocument,
  stepId: string,
  localTimeSeconds = 0,
): number {
  const playbackSteps = getProjectTimelinePlaybackSteps(project);
  const stepIndex = playbackSteps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) {
    return 0;
  }

  const stepStartSeconds = playbackSteps
    .slice(0, stepIndex)
    .reduce(
      (totalSeconds, step) =>
        totalSeconds + clampTimelineStepDuration(step.durationSeconds),
      0,
    );
  const stepDurationSeconds = clampTimelineStepDuration(
    playbackSteps[stepIndex].durationSeconds,
  );
  const boundedLocalTimeSeconds = Math.max(
    0,
    Math.min(stepDurationSeconds - 0.001, localTimeSeconds),
  );

  return stepStartSeconds + boundedLocalTimeSeconds;
}

interface TimelineRepeatExitPlan {
  focusedStepId: string;
  resumeAtTransportTimeSeconds: number;
  resumeTimelineTimeSeconds: number;
}

function getTimelineRepeatExitPlan(
  project: ProjectDocument,
  nowMs = performance.now(),
): TimelineRepeatExitPlan | null {
  const repeatState = resolveProjectTimelineState(project, true, nowMs);
  if (!repeatState) {
    return null;
  }

  const sequence = project.timeline.stub.shaderSequence;
  const playbackSteps = getProjectTimelinePlaybackSteps(project);
  const totalDurationSeconds = getShaderTimelineDuration(playbackSteps);
  if (totalDurationSeconds <= 0) {
    return null;
  }

  const absoluteTimeSeconds = getTransportTimeSeconds(
    project.playback.transport,
    nowMs,
  );
  const cycleIndex = Math.floor(
    Math.max(0, absoluteTimeSeconds) / totalDurationSeconds,
  );
  const cycleSteps = getTimelineCycleSteps({
    mode: getProjectTimelineMode(project),
    steps: playbackSteps,
    cycleIndex,
    randomSeedSalt: getProjectTimelineRandomSeedSalt(project),
  });
  const focusedStepIndex = cycleSteps.findIndex(
    (step) => step.id === repeatState.currentStep.id,
  );
  if (focusedStepIndex < 0) {
    return null;
  }

  const stepStartSeconds = cycleSteps
    .slice(0, focusedStepIndex)
    .reduce(
      (totalSeconds, step) =>
        totalSeconds + clampTimelineStepDuration(step.durationSeconds),
        0,
      );
  const stepDurationSeconds = clampTimelineStepDuration(
    cycleSteps[focusedStepIndex].durationSeconds,
  );
  const transitionDurationSeconds = getEffectiveTransitionDurationSeconds({
    stepDurationSeconds,
    stepTransitionDurationSeconds:
      cycleSteps[focusedStepIndex].transitionDurationSeconds,
    usesSharedTransition: shouldUseSharedTransition(
      getProjectTimelineMode(project),
      sequence.sharedTransitionEnabled,
    ),
    sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
    singleStepLoopEnabled: false,
  });
  const handoffLocalTimeSeconds = Math.max(
    0,
    stepDurationSeconds - transitionDurationSeconds,
  );
  const currentLocalTimeSeconds = Math.max(
    0,
    Math.min(stepDurationSeconds, repeatState.localTimeSeconds),
  );
  const remainingTimelineSeconds =
    currentLocalTimeSeconds < handoffLocalTimeSeconds - 0.001
      ? handoffLocalTimeSeconds - currentLocalTimeSeconds
      : stepDurationSeconds - currentLocalTimeSeconds + handoffLocalTimeSeconds;

  return {
    focusedStepId: repeatState.currentStep.id,
    resumeAtTransportTimeSeconds:
      absoluteTimeSeconds + Math.max(0.001, remainingTimelineSeconds),
    resumeTimelineTimeSeconds:
      cycleIndex * totalDurationSeconds +
      stepStartSeconds +
      handoffLocalTimeSeconds,
  };
}

function activateTimelineOnAppEntry(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    timeline: {
      stub: {
        ...project.timeline.stub,
        shaderSequence: {
          ...project.timeline.stub.shaderSequence,
          stagePreviewMode: 'timeline',
          singleStepLoopEnabled: false,
        },
      },
    },
    playback: {
      ...project.playback,
      transport: playTransport(project.playback.transport),
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

type DesktopResizeTarget = 'left' | 'right' | 'timeline';
type FilePickerSource = 'library' | 'timeline-picker';

const DESKTOP_PANE_MIN_WIDTH = 180;
const DESKTOP_PANE_MAX_WIDTH = 520;
const DESKTOP_TIMELINE_MIN_HEIGHT = 180;
const DESKTOP_TIMELINE_MAX_HEIGHT = 520;

function createShaderVersion(
  prompt: string,
  name: string,
  code: string,
  id: string = crypto.randomUUID(),
) {
  return {
    id,
    prompt,
    name,
    code,
    sourceProfile: OFFICIAL_SHADER_PROFILE,
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
      activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
      shaderVersions: nextShaderVersions,
      uniformValues: nextUniformValues,
      savedShaders: shouldSyncActiveSavedShader && activeSavedShader
        ? currentProject.studio.savedShaders.map((shader) =>
            shader.id === activeSavedShader.id
              ? {
                  ...shader,
                  name: nextActiveShaderName,
                  code: nextActiveShaderCode,
                  sourceProfile: OFFICIAL_SHADER_PROFILE,
                  minimumTarget: detectMinimumShaderTarget(nextActiveShaderCode),
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

function applyPastedShaderCodeToProject(
  currentProject: ProjectDocument,
  {
    nextCode,
    timelineStepId,
  }: {
    nextCode: string;
    timelineStepId: string | null;
  },
): ProjectDocument {
  const nextName = parseShaderName(nextCode);
  const currentActiveShader =
    currentProject.studio.savedShaders.find(
      (shader) => shader.id === currentProject.studio.activeShaderId,
    ) ?? null;
  const nextUniformValues = getSyncedShaderUniformValues(
    nextCode,
    currentProject.studio.uniformValues,
  );
  const nextShaderVersion = createShaderVersion('Pasted shader', nextName, nextCode);
  const previousVersions = preserveShaderVersion(
    currentProject.studio.shaderVersions.length ? currentProject.studio.shaderVersions : getShaderVersionTrail(currentActiveShader, {
      fallbackVersions: currentProject.studio.shaderVersions,
      fallbackName: currentProject.studio.activeShaderName,
      fallbackCode: currentProject.studio.activeShaderCode,
    }),
    createShaderVersion(
      'Before paste',
      currentProject.studio.activeShaderName,
      currentProject.studio.activeShaderCode,
    ),
  );
  const savedShader = createSavedShaderRecord(
    nextName,
    nextCode,
    nextUniformValues,
    {
      description: 'Pasted shader.',
      template: currentActiveShader?.template ?? 'stage',
      group: 'Saved',
      inputAssetId: currentActiveShader?.inputAssetId ?? null,
      isTemporary: false,
      isDirty: false,
      lastValidCode: nextCode,
      lastValidUniformValues: nextUniformValues,
      versions: [...previousVersions, nextShaderVersion],
    },
  );
  const timelineStep = timelineStepId
    ? currentProject.timeline.stub.shaderSequence.steps.find((step) => step.id === timelineStepId) ??
      null
    : null;
  const timelineDraft = timelineStep
    ? createSavedShaderRecord(nextName, nextCode, nextUniformValues, {
        description: 'Linked timeline shader from a paste.',
        template: savedShader.template,
        group: 'Timeline',
        inputAssetId: savedShader.inputAssetId,
        isTemporary: true,
        isDirty: true,
        sourceShaderId: savedShader.id,
        ownerTimelineStepId: timelineStep.id,
        lastValidCode: nextCode,
        lastValidUniformValues: nextUniformValues,
        versions: savedShader.versions,
      })
    : null;
  const activeShader = timelineDraft ?? savedShader;
  const nextSteps = timelineDraft
    ? currentProject.timeline.stub.shaderSequence.steps.map((step) =>
        step.id === timelineDraft.ownerTimelineStepId
          ? { ...step, shaderId: timelineDraft.id }
          : step,
      )
    : currentProject.timeline.stub.shaderSequence.steps;

  return pruneTemporaryTimelineShaders(
    {
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderId: activeShader.id,
        activeShaderName: nextName,
        activeShaderCode: nextCode,
        activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
        shaderVersions: getShaderVersionTrail(activeShader),
        uniformValues: nextUniformValues,
        savedShaders: [
          ...currentProject.studio.savedShaders,
          savedShader,
          ...(timelineDraft ? [timelineDraft] : []),
        ],
      },
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            steps: nextSteps,
          },
        },
      },
    },
    [savedShader.id, activeShader.id],
  );
}

function applyShaderUniformValues(
  currentProject: ProjectDocument,
  nextUniformValues: ShaderUniformValueMap,
  shaderId = currentProject.studio.activeShaderId,
): ProjectDocument {
  const activeShaderIndex = currentProject.studio.savedShaders.findIndex(
    (shader) => shader.id === shaderId,
  );
  const activeShader =
    activeShaderIndex >= 0 ? currentProject.studio.savedShaders[activeShaderIndex] : null;
  const isActiveShader = shaderId === currentProject.studio.activeShaderId;
  const studioValuesChanged = isActiveShader && !areUniformValuesEqual(
    currentProject.studio.uniformValues,
    nextUniformValues,
  );
  const savedValuesChanged = Boolean(
    activeShader &&
      (!areUniformValuesEqual(activeShader.uniformValues, nextUniformValues) ||
        (!activeShader.compileError &&
          !areUniformValuesEqual(activeShader.lastValidUniformValues, nextUniformValues))),
  );

  if (!studioValuesChanged && !savedValuesChanged) {
    return currentProject;
  }

  let nextSavedShaders = currentProject.studio.savedShaders;
  if (activeShader && savedValuesChanged) {
    nextSavedShaders = currentProject.studio.savedShaders.slice();
    nextSavedShaders[activeShaderIndex] = {
      ...activeShader,
      uniformValues: nextUniformValues,
      lastValidUniformValues: activeShader.compileError
        ? activeShader.lastValidUniformValues
        : nextUniformValues,
      isDirty: activeShader.isTemporary ? true : activeShader.isDirty,
    };
  }

  return {
    ...currentProject,
    studio: {
      ...currentProject.studio,
      uniformValues: isActiveShader ? nextUniformValues : currentProject.studio.uniformValues,
      savedShaders: nextSavedShaders,
    },
  };
}

interface ApplyExternalShaderCodeOptions {
  targetShaderId: string;
  prompt: string;
  historyPrompt: string;
  currentCode: string;
  nextCode: string;
  validationError: string | null;
  versionId: string;
  activateTarget?: boolean;
}

function applyExternalShaderCodeToProject(
  currentProject: ProjectDocument,
  {
    targetShaderId,
    prompt,
    historyPrompt,
    currentCode,
    nextCode,
    validationError,
    versionId,
    activateTarget = false,
  }: ApplyExternalShaderCodeOptions,
): ProjectDocument {
  const currentTargetShader = currentProject.studio.savedShaders.find(
    (shader) => shader.id === targetShaderId,
  );
  if (!currentTargetShader) {
    return currentProject;
  }

  const wasActive = currentProject.studio.activeShaderId === targetShaderId;
  const shouldActivateTarget = wasActive || activateTarget;
  const nextName = parseShaderName(nextCode);
  const nextShaderVersion = createShaderVersion(
    historyPrompt,
    nextName,
    nextCode,
    versionId,
  );
  const nextShaderVersions = [
    ...(wasActive
      ? currentProject.studio.shaderVersions
      : getShaderVersionTrail(currentTargetShader)),
    nextShaderVersion,
  ];
  const nextUniformValues = getSyncedShaderUniformValues(
    nextCode,
    wasActive ? currentProject.studio.uniformValues : currentTargetShader.uniformValues,
  );
  const nextLastValidCode = validationError
    ? currentTargetShader.lastValidCode ?? currentTargetShader.code
    : nextCode;
  const nextLastValidUniformValues = validationError
    ? getRenderableShaderUniformValues(currentTargetShader)
    : nextUniformValues;
  const userMessage = buildShaderMutationPrompt(prompt, currentCode);
  const previousChatHistory = wasActive ? currentProject.studio.shaderChatHistory : [];

  return {
    ...currentProject,
    studio: {
      ...currentProject.studio,
      activeShaderId: shouldActivateTarget
        ? targetShaderId
        : currentProject.studio.activeShaderId,
      activeShaderName: shouldActivateTarget
        ? nextName
        : currentProject.studio.activeShaderName,
      activeShaderCode: shouldActivateTarget
        ? nextCode
        : currentProject.studio.activeShaderCode,
      activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
      uniformValues: shouldActivateTarget
        ? nextUniformValues
        : currentProject.studio.uniformValues,
      shaderChatHistory: shouldActivateTarget
        ? [
            ...previousChatHistory,
            { role: 'user' as const, text: userMessage },
            { role: 'model' as const, text: `\`\`\`glsl\n${nextCode}\n\`\`\`` },
          ]
        : currentProject.studio.shaderChatHistory,
      shaderVersions: shouldActivateTarget
        ? nextShaderVersions
        : currentProject.studio.shaderVersions,
      savedShaders: currentProject.studio.savedShaders.map((shader) =>
        shader.id === targetShaderId
          ? {
              ...shader,
              name: nextName,
              code: nextCode,
              sourceProfile: OFFICIAL_SHADER_PROFILE,
              minimumTarget: detectMinimumShaderTarget(nextCode),
              versions: nextShaderVersions,
              uniformValues: nextUniformValues,
              lastValidCode: nextLastValidCode,
              lastValidUniformValues: nextLastValidUniformValues,
              compileError: validationError ?? undefined,
              isDirty: true,
              hasUnreadAiResult: shouldActivateTarget ? false : true,
            }
          : shader,
      ),
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
      | 'templates'
      | 'group'
      | 'audioReactiveBindings'
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
    sourceProfile: OFFICIAL_SHADER_PROFILE,
    minimumTarget: detectMinimumShaderTarget(code),
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
    templates: options.templates,
    group: options.group ?? 'Saved',
    audioReactiveBindings: options.audioReactiveBindings,
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
  referenceAspectRatio?: number,
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
  const nextSteps = currentProject.timeline.stub.shaderSequence.steps.map((item) =>
    item.id === stepId
      ? {
          ...item,
          shaderId: editableShader.id,
          ...(nextInputAssetId
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
      mapping: {
        ...currentProject.mapping,
        stageTransform: preserveStageFrame(currentProject.mapping.stageTransform, referenceAspectRatio),
      },
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

function getCurrentPresetReplacementStep(
  project: ProjectDocument,
  editingTimelineStepId: string | null,
) {
  const steps = project.timeline.stub.shaderSequence.steps;
  return (
    steps.find((step) => step.id === editingTimelineStepId) ??
    steps.find((step) => step.id === project.timeline.stub.shaderSequence.focusedStepId) ??
    steps.find((step) => step.shaderId === project.studio.activeShaderId) ??
    steps[0] ??
    null
  );
}

export function WorkspaceRoute() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const initialIsMobileRef = useRef(isMobile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const mappingPositionInputRef = useRef<HTMLInputElement | null>(null);
  const filePickerSourceRef = useRef<FilePickerSource>('library');
  const timelineImportStepIdRef = useRef<string | null>(null);
  const imageImportBusyRef = useRef(false);
  const [imageImporting, setImageImporting] = useState(false);
  const [imageImportMessage, setImageImportMessage] = useState('');
  const stageViewportRef = useRef<HTMLElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputWindowRef = useRef<Window | null>(null);
  const [outputWindowOpen, setOutputWindowOpen] = useState(false);
  const sessionSyncRef = useRef<ReturnType<typeof createSessionSync> | null>(null);
  const liveUniformSyncRef = useRef<ReturnType<typeof createLiveUniformSync> | null>(null);
  const syncedProjectAutosaveRef = useRef<ProjectDocument | null>(null);
  const midiOutputSyncRef = useRef<ReturnType<typeof createMidiOutputSync> | null>(null);
  const uniformCommitPendingRef = useRef(false);
  const pendingUniformValuesRef = useRef<ShaderUniformValueMap>({});
  const pendingUniformShaderIdRef = useRef<string | null>(null);
  const [uniformRuntime] = useState(createUniformRuntime);
  const uniformCommitTimerRef = useRef<number | null>(null);
  const uniformPointerActiveRef = useRef(false);
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const currentProjectRef = useRef<ProjectDocument | null>(null);
  const persistenceDisabledRef = useRef(false);
  const [projectSaveStatus, setProjectSaveStatus] = useState<ProjectSaveStatus>('saving');
  const [autosave] = useState(() => createProjectAutosave<ProjectDocument>({
    save: saveProjectDocument,
    onSaved: (savedProject) => {
      saveProjectToLibrary(savedProject, savedProject.name);
      if (currentProjectRef.current?.sessionId === savedProject.sessionId) {
        sessionSyncRef.current?.publish(savedProject);
      }
    },
    onStatus: (sessionId, status) => {
      if (currentProjectRef.current?.sessionId === sessionId) setProjectSaveStatus(status);
    },
  }));
  const audioReactivity = useAudioReactivity(project?.sessionId ?? null, {
    sectionDetectionEnabled:
      project?.timeline.stub.shaderSequence.mode === 'audioReactive',
    minimumSectionSeconds: Math.max(
      project?.timeline.stub.shaderSequence.sharedSectionDurationSeconds ?? 8,
      project?.timeline.stub.shaderSequence.sharedTransitionDurationSeconds ?? 0,
    ),
  });
  const configureAudioShaderBindings = audioReactivity.configureShaderBindings;
  const seedAudioShaderBindings = audioReactivity.seedShaderBindings;
  const audioReactiveModeEnabled = audioReactivity.preferences.modeEnabled;
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() =>
    loadUiPreferences(DEFAULT_UI_PREFERENCES),
  );
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatSubmission, setChatSubmission] = useState<{ shaderId: string; prompt: string; versionIds: string[] } | null>(null);
  const initialStoredAiRouteRef = useRef<AiGenerationRoute | null>(
    readStoredAiGenerationRoute(),
  );
  const [aiGenerationRoute, setAiGenerationRoute] = useState<AiGenerationRoute>(
    () => initialStoredAiRouteRef.current ?? 'chatgpt',
  );
  const aiRouteHydratedSessionRef = useRef<string | null>(null);
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
  const [proBetaSource, setProBetaSource] = useState<ProBetaSource | null>(null);
  const [externalChatRequest, setExternalChatRequest] = useState<{
    requestId: string;
    prompt: string;
    historyPrompt: string;
    currentCode: string;
    targetShaderId: string;
    trigger: ShaderApplyTrigger;
    route: AiGenerationRoute;
    externalWindowMode: ExternalAiWindowResult | null;
  } | null>(null);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [assetLibraryStepId, setAssetLibraryStepId] = useState<string | null>(null);
  const [highlightAssetStartMapping, setHighlightAssetStartMapping] = useState(false);
  const [showAssetImportFirstStep, setShowAssetImportFirstStep] = useState(() =>
    isAssetsImportStepPending(),
  );
  const [segmentationQueue, setSegmentationQueue] = useState<string[]>([]);
  const assetVersionProjectRef = useRef(project);
  assetVersionProjectRef.current = project;
  const [segmentationPanel, setSegmentationPanel] = useState<'refine' | 'depth'>('refine');
  const [surfaceAssetId, setSurfaceAssetId] = useState<string | null>(null);
  const [surfaceInitialOptions, setSurfaceInitialOptions] = useState<SurfaceEditorInitialOptions>({});
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSliceStudioDialogOpen, setIsSliceStudioDialogOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [studioPreviewOverride, setStudioPreviewOverride] = useState(false);
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);
  const [desktopStageKeyboardArmed, setDesktopStageKeyboardArmed] = useState(false);
  const [editingTimelineStepId, setEditingTimelineStepId] = useState<string | null>(null);
  const [pendingTimelineRepeatExit, setPendingTimelineRepeatExit] =
    useState<TimelineRepeatExitPlan | null>(null);
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
    timelineHeight: DESKTOP_TIMELINE_MIN_HEIGHT,
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
  const [showMappingFirstStep, setShowMappingFirstStep] = useState(false);
  const [assetsFirstStepEligible, setAssetsFirstStepEligible] = useState(false);
  const [repeatFocusFirstStepVisible, setRepeatFocusFirstStepVisible] = useState(false);
  const appOpenTrackedRef = useRef(false);
  const [midiManualMix, setMidiManualMix] = useState({
    stepIndex: 0,
    nextEndpoint: 'max' as 'max' | 'min',
    progress: 0,
  });
  const hasLoadedInitialProjectRef = useRef(false);
  const processedShaderApplyLinksRef = useRef(new Set<string>());
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
    const isFirstWorkspaceVisit =
      entryCount <= ONBOARDING_AUTO_OPEN_LIMIT ||
      isAssetsFirstStepSessionEligible();

    if (entryCount <= ONBOARDING_AUTO_OPEN_LIMIT) {
      markAssetsFirstStepSessionEligible();
    }

    setAssetsFirstStepEligible(isFirstWorkspaceVisit);
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

  useEffect(() => {
    if (!project || aiRouteHydratedSessionRef.current === project.sessionId) {
      return;
    }

    aiRouteHydratedSessionRef.current = project.sessionId;
    const storedRoute = readStoredAiGenerationRoute();
    const settings = project.ai.settings;
    const hasAnyApi =
      hasStoredCloudApiKey(settings.openaiApiKey) ||
      hasStoredCloudApiKey(settings.anthropicApiKey) ||
      hasStoredCloudApiKey(settings.googleApiKey);
    const resolvedRoute: AiGenerationRoute =
      storedRoute ??
      (settings.shaderRuntime === 'api' && hasAnyApi
        ? 'api'
        : settings.shaderRuntime === 'local' && settings.localShaderModel
          ? 'local'
          : settings.shaderRuntime === 'chat'
            ? 'chatgpt'
            : hasAnyApi
              ? 'api'
              : 'chatgpt');
    const resolvedRuntime =
      resolvedRoute === 'api'
        ? 'api'
        : resolvedRoute === 'local'
          ? 'local'
          : 'chat';

    setAiGenerationRoute(resolvedRoute);
    storeAiGenerationRoute(resolvedRoute);
    if (settings.shaderRuntime !== resolvedRuntime) {
      updateProject((currentProject) => ({
        ...currentProject,
        ai: {
          settings: {
            ...currentProject.ai.settings,
            shaderRuntime: resolvedRuntime,
          },
        },
      }));
    }
  }, [project, updateProject]);

  useEffect(() => {
    if (!isTauri() || !project) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const legacyOpenAi = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
        const legacyAnthropic = localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY);
        const legacyGoogle = localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY);
        const migrated = await migrateBrowserKeysToDesktopKeyring({
          openai: legacyOpenAi ?? project.ai.settings.openaiApiKey,
          anthropic: legacyAnthropic ?? project.ai.settings.anthropicApiKey,
          google: legacyGoogle ?? project.ai.settings.googleApiKey,
        });
        localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
        localStorage.removeItem(ANTHROPIC_API_KEY_STORAGE_KEY);
        localStorage.removeItem(GOOGLE_API_KEY_STORAGE_KEY);

        const markers =
          migrated.openaiApiKey || migrated.anthropicApiKey || migrated.googleApiKey
            ? migrated
            : await loadDesktopKeyringMarkers();

        if (cancelled) {
          return;
        }

        updateProject((currentProject) => {
          const nextSettings = {
            ...currentProject.ai.settings,
            openaiApiKey: markers.openaiApiKey,
            anthropicApiKey: markers.anthropicApiKey,
            googleApiKey: markers.googleApiKey,
            runwayApiKey: '',
          };
          return {
            ...currentProject,
            ai: {
              settings: nextSettings,
            },
          };
        });
      } catch (error) {
        console.warn('Unable to hydrate desktop API credentials.', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project?.sessionId, updateProject]);

  useEffect(() => {
    if (!project || !pendingTimelineRepeatExit) {
      return;
    }

    const sequence = project.timeline.stub.shaderSequence;
    if (
      !sequence.singleStepLoopEnabled ||
      sequence.stagePreviewMode !== 'focused' ||
      sequence.focusedStepId !== pendingTimelineRepeatExit.focusedStepId
    ) {
      setPendingTimelineRepeatExit(null);
      return;
    }

    if (!project.playback.transport.isPlaying) {
      return;
    }

    let frameId = 0;
    let cancelled = false;
    const finishRepeatAtBoundary = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      if (
        getTransportTimeSeconds(project.playback.transport, timestamp) + 0.001 <
        pendingTimelineRepeatExit.resumeAtTransportTimeSeconds
      ) {
        frameId = requestAnimationFrame(finishRepeatAtBoundary);
        return;
      }

      setEditingTimelineStepId(null);
      setStudioPreviewOverride(false);
      updateProject((currentProject) => {
        const currentSequence = currentProject.timeline.stub.shaderSequence;
        if (
          !currentSequence.singleStepLoopEnabled ||
          currentSequence.focusedStepId !== pendingTimelineRepeatExit.focusedStepId
        ) {
          return currentProject;
        }

        const nowMs = performance.now();
        return {
          ...currentProject,
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              shaderSequence: {
                ...currentSequence,
                stagePreviewMode: 'timeline',
                singleStepLoopEnabled: false,
              },
            },
          },
          playback: {
            ...currentProject.playback,
            transport: seekTransportPreservingRenderTime(
              currentProject.playback.transport,
              pendingTimelineRepeatExit.resumeTimelineTimeSeconds,
              nowMs,
            ),
          },
        };
      });
      setPendingTimelineRepeatExit(null);
      setStatusMessage('Full timeline continued after the highlighted shader.');
    };

    frameId = requestAnimationFrame(finishRepeatAtBoundary);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [pendingTimelineRepeatExit, project, updateProject]);

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

      let linkedProject: ProjectDocument | null = null;
      const hashQuery = window.location.hash.split('?')[1] ?? '';
      const requestedProjectSessionId = new URLSearchParams(hashQuery).get('project')?.trim() ?? '';
      const requestedProject = requestedProjectSessionId
        ? await openEditableProject(requestedProjectSessionId)
        : null;
      try {
        const shaderApplyLink = parseShaderApplyLink(window.location.href);
        linkedProject = shaderApplyLink
          ? await loadProjectDocument(shaderApplyLink.sessionId)
          : null;
      } catch {
        // The dedicated link handler below reports malformed shader links after
        // the regular workspace has loaded.
      }

      const sessionId =
        linkedProject?.sessionId ?? requestedProject?.sessionId ?? getOrCreateSessionId();
      const persisted = await hasPersistedProject(sessionId);
      const loadedProject =
        linkedProject ??
        requestedProject ??
        await openEditableProject(sessionId);
      const libraryEntry = loadProjectLibrary().find(
        (entry) => entry.sessionId === sessionId && !entry.bundled,
      );
      if (!loadedProject && (persisted || libraryEntry) && !isBundledProjectSessionId(sessionId)) {
        downloadRawPersistedProject(sessionId);
        const nextSessionId = crypto.randomUUID();
        const recoveryProject = activateTimelineOnAppEntry(
          normalizeProject(
            createDefaultProject(nextSessionId, { isMobile: initialIsMobileRef.current }),
          ),
        );
        persistActiveSessionId(nextSessionId);
        await saveProjectDocument(recoveryProject);
        saveProjectToLibrary(recoveryProject, recoveryProject.name);
        setProject(recoveryProject);
        setStatusMessage(
          libraryEntry
            ? `Could not restore "${libraryEntry.name}". A new starter was opened instead. Delete unused saved projects if browser storage is full.`
            : 'Could not reopen the previous project without risking data loss. A raw backup was downloaded. Keep this tab open and delete unused saved projects.',
        );
        return;
      }

      let nextProject =
        loadedProject ??
        createDefaultProject(sessionId, { isMobile: initialIsMobileRef.current });
      if (isBundledProjectSessionId(nextProject.sessionId)) {
        nextProject = await openEditableProject(nextProject.sessionId) ?? nextProject;
      }
      persistActiveSessionId(nextProject.sessionId);
      if (!isBundledProjectSessionId(nextProject.sessionId)) {
        if (!loadedProject || nextProject.sourceTemplateId) {
          await saveProjectDocument(nextProject);
        }
        saveProjectToLibrary(nextProject, nextProject.name);
      }
      const sliderCache = loadShaderSliderCache(nextProject.sessionId);
      setProject(
        activateTimelineOnAppEntry(
          applyPersistedSliderCache(normalizeProject(nextProject), sliderCache),
        ),
      );
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

        const normalizedImportedProject = activateTimelineOnAppEntry(
          normalizeProject(importedSharedProject.project),
        );
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
    if (!project) {
      return;
    }

    let shaderApplyLink;
    try {
      shaderApplyLink = parseShaderApplyLink(window.location.href);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to read the shader link.',
      );
      stripShaderApplyParamsFromUrl();
      return;
    }

    if (
      !shaderApplyLink ||
      processedShaderApplyLinksRef.current.has(shaderApplyLink.requestId)
    ) {
      return;
    }
    processedShaderApplyLinksRef.current.add(shaderApplyLink.requestId);

    void (async () => {
      const persistedTargetProject =
        project.sessionId === shaderApplyLink.sessionId
          ? project
          : await loadProjectDocument(shaderApplyLink.sessionId);
    if (!persistedTargetProject) {
      setStatusMessage(
        'The project for this shader link is not available in this browser.',
      );
      stripShaderApplyParamsFromUrl();
      return;
    }

    const normalizedTargetProject = normalizeProject(persistedTargetProject);
    const targetShader = normalizedTargetProject.studio.savedShaders.find(
      (shader) => shader.id === shaderApplyLink.targetShaderId,
    );
    if (!targetShader) {
      setStatusMessage(
        'The shader targeted by this link is no longer available in the project.',
      );
      stripShaderApplyParamsFromUrl();
      return;
    }

    try {
      const pendingRequest = loadPendingShaderApplyRequest(shaderApplyLink.requestId);
      const matchingPendingRequest =
        pendingRequest?.sessionId === shaderApplyLink.sessionId &&
        pendingRequest.targetShaderId === shaderApplyLink.targetShaderId
          ? pendingRequest
          : null;
      const prompt =
        matchingPendingRequest?.prompt ?? 'Apply the shader generated in my external AI chat.';
      const historyPrompt =
        matchingPendingRequest?.historyPrompt ?? 'Applied from AI chat link';
      const currentCode = matchingPendingRequest?.currentCode ?? targetShader.code;
      const nextCode = validateGeneratedShader(shaderApplyLink.code, {
        minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
        prompt,
      });
      const validationError = validateShaderCodeCompilation(nextCode);
      const versionId = crypto.randomUUID();
      const destinationProject = isBundledProjectSessionId(normalizedTargetProject.sessionId)
        ? {
            ...normalizedTargetProject,
            sessionId: crypto.randomUUID(),
            name: `${normalizedTargetProject.name} AI Edit`,
          }
        : normalizedTargetProject;
      const appliedProject = applyExternalShaderCodeToProject(destinationProject, {
        targetShaderId: shaderApplyLink.targetShaderId,
        prompt,
        historyPrompt,
        currentCode,
        nextCode,
        validationError,
        versionId,
        activateTarget: true,
      });
      const linkedAssetId = shaderApplyLink.assetId;
      const linkedAsset = linkedAssetId
        ? appliedProject.library.assets.find((asset) => asset.id === linkedAssetId) ?? null
        : null;
      const nextProject = linkedAsset
        ? {
            ...appliedProject,
            library: {
              ...appliedProject.library,
              activeAssetId: linkedAsset.id,
            },
            studio: {
              ...appliedProject.studio,
              savedShaders: appliedProject.studio.savedShaders.map((shader) =>
                shader.id === shaderApplyLink.targetShaderId
                  ? { ...shader, inputAssetId: linkedAsset.id }
                  : shader,
              ),
            },
            playback: {
              ...appliedProject.playback,
              activeAssetId: linkedAsset.id,
            },
          }
        : appliedProject;
      const nextName = parseShaderName(nextCode);

      generatedShaderRetryRef.current[shaderApplyLink.targetShaderId] = {
        sourcePrompt: prompt,
        code: nextCode,
        autoRepairUsed: false,
        versionId,
        retryInFlight: false,
      };

      persistActiveSessionId(nextProject.sessionId);
      await saveProjectDocument(nextProject);
      setSavedProjects(saveProjectToLibrary(nextProject, nextProject.name));
      setProject(nextProject);
      setEditingTimelineStepId(
        nextProject.timeline.stub.shaderSequence.steps.find(
          (step) => step.shaderId === shaderApplyLink.targetShaderId,
        )?.id ?? null,
      );
      setStudioPreviewOverride(true);
      setIsApiSettingsOpen(false);
      setExternalChatRequest(null);
      setPreferLiveShaderCompilePreview(true);
      setShaderCompileNonce((currentValue) => currentValue + 1);
      removePendingShaderApplyRequest(shaderApplyLink.requestId);

      if (validationError) {
        applyCompilerFeedback(validationError);
        setAiFeedbackTone('error');
        setAiFeedbackMessage(
          `The linked shader was added as ${nextName}, but it contains GLSL errors.`,
        );
        setStatusMessage(
          `The linked shader has GLSL errors. Showing the code while keeping the previous valid render for ${nextName}.`,
        );
      } else {
        setCompilerError('');
        setAiFeedbackTone('success');
        setAiFeedbackMessage(`Shader applied from your AI chat: ${nextName}.`);
        setStatusMessage(`Shader updated from AI chat: ${nextName}`);
      }

      trackLlmRequest({
        provider: 'external_chat',
        runtime: 'chat',
        outcome: 'success',
        trigger: matchingPendingRequest?.trigger ?? 'generate',
      });
    } catch (error) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage(
        error instanceof Error ? error.message : 'Unable to apply the shader link.',
      );
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to apply the shader link.',
      );
    } finally {
      stripShaderApplyParamsFromUrl();
    }
    })();
  }, [
    applyCompilerFeedback,
    location.hash,
    location.key,
    location.pathname,
    location.search,
    project,
  ]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    sessionSyncRef.current?.destroy();
    liveUniformSyncRef.current?.destroy();
    midiOutputSyncRef.current?.destroy();
    sessionSyncRef.current = createSessionSync(activeSessionId, (incomingProject) => {
      setProject((currentProject) => {
        if (!currentProject || currentProject.sessionId !== incomingProject.sessionId) {
          return currentProject;
        }
        // An incoming tab must not replace edits that are still being saved here.
        if (uniformCommitPendingRef.current || autosave.hasPending(currentProject.sessionId)) return currentProject;
        // The sender already persisted and broadcast this state. Remember the
        // exact receiving render so two open workspaces cannot echo the same
        // project back and forth. A local update batched after this one creates
        // a different object and is therefore still persisted normally.
        const normalizedIncomingProject = normalizeProject(incomingProject);
        syncedProjectAutosaveRef.current = normalizedIncomingProject;
        return normalizedIncomingProject;
      });
    });
    liveUniformSyncRef.current = createLiveUniformSync(activeSessionId);
    midiOutputSyncRef.current = createMidiOutputSync(activeSessionId, () => undefined);

    return () => {
      sessionSyncRef.current?.destroy();
      sessionSyncRef.current = null;
      liveUniformSyncRef.current?.destroy();
      liveUniformSyncRef.current = null;
      midiOutputSyncRef.current?.destroy();
      midiOutputSyncRef.current = null;
    };
  }, [activeSessionId, autosave]);

  useEffect(() => {
    if (activeSessionId) {
      persistActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  useLayoutEffect(() => {
    currentProjectRef.current = project;
    if (project) {
      for (const [shaderId, liveValues] of uniformRuntime.entries()) {
        const savedValues = shaderId === project.studio.activeShaderId
          ? project.studio.uniformValues
          : project.studio.savedShaders.find(shader => shader.id === shaderId)?.uniformValues;
        if (savedValues && Object.entries(liveValues).every(([name, value]) =>
          Object.is(value, savedValues[name]),
        )) uniformRuntime.clear(shaderId);
      }
    }
    if (!project) {
      return;
    }

    if (syncedProjectAutosaveRef.current === project) {
      syncedProjectAutosaveRef.current = null;
      setProjectSaveStatus('saved');
      return;
    }
    autosave.schedule(project);
  }, [project, autosave, uniformRuntime]);

  const captureCurrentProject = useCallback(() => {
    const current = currentProjectRef.current;
    if (!current || !uniformCommitPendingRef.current) return current;
    const shaderId = pendingUniformShaderIdRef.current ?? current.studio.activeShaderId;
    const savedValues = shaderId === current.studio.activeShaderId
      ? current.studio.uniformValues
      : current.studio.savedShaders.find(shader => shader.id === shaderId)?.uniformValues;
    // Include live edits when saving, exporting, or leaving during a drag.
    return applyShaderUniformValues(current, {
      ...savedValues,
      ...pendingUniformValuesRef.current,
    }, shaderId);
  }, []);

  const flushCurrentProject = useCallback(async () => {
    const current = captureCurrentProject();
    if (current && current !== currentProjectRef.current) autosave.schedule(current);
    const saved = await autosave.flush();
    if (!saved) {
      setStatusMessage('Could not save your latest changes. Keep this project open and retry when browser storage is available.');
    }
    return saved;
  }, [autosave, captureCurrentProject]);

  useEffect(() => {
    autosave.start();
    const checkpoint = () => {
      if (persistenceDisabledRef.current) return;
      const current = captureCurrentProject();
      if (current && current !== currentProjectRef.current) autosave.schedule(current);
      if (current && autosave.hasPending(current.sessionId)) checkpointProjectDocument(current);
      void autosave.flush();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') checkpoint();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (persistenceDisabledRef.current) return;
      const pending = autosave.hasPending() || uniformCommitPendingRef.current;
      checkpoint();
      if (pending) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', checkpoint);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', checkpoint);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      autosave.stop();
      checkpoint();
    };
  }, [autosave, captureCurrentProject]);

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

  const handleSaveProject = useCallback(async (name: string) => {
    if (!project) {
      return;
    }
    if (!(await flushCurrentProject())) return;

    const trimmedName = name.trim() || 'Untitled Project';
    if (isBundledProjectSessionId(project.sessionId)) {
      const newSessionId = crypto.randomUUID();
      const nextProject = normalizeProject({
        ...project,
        sessionId: newSessionId,
        name: trimmedName,
      });

      setProject(nextProject);
      if (!(await saveProjectDocument(nextProject))) {
        setStatusMessage('Unable to save this project because browser storage is full.');
        return;
      }
      setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
      persistActiveSessionId(nextProject.sessionId);
      setStatusMessage(`Saved "${trimmedName}" locally. Further changes save automatically.`);
      setIsProjectDialogOpen(false);
      trackUiClick('save_project', { mode: 'from_bundled' });
      return;
    }

    const nextProject = {
      ...project,
      name: trimmedName,
    };

    setProject(nextProject);
    if (!(await saveProjectDocument(nextProject))) {
      setStatusMessage('Unable to save this project because browser storage is full.');
      return;
    }
    setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
    persistActiveSessionId(nextProject.sessionId);
    setStatusMessage(`Renamed project to "${trimmedName}". Changes save automatically.`);
    setIsProjectDialogOpen(false);
    trackUiClick('save_project');
  }, [project, flushCurrentProject]);

  const handleSaveAsNewProject = useCallback(async (name: string) => {
    if (!project) {
      return;
    }
    if (!(await flushCurrentProject())) return;

    const trimmedName = name.trim() || `${project.name || 'Untitled Project'} Copy`;
    const nextProject = normalizeProject({
      ...project,
      sessionId: crypto.randomUUID(),
      sourceTemplateId: undefined,
      name: trimmedName,
    });

    setProject(nextProject);
    if (!(await saveProjectDocument(nextProject))) {
      setStatusMessage('Unable to save this project because browser storage is full.');
      return;
    }
    setSavedProjects(saveProjectToLibrary(nextProject, trimmedName));
    persistActiveSessionId(nextProject.sessionId);
    setStatusMessage(`Created "${trimmedName}" as a separate project. Changes save automatically.`);
    setIsProjectDialogOpen(false);
    trackUiClick('save_project_as');
  }, [project, flushCurrentProject]);

  const handleCreateNewProject = useCallback(async () => {
    if (!(await flushCurrentProject())) return;

    const nextSessionId = crypto.randomUUID();
    const nextProject = normalizeProject(createDefaultProject(nextSessionId, { isMobile }));

    setProject(nextProject);
    persistActiveSessionId(nextSessionId);
    setIsProjectDialogOpen(false);
    setEditingTimelineStepId(null);
    setStudioPreviewOverride(false);
    clearGeneratedShaderRetry();
    setCompilerError('');
    setStatusMessage('Created a new project. Changes save automatically in this browser.');
    trackUiClick('create_project');
  }, [isMobile, flushCurrentProject]);

  const handleCreateEmptyProject = useCallback(async () => {
    if (!(await flushCurrentProject())) return;

    const nextSessionId = crypto.randomUUID();
    const nextProject = normalizeProject(createEmptyProject(nextSessionId, { isMobile }));

    setProject(nextProject);
    persistActiveSessionId(nextSessionId);
    setIsProjectDialogOpen(false);
    setEditingTimelineStepId(null);
    setStudioPreviewOverride(false);
    clearGeneratedShaderRetry();
    setCompilerError('');
    setStatusMessage('Created an empty project. Changes save automatically in this browser.');
    trackUiClick('create_empty_project');
  }, [isMobile, flushCurrentProject]);

  const handleOpenSavedProject = useCallback(async (sessionId: string) => {
    if (!(await flushCurrentProject())) return;
    if (sessionId === project?.sessionId) {
      setIsProjectDialogOpen(false);
      return;
    }

    const loadedProject = await openEditableProject(sessionId);
    if (!loadedProject) {
      setStatusMessage(
        'That project is no longer in this browser. It was not deleted. Save files going forward, or keep this card until you export it.',
      );
      return;
    }

    const sliderCache = loadShaderSliderCache(loadedProject.sessionId);
    const normalizedProject = applyPersistedSliderCache(
      normalizeProject(loadedProject),
      sliderCache,
    );
    setProject(normalizedProject);
    persistActiveSessionId(normalizedProject.sessionId);
    setIsProjectDialogOpen(false);
    setStatusMessage(
      `Opened "${normalizedProject.name}". Changes save automatically in this browser.`,
    );
    trackUiClick('open_saved_project');
  }, [project, flushCurrentProject]);

  const handleDeleteSavedProject = useCallback(async (sessionId: string) => {
    const entry = savedProjects.find((candidate) => candidate.sessionId === sessionId);
    if (!entry || entry.bundled || sessionId === project?.sessionId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${entry.name}" from this browser? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setSavedProjects(await deletePersistedProject(sessionId));
    void autosave.flush();
    setStatusMessage(`Deleted "${entry.name}" from this browser. A file copy was not removed.`);
    trackUiClick('delete_project');
  }, [project?.sessionId, savedProjects, autosave]);

  const handleSaveProjectFile = useCallback(() => {
    if (!project) {
      return;
    }
    downloadProjectBackup(project);
    setStatusMessage(
      `Exported "${project.name}" as JSON. Uploaded media stay in this browser and are not included in this file.`,
    );
    trackUiClick('save_project_file');
  }, [project]);

  const handleOpenProjectFilePicker = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleProjectFileSelection = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    let raw = '';
    try {
      raw = await file.text();
    } catch {
      setStatusMessage('Unable to read that project file.');
      return;
    }

    const importedProject = parseProjectBackupContents(raw);
    if (!importedProject) {
      setStatusMessage('That file is not a Mapshroom project backup.');
      return;
    }
    if (!(await flushCurrentProject())) return;

    const nextSessionId = isBundledProjectSessionId(importedProject.sessionId)
      ? crypto.randomUUID()
      : importedProject.sessionId;
    const nextProject = activateTimelineOnAppEntry(
      normalizeProject({
        ...importedProject,
        sessionId: nextSessionId,
      }),
    );

    if (!(await saveProjectDocument(nextProject))) {
      setStatusMessage(
        `Could not save "${nextProject.name}" locally. Keep the file and retry when browser storage is available.`,
      );
      return;
    } else {
      setSavedProjects(saveProjectToLibrary(nextProject, nextProject.name));
    }
    persistActiveSessionId(nextProject.sessionId);
    setProject(nextProject);
    setIsProjectDialogOpen(false);
    setEditingTimelineStepId(null);
    setStudioPreviewOverride(false);
    clearGeneratedShaderRetry();
    setCompilerError('');
    setStatusMessage(`Loaded "${nextProject.name}" from file.`);
    trackUiClick('open_project_file');
  }, [flushCurrentProject]);

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
      trackActivationMilestone('share_project');
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
    () => parseUniforms(project?.studio.activeShaderCode ?? ''),
    [project?.studio.activeShaderCode],
  );
  const activeAudioShaderId = project?.studio.activeShaderId ?? null;
  const activeAudioShaderCode = project?.studio.activeShaderCode ?? '';
  const activeAudioUniformValues = project?.studio.uniformValues ?? null;
  const activeAudioPresetBindings =
    project?.studio.savedShaders.find(
      (shader) => shader.id === activeAudioShaderId,
    )?.audioReactiveBindings ?? null;

  useEffect(() => {
    if (!activeAudioShaderId || !activeAudioPresetBindings) {
      return;
    }

    seedAudioShaderBindings(
      activeAudioShaderId,
      activeAudioPresetBindings,
    );
  }, [
    activeAudioPresetBindings,
    activeAudioShaderId,
    seedAudioShaderBindings,
  ]);

  useEffect(() => {
    if (!activeAudioShaderId || !activeAudioUniformValues || !audioReactiveModeEnabled) {
      return;
    }

    configureAudioShaderBindings(
      activeAudioShaderId,
      uniformDefinitions,
      activeAudioUniformValues,
      activeAudioShaderCode,
    );
  }, [
    activeAudioShaderCode,
    activeAudioShaderId,
    activeAudioUniformValues,
    audioReactiveModeEnabled,
    configureAudioShaderBindings,
    uniformDefinitions,
  ]);

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
    if (!project?.studio.activeShaderId) {
      return;
    }

    updateProject((currentProject) => {
      const activeShader = currentProject.studio.savedShaders.find(
        (shader) => shader.id === currentProject.studio.activeShaderId,
      );
      if (!activeShader) {
        return currentProject;
      }

      const nextCompileError = compilerError.trim() ? compilerError : undefined;
      const nextLastValidCode = nextCompileError
        ? activeShader.lastValidCode ?? activeShader.code
        : currentProject.studio.activeShaderCode;
      const nextLastValidUniformValues = nextCompileError
        ? getRenderableShaderUniformValues(activeShader)
        : getSyncedShaderUniformValues(
            currentProject.studio.activeShaderCode,
            currentProject.studio.uniformValues,
          );

      if (
        (activeShader.compileError ?? undefined) === nextCompileError &&
        (activeShader.lastValidCode ?? activeShader.code) === nextLastValidCode &&
        areUniformValuesEqual(activeShader.lastValidUniformValues, nextLastValidUniformValues)
      ) {
        return currentProject;
      }

      return {
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
      };
    });
  }, [
    compileFeedbackVersion,
    compilerError,
    project?.studio.activeShaderCode,
    project?.studio.activeShaderId,
    updateProject,
  ]);

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
    if (!project || !editingTimelineStepId) {
      return;
    }

    const editingStep = project.timeline.stub.shaderSequence.steps.find(
      (step) => step.id === editingTimelineStepId,
    );
    const editingShader = editingStep
      ? project.studio.savedShaders.find((shader) => shader.id === editingStep.shaderId) ?? null
      : null;

    if (!editingStep || !editingShader) {
      setEditingTimelineStepId(null);
      return;
    }

    const activeShaderNeedsSync = project.studio.activeShaderId !== editingShader.id;

    if (!activeShaderNeedsSync) {
      return;
    }

    updateProject((currentProject) => {
      const currentEditingStep = currentProject.timeline.stub.shaderSequence.steps.find(
        (step) => step.id === editingTimelineStepId,
      );
      const currentEditingShader = currentEditingStep
        ? currentProject.studio.savedShaders.find(
            (shader) => shader.id === currentEditingStep.shaderId,
          ) ?? null
        : null;

      if (!currentEditingStep || !currentEditingShader) {
        return currentProject;
      }

      if (currentProject.studio.activeShaderId === currentEditingShader.id) {
        return currentProject;
      }

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          activeShaderId: currentEditingShader.id,
          activeShaderName: currentEditingShader.name,
          activeShaderCode: currentEditingShader.code,
          shaderChatHistory: [],
          shaderVersions: getShaderVersionTrail(currentEditingShader),
          uniformValues: getSyncedShaderUniformValues(
            currentEditingShader.code,
            currentEditingShader.uniformValues,
          ),
        },
      };
    });

    if (activeShaderNeedsSync) {
      setCompilerError(editingShader.compileError ?? '');
      setPreferLiveShaderCompilePreview(false);
      setStudioPreviewOverride(false);
    }
  }, [editingTimelineStepId, project, updateProject]);

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
  const segmentationOriginalAsset = useMemo(() => segmentationPanel === 'depth' && segmentationAsset?.derivation?.kind === 'depth'
    ? project?.library.assets.find(asset => asset.id === segmentationAsset.derivation?.sourceAssetId) ?? null
    : null, [project, segmentationAsset, segmentationPanel]);
  const segmentationOriginalResolution = useAssetObjectUrl(segmentationOriginalAsset);
  const surfaceAsset = useMemo(() => project?.library.assets.find(asset => asset.id === surfaceAssetId) ?? null, [project, surfaceAssetId]);
  const surfaceAssetResolution = useAssetObjectUrl(surfaceAsset);
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
    setStatusMessage(
      `Saved photo "${activeAsset.name}" is no longer stored on this device. Home-screen bookmarks can drop uploaded images. Load the file again.`,
    );
  }, [activeAsset, activeAssetResolution.status]);

  const openFilePicker = (source: FilePickerSource = 'library', timelineStepId: string | null = null) => {
    filePickerSourceRef.current = source;
    timelineImportStepIdRef.current = source === 'timeline-picker' ? timelineStepId : null;
    fileInputRef.current?.click();
  };

  const beginDesktopResize = (target: DesktopResizeTarget, clientX: number, clientY: number, timelineHeight = desktopLayout.timelineHeight) => {
    resizeStateRef.current = {
      target,
      startX: clientX,
      startY: clientY,
      leftSidebarWidth: desktopLayout.leftSidebarWidth,
      rightSidebarWidth: desktopLayout.rightSidebarWidth,
      timelineHeight,
    };
    document.body.style.cursor = target === 'timeline' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const importAssetFiles = useCallback(async (
    files: File[],
    filePickerSource: FilePickerSource = 'library',
    timelineImportStepId: string | null = null,
  ) => {
    if (!files.length) {
      return false;
    }

    const uploadedAssets: AssetRecord[] = [];
    let failedStorageCount = 0;
    const storageUsage = await readBrowserStorageUsage();

    for (const file of files) {
      const kind = detectAssetKind(file);
      if (!kind) {
        continue;
      }

      if (!browserStorageHasRoom(storageUsage, file.size)) {
        failedStorageCount += 1;
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
        if (storageUsage.usageBytes != null) {
          storageUsage.usageBytes += file.size;
        }
      } else {
        failedStorageCount += 1;
      }
    }

    if (!uploadedAssets.length) {
      const message = failedStorageCount
          ? 'The images could not be stored in this browser. Free some space, then retry with fewer or smaller images.'
          : 'No supported assets were added.';
      setStatusMessage(message);
      setImageImportMessage(message);
      return false;
    }

    let timelineAssignmentMessage = '';
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);

    updateProject((currentProject) => {
      if (currentProject.sessionId !== project?.sessionId) return currentProject;
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
        mapping: {
          ...currentProject.mapping,
          stageTransform: preserveStageFrame(currentProject.mapping.stageTransform, referenceAspectRatio),
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
        referenceAspectRatio,
      );
      timelineAssignmentMessage = assignment.statusMessage;
      return assignment.project;
    });

    const storedMessage = timelineAssignmentMessage
      ? timelineAssignmentMessage
      : filePickerSource === 'timeline-picker'
        ? `${uploadedAssets.length} asset${uploadedAssets.length > 1 ? 's' : ''} added to the library.`
        : `${uploadedAssets.length} asset${uploadedAssets.length > 1 ? 's' : ''} added.`;
    const importMessage = failedStorageCount
        ? `${storedMessage} ${failedStorageCount} file${failedStorageCount > 1 ? 's' : ''} were skipped because browser storage is full. The existing project was not deleted.`
        : storedMessage;
    setStatusMessage(importMessage);
    setImageImportMessage(importMessage);
    if (filePickerSource === 'library') {
      setHighlightAssetStartMapping(true);
    }
    return true;
  }, [editingTimelineStepId, project?.sessionId, updateProject]);

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const source = filePickerSourceRef.current;
    const stepId = timelineImportStepIdRef.current;
    event.target.value = '';
    filePickerSourceRef.current = 'library';
    timelineImportStepIdRef.current = null;
    await importAssetFiles(files, source, stepId);
  };

  const handleImageTransfer = useCallback(async (
    source: ImageTransfer | (() => Promise<ImageTransfer>),
    stepId: string | null = null,
  ) => {
    if (!project || imageImportBusyRef.current) return;
    imageImportBusyRef.current = true;
    setImageImporting(true);
    setImageImportMessage('Adding image…');
    setStatusMessage('Adding image…');
    try {
      const transfer = typeof source === 'function' ? await source() : source;
      if (transfer.assetId) {
        const asset = project.library.assets.find((item) => item.id === transfer.assetId && item.kind === 'image');
        if (!asset) throw new Error('This image is no longer in this project. Import the original file again.');
        const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);
        updateProject((currentProject) => {
          if (currentProject.sessionId !== project.sessionId) return currentProject;
          if (stepId) {
            return assignTimelineStepAssetToProject(currentProject, stepId, asset.id, editingTimelineStepId === stepId, referenceAspectRatio).project;
          }
          return replaceStageAsset(currentProject, asset.id, referenceAspectRatio);
        });
        const message = stepId ? `Assigned “${asset.name}” to this shader step.` : `“${asset.name}” is now the canvas image.`;
        setStatusMessage(message);
        setImageImportMessage(message);
        setIsAssetLibraryOpen(false);
      } else {
        const candidates = transfer.files.filter((file) => imageFileType(file));
        if (!candidates.length) {
          const url = getTransferredImageUrl(transfer);
          if (url) candidates.push(await fetchImageFile(url));
        }
        if (!candidates.length) throw new Error('No image found. Copy an image or screenshot, paste a direct image URL, or drag an image file here.');
        const files: File[] = [];
        const failures: string[] = [];
        for (const file of candidates) {
          try { files.push(await validateImageFile(file)); }
          catch (error) { failures.push(error instanceof Error ? error.message : 'An image could not be opened.'); }
        }
        if (!files.length) throw new Error(failures[0]);
        const added = await importAssetFiles(files, stepId ? 'timeline-picker' : 'library', stepId);
        if (!added) return;
        if (failures.length || transfer.files.length > candidates.length) {
          const skipped = failures.length + Math.max(0, transfer.files.length - candidates.length);
          const suffix = ` ${skipped} unreadable or unsupported file${skipped === 1 ? ' was' : 's were'} skipped.`;
          setStatusMessage((message) => message + suffix);
          setImageImportMessage((message) => message + suffix);
        }
      }
      if (!stepId) {
        dismissAssetsFirstStepPermanently();
        setShowAssetImportFirstStep(false);
        setHighlightAssetStartMapping(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The image could not be added. Please try again.';
      setStatusMessage(message);
      setImageImportMessage(message);
    } finally {
      imageImportBusyRef.current = false;
      setImageImporting(false);
    }
  }, [project, editingTimelineStepId, importAssetFiles, updateProject]);

  const { dropProps: stageImageDropProps } = useImageDropTarget((transfer) => {
    void handleImageTransfer(transfer);
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (event.defaultPrevented || !event.clipboardData) return;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable=""], [contenteditable="true"], [role="textbox"]')) return;
      // Leave shader code, project dialogs, and other editing flows in control of paste.
      if (document.querySelector('.dialog-backdrop:not(.asset-browser-backdrop)')) return;
      const transfer = captureImageTransfer(event.clipboardData);
      if (!hasImageTransfer(transfer)) return;
      event.preventDefault();
      void handleImageTransfer(transfer);
    };
    const preventFileNavigation = (event: DragEvent) => {
      if (event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')) {
        event.preventDefault();
      }
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', preventFileNavigation);
    window.addEventListener('drop', preventFileNavigation);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', preventFileNavigation);
      window.removeEventListener('drop', preventFileNavigation);
    };
  }, [handleImageTransfer]);

  const handlePlayToggle = () => {
    updateProject((currentProject) => {
      const wasPlaying = currentProject.playback.transport.isPlaying;
      const nowMs = performance.now();
      const currentTimelineState = wasPlaying
        ? resolveProjectTimelineState(
            currentProject,
            currentProject.timeline.stub.shaderSequence.singleStepLoopEnabled,
            nowMs,
          )
        : null;
      const startsFromBeginning =
        !wasPlaying &&
        currentProject.playback.transport.currentTimeSeconds <=
          TIMELINE_RANDOM_RESEED_EPSILON_SECONDS;
      const nextProject = startsFromBeginning
        ? withNewTimelineRandomSeed(currentProject)
        : currentProject;

      return {
        ...nextProject,
        timeline: currentTimelineState
          ? {
              stub: {
                ...nextProject.timeline.stub,
                shaderSequence: {
                  ...nextProject.timeline.stub.shaderSequence,
                  focusedStepId: currentTimelineState.currentStep.id,
                },
              },
            }
          : nextProject.timeline,
        playback: {
          ...nextProject.playback,
          transport: wasPlaying
            ? pauseTransport(nextProject.playback.transport, nowMs)
            : playTransport(nextProject.playback.transport),
        },
      };
    });
  };

  const handleAssetSelect = (assetId: string) => {
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);
    updateProject(currentProject => replaceStageAsset(currentProject, assetId, referenceAspectRatio));
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

  const handleAssetMaskApply = useCallback(async (blob: Blob, resultKind: 'mask' | 'draw' | 'depth', options: SegmentationSaveOptions) => {
    const sourceAssetId = segmentationQueue[0];
    const sourceAsset = project?.library.assets.find((asset) => asset.id === sourceAssetId);
    if (!sourceAsset) {
      setSegmentationQueue((current) => current.slice(1));
      return false;
    }
    const existingDepthAsset = resultKind === 'depth' && options.outputAssetId
      ? project?.library.assets.find((asset) => asset.id === options.outputAssetId && asset.derivation?.kind === 'depth')
      : undefined;
    const outputSuffix = resultKind === 'depth' ? 'depth-map' : resultKind === 'draw' ? 'painted' : 'masked';
    const maskedAsset: AssetRecord = {
      ...sourceAsset,
      id: resultKind === 'depth' ? options.outputAssetId ?? crypto.randomUUID() : crypto.randomUUID(),
      name: existingDepthAsset?.name ?? `${sourceAsset.name.replace(/\.[^.]+$/, '')}-${outputSuffix}.png`,
      mimeType: 'image/png',
      size: blob.size,
      lastModified: Math.max(Date.now(), (existingDepthAsset?.lastModified ?? 0) + 1),
      createdAt: existingDepthAsset?.createdAt ?? new Date().toISOString(),
      sourceType: 'uploaded',
      derivation: { ...existingDepthAsset?.derivation, sourceAssetId: sourceAsset.derivation?.sourceAssetId ?? sourceAsset.id, kind: resultKind === 'depth' ? 'depth' : resultKind === 'draw' ? 'painted' : 'background', width: options.width, height: options.height },
    };
    const saved = await putAssetBlob(maskedAsset.id, blob);
    if (!saved) {
      setStatusMessage('Browser storage is full, so the image was not saved. The original asset was left unchanged.');
      return false;
    }
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);
    updateProject((currentProject) => replaceStageAsset({
      ...currentProject,
      library: {
        ...currentProject.library,
        assets: currentProject.library.assets.some((asset) => asset.id === maskedAsset.id)
          ? currentProject.library.assets.map((asset) => asset.id === maskedAsset.id ? maskedAsset : asset)
          : [...currentProject.library.assets, maskedAsset],
      },
    }, maskedAsset.id, referenceAspectRatio));
    setStatusMessage(`${resultKind === 'depth' ? 'Depth map' : resultKind === 'draw' ? 'Painted asset' : 'Masked asset'} “${maskedAsset.name}” ${existingDepthAsset ? 'updated' : 'added and selected'}.`);
    if (!options.automatic) setSegmentationQueue((current) => current.slice(1));
    return true;
  }, [project, segmentationQueue, updateProject]);

  const handleAssetSurfacesOpen = useCallback((assetId: string, options: SurfaceEditorInitialOptions = {}) => {
    const asset = project?.library.assets.find(item => item.id === assetId);
    if (asset?.kind === 'image') { setSurfaceInitialOptions(options); setSurfaceAssetId(assetId); }
  }, [project]);

  const handleAssetSurfacesApply = useCallback(async (blob: Blob, output: SurfaceOutput) => {
    if (!surfaceAsset || !project) return false;
    const outputAsset: AssetRecord = {
      ...surfaceAsset,
      id: crypto.randomUUID(),
      name: `${surfaceAsset.name.replace(/\.[^.]+$/, '')}-surfaces-${output}.png`,
      mimeType: 'image/png', size: blob.size, lastModified: Date.now(),
      createdAt: new Date().toISOString(), sourceType: 'uploaded',
      derivation: { sourceAssetId: surfaceAsset.derivation?.sourceAssetId ?? surfaceAsset.id, kind: output === 'regions' ? 'segmentation' : output },
    };
    if (!await putAssetBlob(outputAsset.id, blob)) return false;
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);
    updateProject(current => current.sessionId !== project.sessionId ? current : replaceStageAsset({
      ...current,
      library: { ...current.library, assets: [...current.library.assets, outputAsset] },
    }, outputAsset.id, referenceAspectRatio));
    setStatusMessage(`Surfaces image “${outputAsset.name}” added and selected.`);
    return true;
  }, [project, surfaceAsset, updateProject]);

  const handleAssetVersionSave = useCallback(async (source: AssetRecord, result: VariantResult) => {
    const sessionId = assetVersionProjectRef.current?.sessionId;
    if (!sessionId || !assetVersionProjectRef.current?.library.assets.some(asset => asset.id === source.id)) return null;
    const output: AssetRecord = {
      ...source, id: crypto.randomUUID(), name: `${source.name.replace(/\.[^.]+$/, '')}-${result.kind}.png`,
      mimeType: 'image/png', kind: 'image', size: result.blob.size, lastModified: Date.now(),
      createdAt: new Date().toISOString(), sourceType: 'generated',
      derivation: { sourceAssetId: source.id, kind: result.kind, width: result.width, height: result.height, method: result.method },
    };
    if (!await putAssetBlob(output.id, result.blob)) return null;
    if (assetVersionProjectRef.current?.sessionId !== sessionId || !assetVersionProjectRef.current.library.assets.some(asset => asset.id === source.id)) {
      await deleteAssetBlob(output.id); return null;
    }
    updateProject(current => current.sessionId !== sessionId ? current : ({
      ...current, library: { ...current.library, assets: [...current.library.assets, output] },
    }));
    return output;
  }, [updateProject]);

  const handleAssetRemove = (assetId: string) => {
    const removedAsset = project?.library.assets.find((asset) => asset.id === assetId) ?? null;
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);
    void deleteAssetBlob(assetId);
    updateProject((currentProject) => {
      const nextAssets = currentProject.library.assets.filter((asset) => asset.id !== assetId);
      const removedWasActive = currentProject.library.activeAssetId === assetId || currentProject.playback.activeAssetId === assetId;
      const nextActiveId = removedWasActive ? nextAssets.at(-1)?.id ?? null : currentProject.library.activeAssetId;
      return {
        ...currentProject,
        mapping: removedWasActive
          ? { ...currentProject.mapping, stageTransform: preserveStageFrame(currentProject.mapping.stageTransform, referenceAspectRatio) }
          : currentProject.mapping,
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
    if (mode === 'audioReactive') {
      setEditingTimelineStepId(null);
      setStudioPreviewOverride(false);
      setPendingTimelineRepeatExit(null);
      setRepeatFocusFirstStepVisible(false);
      setMidiManualMixArmed(false);
    }
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: mode === 'audioReactive'
            ? activateAudioReactiveTimeline(currentProject.timeline.stub.shaderSequence)
            : { ...currentProject.timeline.stub.shaderSequence, mode },
        },
      },
    }));
  }, [updateProject]);

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
                shaderSequence.mode === 'audioReactive'
                  ? Math.max(
                      1,
                      patch.sharedSectionDurationSeconds ??
                        shaderSequence.sharedSectionDurationSeconds,
                    )
                  : patch.sharedSectionDurationSeconds ??
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
    handleTimelineSharedTransitionChange({
      sharedTransitionEnabled: true,
      sharedTransitionDurationSeconds: mixDurationSeconds,
    });
  }, [handleTimelineSharedTransitionChange]);

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

  const handleRandomizeTimelineStep = (stepId: string) => {
    if (!project) {
      return;
    }

    const step = project.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
    if (!step) {
      return;
    }
    const previousShader = project.studio.savedShaders.find((shader) => shader.id === step.shaderId);
    const preset = chooseRandomShaderReplacement(
      project.studio.savedShaders.filter((shader) => Boolean(DEFAULT_SHADERS[shader.id])),
      previousShader,
    );
    if (!preset) {
      setStatusMessage('No different shader preset is available.');
      return;
    }

    const editableShader = createSavedShaderRecord(preset.name, preset.code, preset.uniformValues, {
      ...preset,
      group: 'Timeline',
      inputAssetId: previousShader?.inputAssetId ?? null,
      isTemporary: true,
      isDirty: false,
      sourceShaderId: preset.sourceShaderId ?? preset.id,
      ownerTimelineStepId: stepId,
      versions: cloneShaderVersionsWithName(preset.versions, preset.name),
    });
    const isEditingStep = editingTimelineStepId === stepId;

    updateProject((currentProject) => pruneTemporaryTimelineShaders({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        ...(isEditingStep ? {
          activeShaderId: editableShader.id,
          activeShaderName: editableShader.name,
          activeShaderCode: editableShader.code,
          uniformValues: editableShader.uniformValues ?? {},
          shaderChatHistory: [],
          shaderVersions: getShaderVersionTrail(editableShader),
        } : {}),
        savedShaders: [...currentProject.studio.savedShaders, editableShader],
      },
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            steps: currentProject.timeline.stub.shaderSequence.steps.map((item) =>
              item.id === stepId ? { ...item, shaderId: editableShader.id } : item,
            ),
          },
        },
      },
    }));
    if (preset.audioReactiveBindings) {
      seedAudioShaderBindings(editableShader.id, preset.audioReactiveBindings);
    }
    if (isEditingStep) {
      clearGeneratedShaderRetry();
      setPreferLiveShaderCompilePreview(false);
      setCompilerError('');
    }
    setStatusMessage('Replaced this timeline shader with "' + preset.name + '".');
  };

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
    const referenceAspectRatio = readStageFrameAspectRatio(stageCanvasRef.current);

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
        referenceAspectRatio,
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

  const handleTimelineReorderSteps = useCallback((orderedStepIds: string[]) => {
    updateProject((currentProject) => {
      const currentSteps = currentProject.timeline.stub.shaderSequence.steps;
      const stepMap = new Map(currentSteps.map((step) => [step.id, step]));
      const nextSteps = orderedStepIds
        .map((stepId) => stepMap.get(stepId))
        .filter((step): step is (typeof currentSteps)[number] => Boolean(step));

      if (nextSteps.length !== currentSteps.length) {
        const seenIds = new Set(nextSteps.map((step) => step.id));
        for (const step of currentSteps) {
          if (!seenIds.has(step.id)) {
            nextSteps.push(step);
          }
        }
      }

      if (
        nextSteps.length !== currentSteps.length ||
        nextSteps.every((step, index) => step.id === currentSteps[index]?.id)
      ) {
        return currentProject;
      }

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              steps: nextSteps,
            },
          },
        },
      };
    });
  }, [updateProject]);

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

  const handleMobileEqualDurationChange = useCallback((durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds)) return;

    updateProject((currentProject) => {
      const shaderSequence = currentProject.timeline.stub.shaderSequence;
      const equalDurationSeconds = clampTimelineStepDuration(
        shaderSequence.mode === 'audioReactive'
          ? Math.max(1, durationSeconds)
          : durationSeconds,
      );
      if (shaderSequence.mode === 'audioReactive') {
        return {
          ...currentProject,
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              shaderSequence: {
                ...shaderSequence,
                sharedSectionDurationSeconds: equalDurationSeconds,
              },
            },
          },
        };
      }

      const steps = shaderSequence.steps.map((step) => ({
        ...step,
        durationSeconds: equalDurationSeconds,
        transitionDurationSeconds: clampTransitionDuration(
          equalDurationSeconds,
          step.transitionDurationSeconds,
        ),
      }));

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            durationSeconds: equalDurationSeconds * steps.filter(isTimelineStepEnabled).length,
            shaderSequence: {
              ...shaderSequence,
              sharedSectionDurationSeconds: equalDurationSeconds,
              steps,
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

  const setMoveMode = (enabled: boolean) => {
    if (enabled && !showOnboardingGuide && !isMappingFirstStepDismissed()) {
      setShowMappingFirstStep(true);
    } else if (!enabled) {
      setShowMappingFirstStep(false);
    }

    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          moveMode: enabled,
          distortMode: enabled
            ? currentProject.mapping.stageTransform.distortMode
            : false,
        },
      },
    }));
  };

  const toggleMoveMode = () => {
    if (project?.mapping.stageTransform.distortMode) {
      setDistortMode(false);
      return;
    }
    setMoveMode(!project?.mapping.stageTransform.moveMode);
  };

  const toggleAlignmentGrid = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          showGrid: !currentProject.mapping.stageTransform.showGrid,
        },
      },
    }));
  };

  const setDistortMode = (enabled: boolean) => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          distortMode: enabled,
        },
      },
    }));
  };

  const updateStageDistortion = (distortion: StageDistortion) => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          distortion: normalizeStageDistortion(
            distortion,
            normalizeStageDistortion(currentProject.mapping.stageTransform.distortion),
          ),
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

  const updateStageRotation = (nextRotationDegrees: number) => {
    if (!Number.isFinite(nextRotationDegrees)) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          rotationDegrees: Math.max(
            MIN_MAPPING_ROTATION,
            Math.min(
              MAX_MAPPING_ROTATION,
              Math.round(nextRotationDegrees * 10) / 10,
            ),
          ),
        },
      },
    }));
  };

  const dismissMappingFirstStep = () => {
    dismissMappingFirstStepPermanently();
    setShowMappingFirstStep(false);
  };

  const createCurrentMappingPositionJson = () => {
    if (!project) {
      return '';
    }

    return `${JSON.stringify(
      createMappingPositionFile(project.mapping.stageTransform),
      null,
      2,
    )}\n`;
  };

  const handleMappingPositionExport = (source?: string) => {
    if (!project) {
      return;
    }

    const fileName = createMappingPositionFileName(project.name);
    const serializedPosition = source?.trim()
      ? `${source.trimEnd()}\n`
      : createCurrentMappingPositionJson();
    const blob = new Blob([serializedPosition], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
    setStatusMessage(`Downloaded ${fileName}.`);
  };

  const applyMappingPositionSource = (
    source: string,
    sourceLabel: string,
  ): string | null => {
    try {
      const position = parseMappingPositionFile(source);
      updateProject((currentProject) => ({
        ...currentProject,
        mapping: {
          stageTransform: {
            ...currentProject.mapping.stageTransform,
            ...position,
          },
        },
      }));
      setStatusMessage(`Imported mapping position from ${sourceLabel}.`);
      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to import this position JSON.';
      setStatusMessage(message);
      return message;
    }
  };

  const handleMappingPositionImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      if (file.size > 128 * 1024) {
        throw new Error('This position file is too large.');
      }

      applyMappingPositionSource(await file.text(), file.name);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to import this position file.',
      );
    }
  };

  const commitActiveUniformValues = useCallback(() => {
    if (uniformCommitTimerRef.current !== null) {
      window.clearTimeout(uniformCommitTimerRef.current);
      uniformCommitTimerRef.current = null;
    }
    if (!uniformCommitPendingRef.current) return;

    const pendingValues = pendingUniformValuesRef.current;
    const shaderId = pendingUniformShaderIdRef.current;
    uniformCommitPendingRef.current = false;
    pendingUniformValuesRef.current = {};
    pendingUniformShaderIdRef.current = null;
    updateProject((currentProject) => {
      if (!shaderId) return currentProject;
      const savedValues = shaderId === currentProject.studio.activeShaderId
        ? currentProject.studio.uniformValues
        : currentProject.studio.savedShaders.find(shader => shader.id === shaderId)?.uniformValues;
      return applyShaderUniformValues(currentProject, {
        ...savedValues,
        ...pendingValues,
      }, shaderId);
    });
  }, [updateProject]);

  const handleUniformChange = useCallback((name: string, value: ShaderUniformValue) => {
    const activeShaderId = currentProjectRef.current?.studio.activeShaderId;
    if (!activeShaderId) return;
    if (pendingUniformShaderIdRef.current && pendingUniformShaderIdRef.current !== activeShaderId) {
      commitActiveUniformValues();
    }

    uniformCommitPendingRef.current = true;
    pendingUniformShaderIdRef.current = activeShaderId;
    pendingUniformValuesRef.current[name] = value;
    // WebGL reads this value in its existing frame. Only the small controls subscribe.
    uniformRuntime.set(activeShaderId, name, value);
    liveUniformSyncRef.current?.publish(activeShaderId, name, value);
    if (uniformCommitTimerRef.current !== null) window.clearTimeout(uniformCommitTimerRef.current);
    // MIDI and native colour pickers may not send a pointerup/keyup to this window.
    if (!uniformPointerActiveRef.current) {
      uniformCommitTimerRef.current = window.setTimeout(commitActiveUniformValues, 180);
    }
  }, [commitActiveUniformValues, uniformRuntime]);

  const handleUniformValuesChange = useCallback((values: ShaderUniformValueMap) => {
    commitActiveUniformValues();
    const activeShaderId = currentProjectRef.current?.studio.activeShaderId;
    if (activeShaderId) {
      for (const [name, value] of Object.entries(values)) {
        uniformRuntime.set(activeShaderId, name, value);
        liveUniformSyncRef.current?.publish(activeShaderId, name, value);
      }
    }
    updateProject((currentProject) => applyShaderUniformValues(currentProject, values));
  }, [commitActiveUniformValues, uniformRuntime, updateProject]);

  useEffect(() => {
    const beginPointer = (event: PointerEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'range') {
        uniformPointerActiveRef.current = true;
        if (uniformCommitTimerRef.current !== null) window.clearTimeout(uniformCommitTimerRef.current);
      }
    };
    const endPointer = () => {
      uniformPointerActiveRef.current = false;
      commitActiveUniformValues();
    };
    const endKey = () => commitActiveUniformValues();
    window.addEventListener('pointerdown', beginPointer, true);
    window.addEventListener('pointerup', endPointer, true);
    window.addEventListener('pointercancel', endPointer, true);
    window.addEventListener('blur', endPointer);
    window.addEventListener('keyup', endKey, true);
    return () => {
      window.removeEventListener('pointerdown', beginPointer, true);
      window.removeEventListener('pointerup', endPointer, true);
      window.removeEventListener('pointercancel', endPointer, true);
      window.removeEventListener('blur', endPointer);
      window.removeEventListener('keyup', endKey, true);
      if (uniformCommitTimerRef.current !== null) window.clearTimeout(uniformCommitTimerRef.current);
    };
  }, [commitActiveUniformValues]);

  const selectTimelineStepByIndex = useCallback((stepIndex: number, cut = false) => {
    const step = project?.timeline.stub.shaderSequence.steps[stepIndex];
    if (!step) {
      return;
    }

    void selectTimelineStepForEditing(step.id, {
      stagePreviewMode: 'focused',
      selectionTransition: cut ? 'cut' : 'mix',
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
      selectTimelineStepByIndex(targetIndex, true);
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

  const applyPresetSelection = (
    shaderId: string,
    action: PresetSelectionAction,
  ) => {
    if (!project) {
      return;
    }

    const preset = project.studio.savedShaders.find((shader) => shader.id === shaderId);
    if (!preset) {
      return;
    }

    const replacementStep = getCurrentPresetReplacementStep(project, editingTimelineStepId);
    if (action === 'replace-current' && !replacementStep) {
      setStatusMessage('There is no current timeline shader to replace.');
      return;
    }

    const targetStep =
      action === 'replace-current'
        ? replacementStep!
        : createTimelineShaderStep(preset.id);
    const replacedShader =
      action === 'replace-current'
        ? project.studio.savedShaders.find((shader) => shader.id === targetStep.shaderId) ?? null
        : null;
    const editableShader = createSavedShaderRecord(
      preset.name,
      preset.code,
      preset.uniformValues,
      {
        description: preset.description ?? 'Linked timeline shader from a preset.',
        template: preset.template ?? 'stage',
        templates: preset.templates ? [...preset.templates] : undefined,
        group: 'Timeline',
        audioReactiveBindings: preset.audioReactiveBindings,
        inputAssetId: replacedShader?.inputAssetId ?? preset.inputAssetId ?? null,
        isTemporary: true,
        isDirty: false,
        sourceShaderId: preset.sourceShaderId ?? preset.id,
        ownerTimelineStepId: targetStep.id,
        versions: cloneShaderVersionsWithName(preset.versions, preset.name),
        lastValidCode: preset.lastValidCode,
        lastValidUniformValues: preset.lastValidUniformValues,
        compileError: preset.compileError,
      },
    );

    updateProject((currentProject) => {
      const nextSteps =
        action === 'replace-current'
          ? currentProject.timeline.stub.shaderSequence.steps.map((step) =>
              step.id === targetStep.id
                ? {
                    ...step,
                    shaderId: editableShader.id,
                  }
                : step,
            )
          : [
              ...currentProject.timeline.stub.shaderSequence.steps,
              {
                ...targetStep,
                shaderId: editableShader.id,
              },
            ];

      return pruneTemporaryTimelineShaders(
        {
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderId: editableShader.id,
            activeShaderName: editableShader.name,
            activeShaderCode: editableShader.code,
            shaderChatHistory: [],
            shaderVersions: getShaderVersionTrail(editableShader),
            uniformValues: getSyncedShaderUniformValues(
              editableShader.code,
              editableShader.uniformValues,
            ),
            savedShaders: [...currentProject.studio.savedShaders, editableShader],
          },
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              shaderSequence: {
                ...currentProject.timeline.stub.shaderSequence,
                enabled: true,
                stagePreviewMode: 'focused',
                focusedStepId: targetStep.id,
                singleStepLoopEnabled: true,
                steps: nextSteps,
              },
            },
          },
        },
        [editableShader.id],
      );
    });

    setEditingTimelineStepId(targetStep.id);
    if (preset.audioReactiveBindings) {
      seedAudioShaderBindings(
        editableShader.id,
        preset.audioReactiveBindings,
      );
    }
    setStudioPreviewOverride(false);
    setPendingTimelineRepeatExit(null);
    clearGeneratedShaderRetry();
    setPreferLiveShaderCompilePreview(false);
    setCompilerError(editableShader.compileError ?? '');
    setStatusMessage(
      action === 'replace-current'
        ? `Replaced the current timeline shader with "${preset.name}".`
        : `Created "${preset.name}" as a new shader in the timeline.`,
    );
    closeMobileShaderDialog();
  };

  const addRandomPresetShader = () => {
    if (!project) {
      return;
    }

    const presetPool = project.studio.savedShaders.filter(
      (shader) => !shader.isTemporary && Boolean(DEFAULT_SHADERS[shader.id]),
    );
    if (presetPool.length === 0) {
      setStatusMessage('No shader presets are available to add.');
      return;
    }

    const differentPresets = presetPool.filter(
      (shader) => shader.id !== project.studio.activeShaderId,
    );
    const candidates = differentPresets.length > 0 ? differentPresets : presetPool;
    const preset = candidates[Math.floor(Math.random() * candidates.length)];
    if (!preset) {
      return;
    }

    applyPresetSelection(preset.id, 'create-new');
  };

  const hasDesktopDialogOpen =
    !isMobile &&
    (isApiSettingsOpen ||
      isAssetLibraryOpen ||
      !!surfaceAsset ||
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

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
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

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, input, select, textarea, a, [contenteditable="true"]')
    ) {
      return;
    }

    const stageElement = event.currentTarget;
    setDesktopStageKeyboardArmed(true);
    window.requestAnimationFrame(() => {
      stageElement.focus();
    });
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
        activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
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
        shaderVersions: preserveShaderVersion(
          currentProject.studio.shaderVersions,
          createShaderVersion(
            'Before restore',
            currentProject.studio.activeShaderName,
            currentProject.studio.activeShaderCode,
          ),
        ),
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

  const openShaderChat = (route: 'chatgpt' | 'perplexity', prompt: string, currentCode: string) => {
    const preparedPrompt = buildExternalChatShaderPrompt(prompt, currentCode);
    const providerUrl = route === 'perplexity' ? 'https://www.perplexity.ai/' : 'https://chatgpt.com/';
    const canvas = document.querySelector<HTMLElement>('.workspace-desktop-stage') ?? stageViewportRef.current;
    return openExternalAiWindow(`${providerUrl}?q=${encodeURIComponent(preparedPrompt)}`, {
      mode: isMobile ? 'tab' : 'auto',
      cover: canvas ?? undefined,
    });
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
    const trimmedPrompt = prompt.trim();
    const historyPrompt = options?.historyPrompt?.trim() || trimmedPrompt;
    if (!trimmedPrompt) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage('Write a shader prompt first, then generate.');
      setStatusMessage('Add a prompt before generating.');
      return;
    }

    setChatSubmission({ shaderId: project.studio.activeShaderId, prompt: historyPrompt, versionIds: project.studio.shaderVersions.map(version => version.id) });
    const aiReady = hasConfiguredShaderAi(project.ai.settings);
    const usingExternalChat =
      aiGenerationRoute === 'chatgpt' || aiGenerationRoute === 'perplexity';
    if (usingExternalChat || !aiReady) {
      const requestId = crypto.randomUUID();
      const pendingRequest: PendingShaderApplyRequest = {
        version: 1,
        requestId,
        sessionId: project.sessionId,
        targetShaderId: project.studio.activeShaderId,
        prompt: trimmedPrompt,
        historyPrompt,
        currentCode: project.studio.activeShaderCode,
        trigger: llmTrigger,
        createdAt: new Date().toISOString(),
      };
      saveProjectDocument(project);
      savePendingShaderApplyRequest(pendingRequest);
      const externalWindowMode = usingExternalChat
        ? openShaderChat(aiGenerationRoute, trimmedPrompt, project.studio.activeShaderCode)
        : null;
      setExternalChatRequest({
        requestId,
        prompt: trimmedPrompt,
        historyPrompt,
        currentCode: project.studio.activeShaderCode,
        targetShaderId: project.studio.activeShaderId,
        trigger: llmTrigger,
        route: aiGenerationRoute,
        externalWindowMode,
      });
      setApiSettingsVariant('setup');
      setIsApiSettingsOpen(!usingExternalChat);
      if (usingExternalChat) setAiPrompt('');
      setAiFeedbackTone('idle');
      setAiFeedbackMessage(
        usingExternalChat
          ? ''
          : aiGenerationRoute === 'local'
            ? 'Choose and download a local model to continue.'
            : 'Connect your cloud API to continue.',
      );
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
    if (targetShaderId !== requestedShaderId) setChatSubmission(current => current?.shaderId === requestedShaderId ? { ...current, shaderId: targetShaderId } : current);
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
          activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
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
            activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
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
                    sourceProfile: OFFICIAL_SHADER_PROFILE,
                    minimumTarget: detectMinimumShaderTarget(nextCode),
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

  const handleApplyExternalChatResponse = async (response: string) => {
    if (!project || !externalChatRequest) {
      throw new Error('Ask Mapshroom for a shader first so it can prepare the matching prompt.');
    }
    if (project.studio.activeShaderId !== externalChatRequest.targetShaderId) {
      throw new Error('Return to the shader you requested before applying this reply.');
    }

    const shaderApplyLink = extractShaderApplyLinkFromText(response);
    if (shaderApplyLink && shaderApplyLink.sessionId !== project.sessionId) {
      throw new Error('That Mapshroom link targets a different project.');
    }
    const nextCode = validateGeneratedShader(
      shaderApplyLink?.code ?? extractGlslCode(response),
      {
        minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
        prompt: externalChatRequest.prompt,
      },
    );
    const targetShaderId = externalChatRequest.targetShaderId;
    const targetShader = project.studio.savedShaders.find(
      (shader) => shader.id === targetShaderId,
    );
    if (!targetShader) {
      throw new Error('The shader you started from is no longer available. Ask again from the current shader.');
    }

    const nextName = parseShaderName(nextCode);
    const validationError = validateShaderCodeCompilation(nextCode);
    const versionId = crypto.randomUUID();

    generatedShaderRetryRef.current[targetShaderId] = {
      sourcePrompt: externalChatRequest.prompt,
      code: nextCode,
      autoRepairUsed: false,
      versionId,
      retryInFlight: false,
    };

    updateProject((currentProject) => {
      if (currentProject.studio.activeShaderId !== targetShaderId) return currentProject;
      return applyExternalShaderCodeToProject(currentProject, {
        targetShaderId: currentProject.studio.activeShaderId,
        prompt: externalChatRequest.prompt,
        historyPrompt: externalChatRequest.historyPrompt,
        currentCode: externalChatRequest.currentCode,
        nextCode,
        validationError,
        versionId,
        activateTarget: true,
      });
    });

    setAiPrompt((currentPrompt) =>
      currentPrompt.trim() === externalChatRequest.prompt ? '' : currentPrompt,
    );
    removePendingShaderApplyRequest(externalChatRequest.requestId);
    setIsApiSettingsOpen(false);
    setExternalChatRequest(null);

    if (validationError) {
      setPreferLiveShaderCompilePreview(true);
      applyCompilerFeedback(validationError);
      setStatusMessage(
        `The pasted shader has GLSL errors. Keeping the previous valid render for ${nextName}.`,
      );
    } else {
      setCompilerError('');
      setPreferLiveShaderCompilePreview(true);
      setAiFeedbackTone('success');
      setAiFeedbackMessage(`Shader pasted from your AI chat and applied: ${nextName}.`);
      setStatusMessage(`Shader updated: ${nextName}`);
    }

    trackLlmRequest({
      provider: 'external_chat',
      runtime: 'chat',
      outcome: 'success',
      trigger: externalChatRequest.trigger,
    });
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
      recordedPrompt: originalPrompt,
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
              activeShaderSourceProfile: OFFICIAL_SHADER_PROFILE,
              uniformValues: nextUniformValues,
              shaderVersions: nextShaderVersions,
              savedShaders: currentProject.studio.savedShaders.map((shader) =>
                shader.id === activeShaderId
                  ? {
                      ...shader,
                      name: nextName,
                      code: nextCode,
                      sourceProfile: OFFICIAL_SHADER_PROFILE,
                      minimumTarget: detectMinimumShaderTarget(nextCode),
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
Use GLSL ES 3.00 syntax for WebGL 2 and sample textures with texture().
Do not include #version 300 es because Mapshroom injects it.

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

  const publishProjectToOutput = () => {
    if (!project) {
      return;
    }
    sessionSyncRef.current?.publish(project);
  };

  const handleOutputWindowOpen = () => {
    if (!project) {
      return;
    }

    const result = openOutputWindow({
      sessionId: project.sessionId,
      existingWindow: outputWindowRef.current,
    });

    if (!result.popup) {
      setStatusMessage(result.message);
      return;
    }

    outputWindowRef.current = result.popup;
    setOutputWindowOpen(true);
    publishProjectToOutput();
    window.setTimeout(publishProjectToOutput, 200);
    window.setTimeout(publishProjectToOutput, 800);
    setStatusMessage(result.message);
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
      const credentialProvider = providerForAiKeyField(field);

      if (credentialProvider && isTauri()) {
        try {
          if (storageKey) localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn('Unable to clear legacy AI key preference.', error);
        }
        void persistCloudApiKey(credentialProvider, value)
          .then((storedMarker) => {
            updateProject((currentProject) => {
              const nextSettings = {
                ...currentProject.ai.settings,
                [field]: storedMarker,
              };
              trackApiPresence(getAnalyticsAiPresence(nextSettings));
              return {
                ...currentProject,
                ai: {
                  settings: nextSettings,
                },
              };
            });
          })
          .catch((error: unknown) => {
            console.warn('Unable to persist desktop credential.', error);
          });
        return;
      }

      if (storageKey) {
        try {
          if (value) localStorage.setItem(storageKey, value);
          else localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn('Unable to persist AI key preference.', error);
        }
      }
    }

    updateProject((currentProject) => {
      const nextSettings = {
        ...currentProject.ai.settings,
        [field]: value,
      };
      trackApiPresence(getAnalyticsAiPresence(nextSettings));
      return {
        ...currentProject,
        ai: {
          settings: nextSettings,
        },
      };
    });
  };

  const handleAiGenerationRouteChange = (route: AiGenerationRoute) => {
    setAiGenerationRoute(route);
    storeAiGenerationRoute(route);
    updateAiSetting(
      'shaderRuntime',
      route === 'api' ? 'api' : route === 'local' ? 'local' : 'chat',
    );
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

  useEffect(() => {
    if (!isMobile || !showOnboardingGuide) {
      return;
    }

    setMobilePanel(null);
    setIsMobileTimelineOpen(false);
    if (uiPreferences.mobileUiMode !== 'full') {
      updateMobileUiMode('full');
    }
  }, [isMobile, showOnboardingGuide, uiPreferences.mobileUiMode]);

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
      persistenceDisabledRef.current = true;
      autosave.stop();
      await autosave.flush();
      currentProjectRef.current = null;
      await clearPersistedSiteData();
      window.location.reload();
    } catch (error) {
      console.warn('Unable to clear local site data.', error);
      persistenceDisabledRef.current = false;
      currentProjectRef.current = project;
      autosave.start();
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

  const handleMobileAddShader = () => {
    setMobilePanel(null);
    setIsMobileTimelineOpen(false);
    setIsPresetBrowserOpen(true);
  };

  const handleMobileAddRandomShader = () => {
    addRandomPresetShader();
    setMobilePanel('studio');
    updateMobileUiMode('full');
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
    if (panel === 'sliders' && !editingTimelineStepId) {
      const shaderSequence = project?.timeline.stub.shaderSequence;
      const playbackSteps = project
        ? getEffectiveTimelinePlaybackSteps({
            mode: shaderSequence?.mode ?? 'sequence',
            randomChoiceEnabled: shaderSequence?.randomChoiceEnabled ?? false,
            steps: shaderSequence?.steps ?? [],
            sharedSectionDurationSeconds: shaderSequence?.sharedSectionDurationSeconds ?? 8,
            sharedTransitionEnabled: shaderSequence?.sharedTransitionEnabled ?? false,
            sharedTransitionDurationSeconds: shaderSequence?.sharedTransitionDurationSeconds ?? .75,
            pinnedStepId: shaderSequence?.pinnedStepId ?? null,
          }).filter(isTimelineStepEnabled)
        : [];
      const currentTimelineState = project && shaderSequence
        ? resolveShaderTimelineState({
            shaders: project.studio.savedShaders,
            mode: shaderSequence.mode,
            focusedStepId: shaderSequence.focusedStepId,
            singleStepLoopEnabled: false,
            randomChoiceEnabled: shaderSequence.randomChoiceEnabled,
            sharedTransitionEnabled: shaderSequence.sharedTransitionEnabled,
            sharedTransitionEffect: shaderSequence.sharedTransitionEffect,
            sharedTransitionDurationSeconds: shaderSequence.sharedTransitionDurationSeconds,
            sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds,
            steps: playbackSteps,
            timeSeconds: getTransportTimeSeconds(project.playback.transport),
            loop: project.playback.transport.loop,
            randomSeedSalt: shaderSequence.randomSeedToken || project.sessionId,
          })
        : null;
      const stepToEdit =
        shaderSequence?.steps.find((step) => step.id === currentTimelineState?.currentStep.id) ??
        shaderSequence?.steps.find((step) => step.id === shaderSequence.focusedStepId && !step.disabled) ??
        shaderSequence?.steps.find((step) => !step.disabled) ??
        null;
      if (stepToEdit) {
        void selectTimelineStepForEditing(stepToEdit.id, {
          focusStudioOnMobile: false,
          stagePreviewMode: 'focused',
          seekTimeSeconds: project
            ? getTimelineRepeatSeekTime(
                project,
                stepToEdit.id,
                currentTimelineState?.localTimeSeconds ?? 0,
              )
            : 0,
          preserveRenderTimeOnSeek: true,
        });
      }
    }
    setMobilePanel(panel);
  };

  const requestTimelineAssetPicker = useCallback((stepId: string) => {
    setAssetLibraryStepId(stepId);
    setIsAssetLibraryOpen(true);
  }, []);

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
      preserveRenderTimeOnSeek?: boolean;
      selectionTransition?: 'mix' | 'cut';
      showRepeatTip?: boolean;
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

      const sourceShader = getProjectTimelineShaders(currentProject).find(
        (shader) => shader.id === step.shaderId,
      );
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
      const nextStagePreviewMode =
        options?.stagePreviewMode ??
        currentProject.timeline.stub.shaderSequence.stagePreviewMode;

      nextStatusMessage = isOwnedDraft
        ? `Editing linked shader for timeline step ${stepIndex + 1}.`
        : `Linked timeline step ${stepIndex + 1} to its own editable shader.`;
      nextCompilerError = editableShader.compileError ?? '';

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
                stagePreviewMode: nextStagePreviewMode,
                focusedStepId: stepId,
                singleStepLoopEnabled: nextStagePreviewMode === 'focused',
                manualSelectionTransition: options?.selectionTransition ?? 'mix',
                steps: nextSteps,
              },
            },
          },
          playback:
            isMobile
              ? {
                  ...currentProject.playback,
                  transport: playTransport(
                    options?.seekTimeSeconds !== undefined &&
                    options.seekTimeSeconds !== null
                      ? options.preserveRenderTimeOnSeek
                        ? seekTransportPreservingRenderTime(
                            currentProject.playback.transport,
                            options.seekTimeSeconds,
                          )
                        : seekTransport(
                            currentProject.playback.transport,
                            options.seekTimeSeconds,
                          )
                      : currentProject.playback.transport,
                  ),
                }
              : options?.seekTimeSeconds !== undefined && options.seekTimeSeconds !== null
              ? {
                  ...currentProject.playback,
                  transport: options.preserveRenderTimeOnSeek
                    ? seekTransportPreservingRenderTime(
                        currentProject.playback.transport,
                        options.seekTimeSeconds,
                      )
                    : seekTransport(
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
    setPendingTimelineRepeatExit(null);
    setEditingTimelineStepId(stepId);

    if (isMobile && options?.focusStudioOnMobile !== false) {
      updateMobileUiMode('full');
      setMobilePanel('studio');
      setIsMobileTimelineOpen(false);
    }

    if (nextStatusMessage && !options?.suppressStatus) {
      setStatusMessage(nextStatusMessage);
    }

    if (
      didSelectStep &&
      options?.stagePreviewMode === 'focused' &&
      options.showRepeatTip !== false &&
      !isMobile &&
      !outputWindowOpen &&
      uiPreferences.chromeVisible &&
      !showOnboardingGuide &&
      !isRepeatFocusFirstStepDismissed()
    ) {
      setRepeatFocusFirstStepVisible(true);
    }

    return didSelectStep;
  }

  const handleTimelineEditStep = useCallback((stepId: string) => {
    void selectTimelineStepForEditing(stepId, {
      stagePreviewMode: 'focused',
      seekTimeSeconds: project
        ? getTimelineRepeatSeekTime(project, stepId)
        : 0,
      preserveRenderTimeOnSeek: true,
    });
  }, [project, selectTimelineStepForEditing]);

  const handleMobileEditingStepOffset = useCallback((offset: number) => {
    const steps = project?.timeline.stub.shaderSequence.steps.filter((step) => !step.disabled) ?? [];
    if (!steps.length) return;

    const currentStepId =
      editingTimelineStepId ?? project?.timeline.stub.shaderSequence.focusedStepId ?? steps[0]?.id;
    const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));
    const nextIndex = (currentIndex + offset + steps.length) % steps.length;
    const nextStep = steps[nextIndex];
    if (!nextStep) return;

    void selectTimelineStepForEditing(nextStep.id, {
      focusStudioOnMobile: false,
      stagePreviewMode: 'focused',
      seekTimeSeconds: project
        ? getTimelineRepeatSeekTime(project, nextStep.id)
        : 0,
      preserveRenderTimeOnSeek: true,
    });
    setStatusMessage(`Editing shader ${nextIndex + 1} of ${steps.length}.`);
  }, [editingTimelineStepId, project, selectTimelineStepForEditing]);

  const handleMobileShaderCardEdit = useCallback((stepId: string) => {
    handleTimelineEditStep(stepId);
    setMobilePanel(null);
    updateMobileUiMode('bar');
  }, [handleTimelineEditStep, updateMobileUiMode]);

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

  useEffect(() => {
    if (!repeatFocusFirstStepVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissRepeatFocusFirstStepPermanently();
        setRepeatFocusFirstStepVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [repeatFocusFirstStepVisible]);

  if (!project) {
    return null;
  }

  const stageTransform = project.mapping.stageTransform;
  const workspacePreviewStageTransform = isMobile
    ? stageTransform
    : {
        ...DEFAULT_STAGE_TRANSFORM,
        referenceAspectRatio: stageTransform.referenceAspectRatio,
        distortion: stageTransform.distortion,
        distortMode: stageTransform.distortMode,
      };
  const mobileUiMode = uiPreferences.mobileUiMode;
  const mobileChromeVisible = mobileUiMode !== 'hidden';
  const stageControlsVisible = isMobile
    ? mobileUiMode === 'full' && stageTransform.moveMode
    : uiPreferences.chromeVisible && stageTransform.moveMode;
  const timelineStub = project.timeline.stub;
  const timelineSelectableShaders = getProjectTimelineShaders(project);
  const timelineSequenceEnabled = timelineStub.shaderSequence.steps.length > 0;
  const timelineFocusedPreviewActive =
    timelineStub.shaderSequence.stagePreviewMode === 'focused' &&
    (isMobile ? editingTimelineStepId !== null : timelineSequenceEnabled);
  const workspaceStageMirrorsOutput =
    outputWindowOpen && !isMobile && !timelineFocusedPreviewActive;
  const desktopTimelineFocusedPreviewActive =
    !isMobile &&
    !workspaceStageMirrorsOutput &&
    timelineFocusedPreviewActive &&
    pendingTimelineRepeatExit === null;
  const dismissRepeatFocusFirstStep = () => {
    dismissRepeatFocusFirstStepPermanently();
    setRepeatFocusFirstStepVisible(false);
  };
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

  const timelineDurationSeconds = timelineSequenceEnabled
    ? getShaderTimelineDuration(timelinePlaybackSteps)
      : activeAsset?.kind === 'video' && activeAssetDurationSeconds
      ? activeAssetDurationSeconds
      : timelineStub.durationSeconds;
  const mobileTimelineState = isMobile && timelineSequenceEnabled
    ? timelineStub.shaderSequence.mode === 'audioReactive'
      ? resolveAudioReactiveTimelineState({
          shaders: timelineSelectableShaders,
          steps: timelinePlaybackSteps,
          section: audioReactivity.uiFrame.section,
          nowEpochMs: performance.timeOrigin + audioReactivity.uiFrame.updatedAt,
          transitionEffect: timelineStub.shaderSequence.sharedTransitionEffect,
          transitionDurationSeconds:
            timelineStub.shaderSequence.sharedTransitionDurationSeconds,
          focusedStepId: timelineStub.shaderSequence.focusedStepId,
          singleStepLoopEnabled:
            timelineStub.shaderSequence.singleStepLoopEnabled,
        })
      : resolveShaderTimelineState({
          shaders: timelineSelectableShaders,
          mode: timelineStub.shaderSequence.mode,
          focusedStepId: timelineStub.shaderSequence.focusedStepId,
          singleStepLoopEnabled: timelineStub.shaderSequence.singleStepLoopEnabled,
          randomChoiceEnabled: timelineStub.shaderSequence.randomChoiceEnabled,
          sharedTransitionEnabled: timelineStub.shaderSequence.sharedTransitionEnabled,
          sharedTransitionEffect: timelineStub.shaderSequence.sharedTransitionEffect,
          sharedTransitionDurationSeconds:
            timelineStub.shaderSequence.sharedTransitionDurationSeconds,
          sharedSectionDurationSeconds:
            timelineStub.shaderSequence.sharedSectionDurationSeconds,
          steps: timelinePlaybackSteps,
          timeSeconds: getTransportTimeSeconds(project.playback.transport),
          loop: project.playback.transport.loop,
          randomSeedSalt: timelineStub.shaderSequence.randomSeedToken || project.sessionId,
        })
    : null;
  const resolveCurrentAudioTimelineState = () =>
    resolveAudioReactiveTimelineState({
      shaders: timelineSelectableShaders,
      steps: timelinePlaybackSteps,
      section: audioReactivity.uiFrame.section,
      nowEpochMs: Date.now(),
      transitionEffect: timelineStub.shaderSequence.sharedTransitionEffect,
      transitionDurationSeconds:
        timelineStub.shaderSequence.sharedTransitionDurationSeconds,
      focusedStepId: timelineStub.shaderSequence.focusedStepId,
      singleStepLoopEnabled:
        timelineStub.shaderSequence.singleStepLoopEnabled,
    });
  const resolveCurrentPlaybackStepId = () => {
    if (editingTimelineStepId) {
      return editingTimelineStepId;
    }

    if (
      timelineStub.shaderSequence.stagePreviewMode === 'focused' &&
      timelineStub.shaderSequence.focusedStepId
    ) {
      return timelineStub.shaderSequence.focusedStepId;
    }

    if (timelineStub.shaderSequence.mode === 'audioReactive') {
      return resolveCurrentAudioTimelineState()?.currentStep.id ?? null;
    }

    return resolveShaderTimelineState({
      shaders: timelineSelectableShaders,
      mode: timelineStub.shaderSequence.mode,
      focusedStepId: timelineStub.shaderSequence.focusedStepId,
      singleStepLoopEnabled: false,
      randomChoiceEnabled: timelineStub.shaderSequence.randomChoiceEnabled,
      sharedTransitionEnabled: timelineStub.shaderSequence.sharedTransitionEnabled,
      sharedTransitionEffect: timelineStub.shaderSequence.sharedTransitionEffect,
      sharedTransitionDurationSeconds:
        timelineStub.shaderSequence.sharedTransitionDurationSeconds,
      sharedSectionDurationSeconds: timelineStub.shaderSequence.sharedSectionDurationSeconds,
      steps: timelinePlaybackSteps,
      timeSeconds: getTransportTimeSeconds(project.playback.transport),
      loop: project.playback.transport.loop,
      randomSeedSalt: timelineStub.shaderSequence.randomSeedToken || project.sessionId,
    })?.currentStep.id ?? null;
  };
  const handlePlaybackFocusToggle = () => {
    if (pendingTimelineRepeatExit) {
      setPendingTimelineRepeatExit(null);
      setStatusMessage('Highlighted shader repeat will continue.');
      return;
    }

    if (
      timelineStub.shaderSequence.singleStepLoopEnabled ||
      timelineStub.shaderSequence.stagePreviewMode === 'focused'
    ) {
      if (timelineStub.shaderSequence.mode === 'audioReactive') {
        setEditingTimelineStepId(null);
        setStudioPreviewOverride(false);
        updateProject((currentProject) => ({
          ...currentProject,
          timeline: {
            stub: {
              ...currentProject.timeline.stub,
              shaderSequence: {
                ...currentProject.timeline.stub.shaderSequence,
                stagePreviewMode: 'timeline',
                singleStepLoopEnabled: false,
              },
            },
          },
        }));
        setStatusMessage(
          'Audio Reactive resumed from the latest detected music section.',
        );
        return;
      }

      const exitPlan = getTimelineRepeatExitPlan(project);
      if (!exitPlan) {
        return;
      }

      setPendingTimelineRepeatExit(exitPlan);
      setStatusMessage(
        project.playback.transport.isPlaying
          ? 'Finishing the highlighted shader, then continuing the timeline.'
          : 'Timeline will continue after the highlighted shader when playback resumes.',
      );
      return;
    }

    const currentTimelineState =
      timelineStub.shaderSequence.mode === 'audioReactive'
        ? resolveCurrentAudioTimelineState()
        : resolveProjectTimelineState(project, false);
    if (!currentTimelineState) {
      return;
    }

    const repeatTimeSeconds = getTimelineRepeatSeekTime(
      project,
      currentTimelineState.currentStep.id,
      currentTimelineState.localTimeSeconds,
    );
    void selectTimelineStepForEditing(currentTimelineState.currentStep.id, {
      focusStudioOnMobile: false,
      stagePreviewMode: 'focused',
      seekTimeSeconds:
        timelineStub.shaderSequence.mode === 'audioReactive'
          ? null
          : repeatTimeSeconds,
      preserveRenderTimeOnSeek: true,
    });
    setStatusMessage(
      timelineStub.shaderSequence.mode === 'audioReactive'
        ? 'Holding the selected shader. Disable repeat to resume music-driven changes.'
        : 'Repeating the highlighted shader while its animation keeps running.',
    );
  };
  const handlePlaybackStepOffset = (offset: -1 | 1) => {
    if (isMobile && editingTimelineStepId) {
      handleMobileEditingStepOffset(offset);
      return;
    }

    if (playableTimelineSteps.length < 2) {
      return;
    }

    const currentStepId = resolveCurrentPlaybackStepId();
    const currentIndex = Math.max(
      0,
      playableTimelineSteps.findIndex((step) => step.id === currentStepId),
    );
    const nextIndex =
      (currentIndex + offset + playableTimelineSteps.length) % playableTimelineSteps.length;
    const nextStep = playableTimelineSteps[nextIndex];
    if (!nextStep) {
      return;
    }

    const nextTimeSeconds = playableTimelineSteps
      .slice(0, nextIndex)
      .reduce(
        (totalSeconds, step) =>
          totalSeconds + clampTimelineStepDuration(step.durationSeconds),
        0,
      );

    if (
      timelineStub.shaderSequence.singleStepLoopEnabled ||
      timelineStub.shaderSequence.stagePreviewMode === 'focused' ||
      timelineStub.shaderSequence.mode === 'audioReactive'
    ) {
      void selectTimelineStepForEditing(nextStep.id, {
        focusStudioOnMobile: false,
        stagePreviewMode: 'focused',
        seekTimeSeconds:
          timelineStub.shaderSequence.mode === 'audioReactive'
            ? null
            : nextTimeSeconds,
        preserveRenderTimeOnSeek: true,
      });
      setStatusMessage(
        timelineStub.shaderSequence.mode === 'audioReactive'
          ? `${offset > 0 ? 'Next' : 'Previous'} audio shader held: ${nextIndex + 1} of ${playableTimelineSteps.length}.`
          : `${offset > 0 ? 'Next' : 'Previous'} repeated shader: ${nextIndex + 1} of ${playableTimelineSteps.length}.`,
      );
      return;
    }

    updateProject((currentProject) => {
      const currentSequence = currentProject.timeline.stub.shaderSequence;
      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentSequence,
              focusedStepId: nextStep.id,
            },
          },
        },
        playback:
          currentSequence.stagePreviewMode === 'timeline'
            ? {
                ...currentProject.playback,
                transport: seekTransport(
                  currentProject.playback.transport,
                  nextTimeSeconds,
                ),
              }
            : currentProject.playback,
      };
    });
    setStatusMessage(
      `${offset > 0 ? 'Next' : 'Previous'} shader: ${nextIndex + 1} of ${playableTimelineSteps.length}.`,
    );
  };
  const activeShaderRecord =
    project.studio.savedShaders.find((shader) => shader.id === project.studio.activeShaderId) ?? null;
  const presetReplacementStep = getCurrentPresetReplacementStep(project, editingTimelineStepId);
  const presetReplacementShader = presetReplacementStep
    ? project.studio.savedShaders.find(
        (shader) => shader.id === presetReplacementStep.shaderId,
      ) ?? null
    : null;
  const presetReplacementShaderName =
    presetReplacementShader?.name ?? project.studio.activeShaderName;
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

  const handlePasteShaderFromClipboard = async () => {
    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) {
        throw new Error('The clipboard is empty.');
      }
      const shaderApplyLink = extractShaderApplyLinkFromText(clipboardText);
      const nextCode = validateGeneratedShader(
        shaderApplyLink?.code ?? extractGlslCode(clipboardText),
      );
      clearGeneratedShaderRetry();
      setCompilerError('');
      setPreferLiveShaderCompilePreview(true);
      setShaderCompileNonce((currentValue) => currentValue + 1);
      const timelineStepId = editingTimelineStepId;
      updateProject((currentProject) =>
        applyPastedShaderCodeToProject(currentProject, {
          nextCode,
          timelineStepId,
        }),
      );
      setStudioPreviewOverride(false);
      if (!timelineStepId) {
        setEditingTimelineStepId(null);
      }
      const shaderName = parseShaderName(nextCode);
      setAiFeedbackTone('success');
      setAiFeedbackMessage(`Shader pasted and saved: ${shaderName}.`);
      setStatusMessage(`Pasted shader saved as "${shaderName}".`);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Clipboard access was blocked. Copy a shader, then try again.';
      setAiFeedbackTone('error');
      setAiFeedbackMessage(message);
      setStatusMessage(message);
      return false;
    }
  };

  const handlePastePositionFromClipboard = async () => {
    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) {
        throw new Error('The clipboard is empty.');
      }
      const importError = applyMappingPositionSource(clipboardText, 'clipboard');
      if (importError) {
        throw new Error(importError);
      }
      setAiFeedbackTone('success');
      setAiFeedbackMessage('Mapping position pasted and applied.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Clipboard access was blocked. Copy a position JSON, then try again.';
      setAiFeedbackTone('error');
      setAiFeedbackMessage(message);
      setStatusMessage(message);
    }
  };

  const handlePromptFocus = () => {
    if (!timelineSequenceEnabled) {
      return;
    }

    const sequence = project.timeline.stub.shaderSequence;
    const repeatAlreadyActive =
      sequence.stagePreviewMode === 'focused' &&
      sequence.singleStepLoopEnabled &&
      sequence.focusedStepId === editingTimelineStepId &&
      pendingTimelineRepeatExit === null;
    if (repeatAlreadyActive) {
      return;
    }

    if (pendingTimelineRepeatExit) {
      setPendingTimelineRepeatExit(null);
    }

    const currentTimelineState =
      sequence.mode === 'audioReactive'
        ? resolveCurrentAudioTimelineState()
        : resolveProjectTimelineState(project, false);
    if (!currentTimelineState) {
      return;
    }

    const repeatTimeSeconds = getTimelineRepeatSeekTime(
      project,
      currentTimelineState.currentStep.id,
      currentTimelineState.localTimeSeconds,
    );
    void selectTimelineStepForEditing(currentTimelineState.currentStep.id, {
      stagePreviewMode: 'focused',
      seekTimeSeconds:
        sequence.mode === 'audioReactive' ? null : repeatTimeSeconds,
      preserveRenderTimeOnSeek: true,
    });
    setStatusMessage(
      'Repeating and editing the current shader. Use the red repeat button to return to the full sequence.',
    );
  };

  const handleUniformInteractionStart = () => {
    if (!timelineSequenceEnabled) return;
    const sequence = project.timeline.stub.shaderSequence;
    // The controls describe the studio shader, which may differ from the playing step.
    const displayedStep = sequence.steps.find((step) =>
      step.id === editingTimelineStepId && step.shaderId === project.studio.activeShaderId,
    ) ?? sequence.steps.find((step) => step.shaderId === project.studio.activeShaderId);
    if (!displayedStep || (
      sequence.stagePreviewMode === 'focused' && sequence.singleStepLoopEnabled &&
      sequence.focusedStepId === displayedStep.id && pendingTimelineRepeatExit === null
    )) return;
    selectTimelineStepForEditing(displayedStep.id, {
      stagePreviewMode: 'focused',
      selectionTransition: 'cut',
      focusStudioOnMobile: false,
      suppressStatus: true,
      showRepeatTip: false,
    });
  };

  const useDesktopPaneLayout =
    !isMobile && uiPreferences.chromeVisible && uiPreferences.workspaceMode !== 'immersive';
  const timelineEditingInDesktopPane =
    useDesktopPaneLayout && editingTimelineStepId !== null;

  const aiPanel = (
    <AiPanel
      compact
      onCopyPrompt={() => navigator.clipboard.writeText(buildExternalChatShaderPrompt(aiPrompt, project.studio.activeShaderCode))}
      prompt={aiPrompt}
      selectedRoute={aiGenerationRoute}
      aiLoading={aiLoading}
      feedbackMessage={aiFeedbackMessage}
      feedbackTone={aiFeedbackTone}
      shaderError={compilerError}
      onPromptChange={setAiPrompt}
      onPromptFocus={handlePromptFocus}
      onRouteChange={handleAiGenerationRouteChange}
      onPasteShader={handlePasteShaderFromClipboard}
      onPastePosition={handlePastePositionFromClipboard}
      onSubmit={() => {
        void handleShaderMutation(aiPrompt);
      }}
      onFixError={handleFixError}
    />
  );

  const renderChatWorkspace = (codePanel: ReactNode, historyPanel: ReactNode) => (
    <ShaderChatWorkspace
      shaderCode={project.studio.activeShaderCode}
      versions={project.studio.shaderVersions}
      chatHistory={project.studio.shaderChatHistory}
      pendingPrompt={chatSubmission?.shaderId === project.studio.activeShaderId && !project.studio.shaderVersions.some(version => !chatSubmission.versionIds.includes(version.id)) ? chatSubmission.prompt : undefined}
      handoff={externalChatRequest?.targetShaderId === project.studio.activeShaderId &&
        (externalChatRequest.route === 'chatgpt' || externalChatRequest.route === 'perplexity') ? (
          <ShaderChatHandoff
            key={externalChatRequest.requestId}
            provider={externalChatRequest.route === 'perplexity' ? 'Perplexity' : 'ChatGPT'}
            blocked={externalChatRequest.externalWindowMode === 'blocked'}
            onOpenChat={() => {
              const externalWindowMode = openShaderChat(externalChatRequest.route === 'perplexity' ? 'perplexity' : 'chatgpt', externalChatRequest.prompt, externalChatRequest.currentCode);
              setExternalChatRequest(current => current?.requestId === externalChatRequest.requestId ? { ...current, externalWindowMode } : current);
            }}
            onApplyCode={handleApplyExternalChatResponse}
          />
        ) : null}
      loading={aiLoading}
      feedback={!chatSubmission || chatSubmission.shaderId === project.studio.activeShaderId ? aiFeedbackMessage : ''}
      feedbackTone={aiFeedbackTone}
      composer={aiPanel}
      codePanel={codePanel}
      historyPanel={historyPanel}
      onRestore={restoreShaderVersion}
      onNewChat={() => {
        setAiPrompt('');
        setChatSubmission(null);
        setAiFeedbackMessage('');
        if (externalChatRequest?.targetShaderId === project.studio.activeShaderId) {
          removePendingShaderApplyRequest(externalChatRequest.requestId);
          setExternalChatRequest(null);
        }
        updateProject(currentProject => applyActiveShaderPatch(currentProject, { shaderChatHistory: [] }));
      }}
      onSuggest={value => {
        handlePromptFocus();
        setAiPrompt(value);
        window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.shader-chat-workspace .prompt-field')?.focus());
      }}
      onRetry={value => { setAiPrompt(value); void handleShaderMutation(value); }}
    />
  );

  const showDesktopSlidersWindow =
    !isMobile && uiPreferences.chromeVisible && uiPreferences.desktopSlidersWindowEnabled;
  const externalChatPasteSource =
    externalChatRequest &&
    externalChatRequest.targetShaderId === project.studio.activeShaderId
      ? externalChatRequest.route === 'perplexity'
        ? 'Perplexity'
        : externalChatRequest.route === 'chatgpt'
          ? 'ChatGPT'
          : undefined
      : undefined;

  const studioPanel = (
    <StudioPanel
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      randomizationKey={`${project.sessionId}:${project.studio.activeShaderId}`}
      audioShaderId={project.studio.activeShaderId}
      audioShaderCode={project.studio.activeShaderCode}
      audioReactivity={audioReactivity}
      uniformDefinitions={uniformDefinitions}
      uniformValues={project.studio.uniformValues}
      uniformRuntime={uniformRuntime}
      onUniformInteractionStart={handleUniformInteractionStart}
      onUniformChange={handleUniformChange}
      onUniformValuesChange={handleUniformValuesChange}
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
      onPasteCode={handlePasteShaderFromClipboard}
      pasteCodeSuggested={Boolean(externalChatPasteSource)}
      pasteCodeSource={externalChatPasteSource}
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
      showUniformPanel={!showDesktopSlidersWindow}
      timelineSelection={timelineSelectionInfo}
    />
  );

  const desktopSliderPanel = (
    <UniformPanel
      title={
        timelineEditingInDesktopPane
          ? `Editing · ${project.studio.activeShaderName}`
          : showDesktopSlidersWindow
            ? 'Sliders Window'
            : 'Sliders'
      }
      randomizationKey={`${project.sessionId}:${project.studio.activeShaderId}`}
      audioShaderId={project.studio.activeShaderId}
      audioShaderCode={project.studio.activeShaderCode}
      audioReactivity={audioReactivity}
      uniformDefinitions={uniformDefinitions}
      uniformValues={project.studio.uniformValues}
      uniformRuntime={uniformRuntime}
      onInteractionStart={handleUniformInteractionStart}
      onUniformChange={handleUniformChange}
      onUniformValuesChange={handleUniformValuesChange}
      newUniformName={newUniformName}
      onNewUniformNameChange={setNewUniformName}
      onQuickAddUniform={() => {
        void handleUniformQuickAdd();
      }}
    />
  );
  const desktopSlidersPanel = desktopSliderPanel;

  const mobileShaderToolsPanel = (
    <ShaderStudioControlsSection
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      onBrowsePresets={() => setIsPresetBrowserOpen(true)}
      timelineSelection={timelineSelectionInfo}
      hideCurrentShader
    />
  );

  const assetLibraryStep = assetLibraryStepId
    ? timelineStub.shaderSequence.steps.find(step => step.id === assetLibraryStepId) ?? null
    : null;
  const assetLibraryShader = assetLibraryStep
    ? project.studio.savedShaders.find(shader => shader.id === assetLibraryStep.shaderId) ?? null
    : null;

  const mobileShaderPanel = (
    <div className="mobile-shader-workspace">
      <ShaderTimelineEditor
        assets={project.library.assets}
        assetKind={activeAsset?.kind ?? null}
        assetUrl={activeAssetUrl}
        savedShaders={timelineSelectableShaders}
        activeShaderId={project.studio.activeShaderId}
        editingStepId={editingTimelineStepId}
        activeStepId={mobileTimelineState?.currentStep.id ?? null}
        transitionStepId={mobileTimelineState?.nextStep?.id ?? null}
        pinnedStepId={pinnedTimelineStepId}
        sequence={timelineStub.shaderSequence}
        audioReactiveAvailable={audioReactivity.preferences.modeEnabled}
        audioReactiveListening={audioReactivity.status === 'listening'}
        totalDurationSeconds={timelineDurationSeconds}
        onModeChange={handleTimelineSequenceModeChange}
        onSharedTransitionChange={handleTimelineSharedTransitionChange}
        onStepChange={handleTimelineStepChange}
        onRandomizeStep={handleRandomizeTimelineStep}
        onPinnedStepToggle={handleTimelinePinnedStepToggle}
        onBrowseAssets={requestTimelineAssetPicker}
        onDropImage={(transfer, stepId) => { void handleImageTransfer(transfer, stepId); }}
        onDuplicateStep={handleTimelineDuplicateStep}
        onRemoveStep={handleTimelineRemoveStep}
        onReorderSteps={handleTimelineReorderSteps}
        onEditStep={handleMobileShaderCardEdit}
        onAddStep={handleMobileAddShader}
        onAddRandomStep={handleMobileAddRandomShader}
        mobileCardsOnly
      />
      {mobileShaderToolsPanel}
      {renderChatWorkspace(<ShaderCodeSection
        fillAvailableSpace
        shaderCode={project.studio.activeShaderCode}
        onShaderCodeChange={handleActiveShaderCodeChange}
        compilerError={compilerError}
        aiLoading={aiLoading}
        onFixError={handleFixError}
        onReloadShaderCode={reloadShaderCode}
        onPasteCode={handlePasteShaderFromClipboard}
        pasteCodeSuggested={Boolean(externalChatPasteSource)}
        pasteCodeSource={externalChatPasteSource}
      />, <ShaderVersionTrailSection versions={project.studio.shaderVersions} onRestoreVersion={restoreShaderVersion} />)}
    </div>
  );

  const desktopCodePanel = (
    <ShaderCodeSection
      fillAvailableSpace
      shaderCode={project.studio.activeShaderCode}
      onShaderCodeChange={handleActiveShaderCodeChange}
      compilerError={compilerError}
      aiLoading={aiLoading}
      onFixError={handleFixError}
      onReloadShaderCode={reloadShaderCode}
      onPasteCode={handlePasteShaderFromClipboard}
      pasteCodeSuggested={Boolean(externalChatPasteSource)}
      pasteCodeSource={externalChatPasteSource}
    />
  );

  const desktopHistoryPanel = (
    <ShaderVersionTrailSection
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
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
      onOpenProBeta={() => setProBetaSource('asset_generate')}
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

      audioReactiveAvailable={audioReactivity.preferences.modeEnabled}
      audioReactiveListening={audioReactivity.status === 'listening'}
      audioRuntime={audioReactivity.runtime}
      transportControls={
        !isMobile && uiPreferences.chromeVisible ? (
          <PlaybackControls
            canNavigate={playableTimelineSteps.length > 1}
            hasTimeline={timelineSequenceEnabled}
            isTimelinePlaying={project.playback.transport.isPlaying}
            isRepeatEnabled={
              timelineStub.shaderSequence.singleStepLoopEnabled &&
              pendingTimelineRepeatExit === null
            }
            showRepeatFirstStep={
              repeatFocusFirstStepVisible && desktopTimelineFocusedPreviewActive
            }
            onPrevious={() => handlePlaybackStepOffset(-1)}
            onRepeatToggle={handlePlaybackFocusToggle}
            onRepeatFirstStepDismiss={dismissRepeatFocusFirstStep}
            onNext={() => handlePlaybackStepOffset(1)}
          />
        ) : null
      }

      onPlayToggle={handlePlayToggle}
      onSequenceModeChange={handleTimelineSequenceModeChange}
      onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
      onSequenceStepChange={handleTimelineStepChange}
      onRandomizeSequenceStep={handleRandomizeTimelineStep}
      onSequencePinnedStepToggle={handleTimelinePinnedStepToggle}
      onBrowseSequenceAssets={requestTimelineAssetPicker}
      onDropSequenceImage={(transfer, stepId) => { void handleImageTransfer(transfer, stepId); }}
      onDuplicateSequenceStep={handleTimelineDuplicateStep}
      onRemoveSequenceStep={handleTimelineRemoveStep}
      onEditSequenceStep={handleTimelineEditStep}
      onAddSequenceStep={createNewShader}
      onAddRandomSequenceStep={addRandomPresetShader}
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

  const desktopMainTopGridTemplateColumns = uiPreferences.sidebarVisible
    ? `${desktopLayout.leftSidebarWidth}px 10px minmax(0, 1fr) 10px ${desktopLayout.rightSidebarWidth}px`
    : `minmax(0, 1fr) 10px ${desktopLayout.rightSidebarWidth}px`;

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
      {...stageImageDropProps()}
    >
      <TimelineStageRenderer
        asset={activeAsset}
        assets={project.library.assets}
        assetUrl={activeAssetUrl}
        assetUrlStatus={activeAssetResolution.status}
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
        uniformRuntime={uniformRuntime}
        audioBindingsByShaderId={
          audioReactivity.preferences.modeEnabled
            ? audioReactivity.preferences.bindingsByShaderId
            : undefined
        }
        audioRuntime={audioReactivity.runtime}
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline.stub}
        pinnedStepId={pinnedTimelineStepId}
        shaderCompileNonce={shaderCompileNonce}
        stageTransform={workspacePreviewStageTransform}
        transport={project.playback.transport}
        forceActiveShaderPreview={
          !workspaceStageMirrorsOutput &&
          studioPreviewOverride
        }
        focusedPreviewStepId={editingTimelineStepId}
        focusedPreviewIndicatorActive={desktopTimelineFocusedPreviewActive}
        focusedPreviewGuideActive={
          repeatFocusFirstStepVisible && desktopTimelineFocusedPreviewActive
        }
        focusExitTimelineTimeSeconds={
          pendingTimelineRepeatExit?.resumeTimelineTimeSeconds ?? null
        }
        midiManualMix={{
          enabled: midiManualMixEnabled,
          currentStepId: midiManualMixCurrentStep?.id ?? null,
          nextStepId: midiManualMixNextStep?.id ?? null,
          followingStepId: midiManualMixFollowingStep?.id ?? null,
          progress: midiManualMix.progress,
        }}
        preferActiveShaderCompilePreview={preferLiveShaderCompilePreview}
        showGrid={Boolean(stageTransform.showGrid)}
        onDistortionChange={updateStageDistortion}
        onPinnedIndicatorClick={handlePinnedIndicatorClick}
        onNavigateToTimelineStep={handleStageNavigateToTimelineStep}
        onCompilerError={applyCompilerFeedback}
        onCanvasReady={(canvas) => { stageCanvasRef.current = canvas; }}
      />

      <div
        className={`stage-corner-controls ${
          stageControlsVisible ? 'stage-corner-controls-mapping-visible' : ''
        } ${isMobile ? 'stage-corner-controls-mobile' : ''}`}
      >
        {isMobile &&
        mobileChromeVisible &&
        mobilePanel === null &&
        !isMobileTimelineOpen ? (
          <PlaybackControls
            canNavigate={playableTimelineSteps.length > 1}
            hasTimeline={timelineSequenceEnabled}
            isRepeatEnabled={
              timelineStub.shaderSequence.singleStepLoopEnabled &&
              pendingTimelineRepeatExit === null
            }
            onPrevious={() => handlePlaybackStepOffset(-1)}
            onRepeatToggle={handlePlaybackFocusToggle}
            onNext={() => handlePlaybackStepOffset(1)}
          />
        ) : null}

        {stageControlsVisible ? (
          <div
            className={`stage-mapping-overlay ${
              isMobile ? 'stage-mapping-overlay-mobile' : ''
            } ${
              stageTransform.distortMode
                ? 'stage-mapping-overlay-distort-active'
                : ''
            }`}
          >
            {!isMobile && !stageTransform.distortMode ? (
              <MappingOutputDisclaimer />
            ) : null}
            <MappingPad
              onAction={handleMappingAction}
              onPrecisionChange={updateStagePrecision}
              onImportPosition={() => mappingPositionInputRef.current?.click()}
              onImportPositionText={(source) =>
                applyMappingPositionSource(source, 'pasted JSON')
              }
              onExportPosition={handleMappingPositionExport}
              getPositionJson={createCurrentMappingPositionJson}
              onRotationChange={updateStageRotation}
              onDistortModeChange={(enabled) => {
                trackUiClick(enabled ? 'distortion_editor_on' : 'distortion_editor_off');
                setDistortMode(enabled);
              }}
              onResetDistortion={() => {
                trackUiClick('distortion_reset');
                updateStageDistortion(DEFAULT_STAGE_DISTORTION);
              }}
              onCloseMove={() => {
                trackUiClick('move_mode_off');
                setMoveMode(false);
              }}
              onToggleGrid={() => {
                trackUiClick(stageTransform.showGrid ? 'alignment_grid_off' : 'alignment_grid_on');
                toggleAlignmentGrid();
              }}
              onFirstStepDismiss={dismissMappingFirstStep}
              precision={stageTransform.precision}
              rotationDegrees={stageTransform.rotationDegrees}
              showGrid={Boolean(stageTransform.showGrid)}
              distortMode={Boolean(stageTransform.distortMode)}
              showFirstStep={showMappingFirstStep}
              variant={isMobile ? 'overlay' : 'default'}
            />
          </div>
        ) : null}
      </div>

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

      {isMobile && stageControlsVisible ? (
        <MobilePrecisionOverlay
          precision={stageTransform.precision}
          onPrecisionChange={updateStagePrecision}
        />
      ) : null}

      {isMobile && mobilePanel === 'sliders' && mobileUiMode === 'full' ? (
        <MobileUniformOverlay
          shaderName={project.studio.activeShaderName}
          randomizationKey={`${project.sessionId}:${project.studio.activeShaderId}`}
          audioShaderId={project.studio.activeShaderId}
          audioShaderCode={project.studio.activeShaderCode}
          audioReactivity={audioReactivity}
          uniformDefinitions={uniformDefinitions}
          uniformValues={project.studio.uniformValues}
          uniformRuntime={uniformRuntime}
          onInteractionStart={handleUniformInteractionStart}
          onUniformChange={handleUniformChange}
          onUniformValuesChange={handleUniformValuesChange}
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
      {projectSaveStatus === 'error' && <div className="project-save-error" role="alert">
        Your latest changes could not be saved. Keep this project open; saving will retry automatically.
        <button type="button" className="secondary-button" onClick={() => void flushCurrentProject()}>Retry saving</button>
      </div>}
      {imageImportMessage && !isAssetLibraryOpen ? (
        <div className="image-import-notice" role="status">
          <span>{imageImportMessage}</span>
          <button type="button" aria-label="Dismiss image import message" onClick={() => setImageImportMessage('')}>×</button>
        </div>
      ) : null}

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
      <input
        ref={projectFileInputRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleProjectFileSelection(event);
        }}
      />
      <input
        ref={mappingPositionInputRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleMappingPositionImport(event);
        }}
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
          moveMode={stageTransform.moveMode}
          audioReactiveEnabled={audioReactivity.preferences.modeEnabled}
          audioReactiveListening={audioReactivity.status === 'listening'}
          audioReactiveSource={audioReactivity.preferences.source}
          onOpenProjects={() => {
            trackUiClick('open_projects');
            setIsProjectDialogOpen(true);
          }}
          onSaveProjectFile={handleSaveProjectFile}
          onOpenProjectFile={handleOpenProjectFilePicker}
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
            setAssetLibraryStepId(null);
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
          onToggleMoveMode={() => {
            trackUiClick(stageTransform.moveMode ? 'move_mode_off' : 'move_mode_on');
            toggleMoveMode();
          }}
          onToggleAudioReactive={() => {
            const nextEnabled = !audioReactivity.preferences.modeEnabled;
            audioReactivity.setModeEnabled(nextEnabled);
            if (nextEnabled) {
              audioReactivity.configureShaderBindings(
                project.studio.activeShaderId,
                uniformDefinitions,
                project.studio.uniformValues,
                project.studio.activeShaderCode,
              );
              void audioReactivity.start();
            } else {
              audioReactivity.stop();
            }
          }}
          onStartAudioReactive={(source) => {
            if (!audioReactivity.preferences.modeEnabled) {
              audioReactivity.setModeEnabled(true);
              audioReactivity.configureShaderBindings(
                project.studio.activeShaderId,
                uniformDefinitions,
                project.studio.uniformValues,
                project.studio.activeShaderCode,
              );
            }
            void audioReactivity.start(source);
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
          assetsFirstStepEligible={assetsFirstStepEligible}
          onboardingActive={showOnboardingGuide}
          onAssetsFirstStepAdvance={() => setShowAssetImportFirstStep(true)}
        />
      ) : null}

      <div
        className={`workspace-body ${useDesktopPaneLayout ? 'workspace-body-desktop-grid' : ''}`}
      >
        {useDesktopPaneLayout ? (
          <>
            <section
              className="workspace-desktop-main"
              style={{ gridTemplateRows: `minmax(0, 1fr) 10px minmax(var(--desktop-timeline-min-height), ${desktopLayout.timelineHeight}px)` }}
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
                      {renderChatWorkspace(desktopCodePanel, desktopHistoryPanel)}
                  </div>
                </aside>
              </div>

              <div
                className="workspace-resize-handle workspace-resize-handle-horizontal"
                role="presentation"
                onMouseDown={(event) => {
                  event.preventDefault();
                  beginDesktopResize('timeline', event.clientX, event.clientY, event.currentTarget.nextElementSibling?.getBoundingClientRect().height);
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

          </>
        ) : (
          <>
            {stageViewport}

            {!isMobile && uiPreferences.chromeVisible && uiPreferences.sidebarVisible ? (
              <aside className="workspace-sidebar" data-onboarding-area="controls">
                  <div className="workspace-sidebar-scroll">
                    {renderChatWorkspace(desktopCodePanel, desktopHistoryPanel)}
                  {studioPanel}
                  {timelineStepAssetPanel}
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
        key={project.sessionId}
        open={isAssetLibraryOpen}
        activeAsset={activeAsset}
        assetUrl={activeAssetUrl}
        assets={project.library.assets}
        activeAssetId={assetLibraryShader?.inputAssetId ?? activeAsset?.id ?? null}
        timelineAssignment={assetLibraryStep && assetLibraryShader ? {
          shaderName: assetLibraryShader.name,
          onUseLiveStage: () => handleTimelineAssignStepAsset(assetLibraryStep.id, null),
        } : undefined}
        onLoadAsset={() => assetLibraryStep
          ? openFilePicker('timeline-picker', assetLibraryStep.id)
          : openFilePicker('library')}
        onPasteImage={() => { void handleImageTransfer(readClipboardImages, assetLibraryStep?.id); }}
        onDropImage={(transfer) => { void handleImageTransfer(transfer, assetLibraryStep?.id); }}
        imageImporting={imageImporting}
        imageImportMessage={imageImportMessage}
        onSelectAsset={(assetId) => assetLibraryStep
          ? handleTimelineAssignStepAsset(assetLibraryStep.id, assetId)
          : handleAssetSelect(assetId)}
        onRenameAsset={handleAssetRename}
        onEditMask={handleAssetMaskOpen}
        onEditSurfaces={handleAssetSurfacesOpen}
        onSaveVariant={handleAssetVersionSave}
        processingSuspended={Boolean(segmentationAsset || surfaceAsset)}
        onRemoveAsset={handleAssetRemove}
        onOpenProBeta={() => setProBetaSource('asset_generate')}
        onClose={() => {
          setHighlightAssetStartMapping(false);
          setIsAssetLibraryOpen(false);
          setAssetLibraryStepId(null);
        }}
        showImportFirstStep={showAssetImportFirstStep}
        highlightStartMapping={highlightAssetStartMapping}
        onImportFirstStepDismiss={() => {
          dismissAssetsFirstStepPermanently();
          setShowAssetImportFirstStep(false);
        }}
      />

      <AssetSegmentationDialog
        asset={segmentationAsset}
        assetUrl={segmentationAssetResolution.url}
        initialPanel={segmentationPanel}
        originalAsset={segmentationOriginalResolution.status === 'missing' ? null : segmentationOriginalAsset}
        originalAssetUrl={segmentationOriginalResolution.url}
        onApply={handleAssetMaskApply}
        onClose={handleAssetMaskClose}
      />

      {surfaceAsset && <AssetSurfacesDialog
        key={surfaceAsset.id}
        asset={surfaceAsset}
        assetUrl={surfaceAssetResolution.url}
        assetMissing={surfaceAssetResolution.status === 'missing'}
        initialOptions={surfaceInitialOptions}
        onApply={handleAssetSurfacesApply}
        onClose={() => setSurfaceAssetId(null)}
      />}

      {isMobile && mobileChromeVisible ? (
        <MobileChrome
          activeAssetName={activeAsset?.name ?? 'No asset selected'}
          isTimelineOpen={isMobileTimelineOpen}
          uiMode={mobileUiMode === 'bar' ? 'bar' : 'full'}
          activePanel={mobilePanel}
          moveMode={stageTransform.moveMode}
          onOpenProjects={() => {
            trackUiClick('open_projects');
            setIsProjectDialogOpen(true);
          }}
          onOpenShare={() => {
            trackUiClick('open_share');
            handleOpenShareDialog();
          }}
          onOpenAssets={() => {
            trackUiClick('open_assets');
            setAssetLibraryStepId(null);
            setIsAssetLibraryOpen(true);
          }}
          onOpenSettings={() => {
            trackUiClick('open_settings');
            setApiSettingsVariant('settings');
            setIsApiSettingsOpen(true);
          }}
          onOpenTimeline={handleOpenMobileTimeline}
          onToggleMapping={handleMobileToggleMapping}
          onHide={handleMobileHide}
          onPanelChange={handleMobilePanelChange}
          panels={{
            studio: mobileShaderPanel,
            mapping: null,
          }}
        />
      ) : null}

      <TimelineDialog
        open={isMobile && isMobileTimelineOpen}
        sequence={timelineStub.shaderSequence}
        transport={project.playback.transport}
        audioReactiveAvailable={audioReactivity.preferences.modeEnabled}
        audioReactiveListening={audioReactivity.status === 'listening'}
        onPlayToggle={handlePlayToggle}
        onSequenceModeChange={handleTimelineSequenceModeChange}
        onMobileEqualDurationChange={handleMobileEqualDurationChange}
        onClose={() => setIsMobileTimelineOpen(false)}
      />

      <ApiSettingsDialog
        open={isApiSettingsOpen}
        settings={project.ai.settings}
        variant={apiSettingsVariant}
        initialPath={apiSettingsVariant === 'settings' ? aiGenerationRoute : externalChatRequest?.route}
        isClearingLocalData={isClearingLocalData}
        onOpenProBeta={() => setProBetaSource('shader_pro_teaser')}
        onClose={() => {
          setIsApiSettingsOpen(false);
          if (
            externalChatRequest?.route !== 'chatgpt' &&
            externalChatRequest?.route !== 'perplexity'
          ) {
            setExternalChatRequest(null);
          }
        }}
        onChange={updateAiSetting}
        onRouteChange={route => {
          handleAiGenerationRouteChange(route);
          if (apiSettingsVariant === 'setup' && externalChatRequest && (route === 'chatgpt' || route === 'perplexity')) {
            const externalWindowMode = openShaderChat(route, externalChatRequest.prompt, externalChatRequest.currentCode);
            setExternalChatRequest(current => current?.requestId === externalChatRequest.requestId ? { ...current, route, externalWindowMode } : current);
            setIsApiSettingsOpen(false);
            setAiPrompt('');
            setAiFeedbackMessage('');
          }
        }}
        onContinueWithRuntime={() => {
          const pendingRequest = externalChatRequest;
          if (!pendingRequest) {
            setIsApiSettingsOpen(false);
            return;
          }
          removePendingShaderApplyRequest(pendingRequest.requestId);
          setIsApiSettingsOpen(false);
          setExternalChatRequest(null);
          void handleShaderMutation(pendingRequest.prompt, {
            historyPrompt: pendingRequest.historyPrompt,
            trigger: pendingRequest.trigger,
          });
        }}
        onApplyExternalChatResponse={handleApplyExternalChatResponse}
        onClearLocalData={() => {
          void handleClearLocalData();
        }}
      />

      <ProBetaDialog
        open={proBetaSource !== null}
        source={proBetaSource ?? 'asset_generate'}
        onClose={() => setProBetaSource(null)}
      />

      <ProjectLibraryDialog
        open={isProjectDialogOpen}
        currentProjectName={project.name}
        activeSessionId={project.sessionId}
        savedProjects={savedProjects}
        saveStatus={projectSaveStatus}
        onRetrySave={() => void flushCurrentProject()}
        onClose={() => setIsProjectDialogOpen(false)}
        onSaveProject={handleSaveProject}
        onSaveAsNewProject={handleSaveAsNewProject}
        onCreateNewProject={handleCreateNewProject}
        onCreateEmptyProject={handleCreateEmptyProject}
        onOpenProject={handleOpenSavedProject}
        onDeleteProject={handleDeleteSavedProject}
        onSaveFile={handleSaveProjectFile}
        onOpenFile={handleOpenProjectFilePicker}
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
        onOpenProBeta={() => setProBetaSource('export_with_music')}
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
          trackActivationMilestone('export_mp4');
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
        currentShaderName={presetReplacementShaderName}
        canReplaceCurrent={Boolean(presetReplacementStep)}
        onSelect={applyPresetSelection}
        onClose={() => {
          setIsPresetBrowserOpen(false);
        }}
      />

      {showOnboardingGuide ? (
        isMobile ? (
          <MobileOnboardingGuide
            onStepChange={() => {
              setMobilePanel(null);
              setIsMobileTimelineOpen(false);
            }}
            onClose={() => {
              track('onboarding_complete');
              dismissOnboardingPermanently();
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
        ) : (
          <OnboardingGuide
          onClose={() => {
            track('onboarding_complete');
            dismissOnboardingPermanently();
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
        )
      ) : null}
    </div>
  );
}
