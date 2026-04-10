import {
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
import { TimelineBar, TimelineDialog } from '../components/TimelineBar';
import { TimelineStageRenderer } from '../components/TimelineStageRenderer';
import { UniformPanel } from '../components/UniformPanel';
import type { TimelineSelectionInfo } from '../components/TimelineSelectionBanner';
import { WorkspaceToolbar } from '../components/WorkspaceToolbar';
import {
  DEFAULT_STAGE_TRANSFORM,
  DEFAULT_GOOGLE_SHADER_MODEL,
  DEFAULT_SHADERS,
  DEFAULT_UI_PREFERENCES,
  createDefaultProject,
} from '../config';
import { pauseTransport, playTransport, resetTransport, seekTransport } from '../lib/clock';
import { parseShaderName, parseUniforms, syncUniformValues } from '../lib/shader';
import { requestShaderMutation } from '../lib/shaderGeneration';
import {
  getRenderableShaderUniformValues,
  validateShaderCodeCompilation,
} from '../lib/shaderState';
import {
  clampTimelineStepDuration,
  clampTransitionDuration,
  createTimelineShaderStep,
  getShaderTimelineDuration,
  isTimelineStepEnabled,
  roundTimelineSeconds,
  scaleTimelineStepDurations,
} from '../lib/timeline';
import { normalizeTimelineStepAssetSettings } from '../lib/timelineAssetSettings';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { createSessionSync } from '../lib/sessionSync';
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
  TimelineEditorViewMode,
  TimelineStagePreviewMode,
  TimelineTransitionEffect,
  UiPreferences,
  WorkspaceMode,
} from '../types';

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

function normalizeProject(project: ProjectDocument): ProjectDocument {
  const uniformDefinitions = parseUniforms(project.studio.activeShaderCode);
  const defaultProject = createDefaultProject(project.sessionId);
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
    openaiApiKey: legacySettings.openaiApiKey ?? '',
    googleApiKey: legacySettings.googleApiKey ?? '',
    runwayApiKey: legacySettings.runwayApiKey ?? '',
    shaderProvider: 'google',
    openaiShaderModel: legacySettings.openaiShaderModel ?? legacySettings.shaderModel ?? '',
    googleShaderModel:
      legacySettings.googleShaderModel ?? DEFAULT_GOOGLE_SHADER_MODEL,
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
      transitionEffect: step.transitionEffect ?? 'mix',
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
      transport: {
        ...defaultProject.playback.transport,
        ...project.playback?.transport,
        loop: true,
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
          stagePreviewMode:
            project.timeline?.stub?.shaderSequence?.stagePreviewMode ??
            defaultProject.timeline.stub.shaderSequence.stagePreviewMode,
          focusedStepId:
            project.timeline?.stub?.shaderSequence?.focusedStepId ??
            defaultProject.timeline.stub.shaderSequence.focusedStepId,
          pinnedStepId: normalizedPinnedStepId,
          singleStepLoopEnabled:
            project.timeline?.stub?.shaderSequence?.singleStepLoopEnabled ??
            defaultProject.timeline.stub.shaderSequence.singleStepLoopEnabled,
          randomChoiceEnabled:
            project.timeline?.stub?.shaderSequence?.randomChoiceEnabled ??
            defaultProject.timeline.stub.shaderSequence.randomChoiceEnabled,
          sharedTransitionEnabled:
            project.timeline?.stub?.shaderSequence?.sharedTransitionEnabled ??
            defaultProject.timeline.stub.shaderSequence.sharedTransitionEnabled,
          sharedTransitionEffect:
            project.timeline?.stub?.shaderSequence?.sharedTransitionEffect ??
            defaultProject.timeline.stub.shaderSequence.sharedTransitionEffect,
          sharedTransitionDurationSeconds: clampTransitionDuration(
            600,
            project.timeline?.stub?.shaderSequence?.sharedTransitionDurationSeconds ??
              defaultProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
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

function getTimelineStepStartSeconds(
  steps: ProjectDocument['timeline']['stub']['shaderSequence']['steps'],
  targetStepId: string,
): number | null {
  let cursorSeconds = 0;

  for (const step of steps) {
    if (step.id === targetStepId) {
      return cursorSeconds;
    }

    cursorSeconds += clampTimelineStepDuration(step.durationSeconds);
  }

  return null;
}

export function WorkspaceRoute() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageViewportRef = useRef<HTMLElement | null>(null);
  const outputWindowRef = useRef<Window | null>(null);
  const sessionSyncRef = useRef<ReturnType<typeof createSessionSync> | null>(null);
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
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);
  const [desktopStageKeyboardArmed, setDesktopStageKeyboardArmed] = useState(false);
  const [editingTimelineStepId, setEditingTimelineStepId] = useState<string | null>(null);
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
    sessionSyncRef.current = createSessionSync(activeSessionId, (incomingProject) => {
      setProject((currentProject) => {
        if (!currentProject || currentProject.sessionId !== incomingProject.sessionId) {
          return currentProject;
        }
        return normalizeProject(incomingProject);
      });
    });

    return () => {
      sessionSyncRef.current?.destroy();
      sessionSyncRef.current = null;
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!project) {
      return;
    }
    saveProjectDocument(project);
    saveShaderSliderCache(project.sessionId, createSliderCacheSnapshot(project));
    persistActiveSessionId(project.sessionId);
    sessionSyncRef.current?.publish(project);
  }, [project]);

  useEffect(() => {
    saveUiPreferences(uiPreferences);
  }, [uiPreferences]);

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
  }, [project]);

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate the project share link.';
      setShareLinkError(message);
      setStatusMessage(message);
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

  const openFilePicker = () => fileInputRef.current?.click();

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

    updateProject((currentProject) => {
      const nextAssets = [...currentProject.library.assets, ...uploadedAssets];
      const nextActiveId = uploadedAssets[0]?.id ?? currentProject.library.activeAssetId;
      const shouldAutoPlay = currentProject.library.assets.length === 0;

      return {
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
    });

    setStatusMessage(`${uploadedAssets.length} asset${uploadedAssets.length > 1 ? 's' : ''} added.`);
    event.target.value = '';
  };

  const handlePlayToggle = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: currentProject.playback.transport.isPlaying
          ? pauseTransport(currentProject.playback.transport)
          : playTransport(currentProject.playback.transport),
      },
    }));
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

  const handleAssetRemove = (assetId: string) => {
    const removedAsset = project?.library.assets.find((asset) => asset.id === assetId) ?? null;
    void deleteAssetBlob(assetId);

    updateProject((currentProject) => {
      const nextAssets = currentProject.library.assets.filter((asset) => asset.id !== assetId);
      const removedWasActive =
        currentProject.library.activeAssetId === assetId || currentProject.playback.activeAssetId === assetId;
      const nextActiveId = removedWasActive ? nextAssets[0]?.id ?? null : currentProject.library.activeAssetId;

      return {
        ...currentProject,
        library: {
          ...currentProject.library,
          assets: nextAssets,
          activeAssetId: nextActiveId,
        },
        playback: {
          ...currentProject.playback,
          activeAssetId: removedWasActive ? nextActiveId : currentProject.playback.activeAssetId,
          transport:
            removedWasActive && nextActiveId === null
              ? pauseTransport(currentProject.playback.transport)
              : currentProject.playback.transport,
        },
      };
    });

    if (removedAsset) {
      setStatusMessage(`Removed asset "${removedAsset.name}".`);
    }
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

  const handleTimelineReset = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: resetTransport(currentProject.playback.transport),
      },
    }));
  }, [updateProject]);

  const handleTimelineStop = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: {
          ...currentProject.playback.transport,
          isPlaying: false,
          currentTimeSeconds: 0,
          anchorTimestampMs: null,
        },
      },
    }));
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

  const handleTimelineEditorViewChange = useCallback((editorView: TimelineEditorViewMode) => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            editorView,
          },
        },
      },
    }));
  }, [updateProject]);

  const handleTimelineStagePreviewModeChange = useCallback(
    (stagePreviewMode: TimelineStagePreviewMode) => {
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
    },
  ) => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            ...patch,
            sharedTransitionDurationSeconds: clampTransitionDuration(
              600,
              patch.sharedTransitionDurationSeconds ??
                currentProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
            ),
          },
        },
      },
    }));
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

  const handleTimelineRandomChoiceToggle = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            randomChoiceEnabled: !currentProject.timeline.stub.shaderSequence.randomChoiceEnabled,
            singleStepLoopEnabled: currentProject.timeline.stub.shaderSequence.randomChoiceEnabled
              ? currentProject.timeline.stub.shaderSequence.singleStepLoopEnabled
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
      if (!step) {
        return currentProject;
      }

      const sourceShader =
        currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId) ?? null;
      if (!sourceShader) {
        return currentProject;
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
      const nextSteps = currentProject.timeline.stub.shaderSequence.steps.map((item) =>
        item.id === stepId ? { ...item, shaderId: editableShader.id } : item,
      );
      const shouldSyncActiveShader =
        editingTimelineStepId === stepId ||
        currentProject.studio.activeShaderId === sourceShader.id ||
        currentProject.studio.activeShaderId === editableShader.id;
      const assignedAssetName =
        nextInputAssetId
          ? currentProject.library.assets.find((assetRecord) => assetRecord.id === nextInputAssetId)?.name ??
            'selected asset'
          : null;

      nextStatusMessage = nextInputAssetId
        ? `Assigned "${assignedAssetName}" to "${editableShader.name}".`
        : `"${editableShader.name}" now uses the live stage asset.`;

      return pruneTemporaryTimelineShaders({
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
      });
    });

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [editingTimelineStepId, updateProject]);

  const handleTimelineAddStepsWithShaders = useCallback((shaderIds: string[]) => {
    const requestedShaderIds = Array.from(
      new Set(shaderIds.map((shaderId) => shaderId.trim()).filter(Boolean)),
    );
    if (requestedShaderIds.length === 0) {
      return;
    }

    let addedShaderNames: string[] = [];

    updateProject((currentProject) => {
      let nextProject = currentProject;
      addedShaderNames = [];

      for (const shaderId of requestedShaderIds) {
        const savedShader = nextProject.studio.savedShaders.find((shader) => shader.id === shaderId);
        if (!savedShader) {
          continue;
        }

        const nextStep = createTimelineShaderStep(savedShader.id);
        addedShaderNames.push(savedShader.name);
        nextProject = {
          ...nextProject,
          timeline: {
            stub: {
              ...nextProject.timeline.stub,
              shaderSequence: {
                ...nextProject.timeline.stub.shaderSequence,
                enabled: true,
                focusedStepId: nextStep.id,
                steps: [...nextProject.timeline.stub.shaderSequence.steps, nextStep],
              },
            },
          },
        };
      }

      return nextProject;
    });

    if (addedShaderNames.length === 1) {
      setStatusMessage(`Added "${addedShaderNames[0]}" to the timeline.`);
    } else if (addedShaderNames.length > 1) {
      setStatusMessage(`Added ${addedShaderNames.length} shaders to the timeline.`);
    }
  }, [updateProject]);

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

  const selectShader = (shaderId: string) => {
    if (!project) {
      return;
    }

    const shader = project.studio.savedShaders.find((item) => item.id === shaderId);
    if (!shader) {
      return;
    }

    const nextEditingStepId = shader.isTemporary ? shader.ownerTimelineStepId ?? null : null;

    updateProject((currentProject) => {
      const currentShader =
        currentProject.studio.savedShaders.find((item) => item.id === shaderId) ?? shader;
      const nextStep = currentShader.isTemporary ? null : createTimelineShaderStep(currentShader.id);

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
    clearGeneratedShaderRetry();
    setStatusMessage(
      shader.isTemporary
        ? `Editing linked timeline shader "${shader.name}".`
        : `Loaded preset "${shader.name}" and added it to the timeline.`,
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
      isPresetBrowserOpen);

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
    },
  ) => {
    if (!project) {
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
      })
      .catch((error) => {
        const message =
          error instanceof Error ? sanitizeAiMessage(error.message) : 'Shader auto-fix failed.';
        setCompilerError(message);
        setAiFeedbackTone('error');
        setAiFeedbackMessage(message);
        setStatusMessage('Shader auto-fix failed.');
        clearGeneratedShaderRetry(activeShaderId);
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
      { historyPrompt: `Add slider: ${sanitized}` },
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
      setStatusMessage('Projection window focused.');
      return;
    }

    const popup = window.open(nextUrl, 'mapshroom-output', 'popup,width=1440,height=900');
    if (!popup) {
      setStatusMessage('Popup blocked. Allow popups to open the output window.');
      return;
    }

    outputWindowRef.current = popup;
    publishProjectToOutput();
    window.setTimeout(publishProjectToOutput, 200);
    window.setTimeout(publishProjectToOutput, 800);
    setStatusMessage('Projection window opened.');
  };

  const updateAiSetting = (field: keyof AiSettings, value: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      ai: {
        settings: {
          ...currentProject.ai.settings,
          [field]: value,
        },
      },
    }));
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
      sessionSyncRef.current?.destroy();
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
                focusedStepId: stepId,
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
    const isPinnedStep = pinnedTimelineStepId === stepId;
    const nextTimeSeconds = isPinnedStep
      ? null
      : getTimelineStepStartSeconds(
          project?.timeline.stub.shaderSequence.steps ?? [],
          stepId,
        );
    void selectTimelineStepForEditing(stepId, {
      stagePreviewMode: isPinnedStep ? 'timeline' : 'focused',
      seekTimeSeconds: nextTimeSeconds,
    });
  }, [
    pinnedTimelineStepId,
    project?.timeline.stub.shaderSequence.steps,
    selectTimelineStepForEditing,
  ]);

  if (!project) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-card">
          <span className="panel-eyebrow">Mapshroom V3</span>
          <h1>Loading workspace</h1>
          <p>Preparing the React stage, project document, and local media cache.</p>
        </div>
      </div>
    );
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
  const playableTimelineSteps = timelineStub.shaderSequence.steps.filter(isTimelineStepEnabled);
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
    ? getShaderTimelineDuration(timelineStub.shaderSequence.steps)
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
      onNewShader={() => {
        createNewShader();
        setMobilePanel(null);
      }}
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
      onNewShader={() => {
        createNewShader();
        setMobilePanel(null);
      }}
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
      markers={timelineMarkers}
      tracks={timelineTracks}
      onSeek={handleTimelineSeek}
      onPlayToggle={handlePlayToggle}
      onStop={handleTimelineStop}
      onReset={handleTimelineReset}
      onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
      onToggleRandomChoice={handleTimelineRandomChoiceToggle}
      onSequenceModeChange={handleTimelineSequenceModeChange}
      onSequenceEditorViewChange={handleTimelineEditorViewChange}
      onSequenceStagePreviewModeChange={handleTimelineStagePreviewModeChange}
      onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
      onSequenceStepChange={handleTimelineStepChange}
      onSequencePinnedStepToggle={handleTimelinePinnedStepToggle}
      onAssignSequenceStepAsset={handleTimelineAssignStepAsset}
      onSequenceDurationChange={handleTimelineDurationChange}
      onAddSequenceStepsWithShaders={handleTimelineAddStepsWithShaders}
      onDuplicateSequenceStep={handleTimelineDuplicateStep}
      onRemoveSequenceStep={handleTimelineRemoveStep}
      onResizeSequenceBoundary={handleTimelineResizeBoundary}
      onEditSequenceStep={handleTimelineEditStep}
    />
  );

  const sharedTimelineShaderIds = new Set(
    project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
  );
  if (sharedTimelineShaderIds.size === 0 && project.studio.activeShaderId) {
    sharedTimelineShaderIds.add(project.studio.activeShaderId);
  }
  const sharedTimelineShaderCount = sharedTimelineShaderIds.size;

  const useDesktopPaneLayout = !isMobile && uiPreferences.chromeVisible;
  const desktopGridTemplateColumns = `minmax(0, 1fr) 10px ${desktopLayout.rightSidebarWidth}px`;
  const desktopMainTopGridTemplateColumns = uiPreferences.sidebarVisible
    ? `${desktopLayout.leftSidebarWidth}px 10px minmax(0, 1fr)`
    : 'minmax(0, 1fr)';

  const stageViewport = (
    <section
      ref={stageViewportRef}
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
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline.stub}
        pinnedStepId={pinnedTimelineStepId}
        shaderCompileNonce={shaderCompileNonce}
        stageTransform={workspacePreviewStageTransform}
        transport={project.playback.transport}
        forceActiveShaderPreview={
          timelineStub.shaderSequence.stagePreviewMode === 'focused' &&
          editingTimelineStepId !== null
        }
        preferActiveShaderCompilePreview={preferLiveShaderCompilePreview}
        onCompilerError={applyCompilerFeedback}
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

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelection}
      />

      {!isMobile && uiPreferences.chromeVisible ? (
        <WorkspaceToolbar
          isPlaying={project.playback.transport.isPlaying}
          workspaceMode={uiPreferences.workspaceMode}
          sidebarVisible={uiPreferences.sidebarVisible}
          desktopSlidersWindowEnabled={uiPreferences.desktopSlidersWindowEnabled}
          onOpenProjects={() => setIsProjectDialogOpen(true)}
          onOpenShare={handleOpenShareDialog}
          onOpenAssets={() => setIsAssetLibraryOpen(true)}
          onOpenSettings={() => setIsApiSettingsOpen(true)}
          onPlayToggle={handlePlayToggle}
          onOpenOutput={handleOutputWindowOpen}
          onToggleSidebarVisibility={toggleSidebarVisibility}
          onToggleDesktopSlidersWindow={toggleDesktopSlidersWindow}
          onToggleWorkspaceMode={() =>
            updateWorkspaceMode(uiPreferences.workspaceMode === 'immersive' ? 'split' : 'immersive')
          }
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
                      style={{ width: `${desktopLayout.leftSidebarWidth}px` }}
                    >
                      <div className="workspace-pane-scroll">
                        {desktopSlidersPanel}
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
                <div className="workspace-pane-scroll workspace-pane-scroll-timeline">
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
              style={{ width: `${desktopLayout.rightSidebarWidth}px` }}
            >
              <div className="workspace-pane-scroll workspace-pane-scroll-inspector">
                {aiPanel}
                {desktopShaderToolsPanel}
                {desktopHistoryPanel}
                {desktopCodePanel}
              </div>
            </aside>
          </>
        ) : (
          <>
            {stageViewport}

            {!isMobile && uiPreferences.chromeVisible && uiPreferences.sidebarVisible ? (
              <aside className="workspace-sidebar">
                <div className="workspace-sidebar-scroll">
                  {aiPanel}
                  {studioPanel}
                  {mappingPanel}
                </div>
              </aside>
            ) : null}
          </>
        )}
      </div>

      {!isMobile && uiPreferences.chromeVisible && !useDesktopPaneLayout ? (
        <div className="workspace-timeline-shell">{timelineBar}</div>
      ) : null}

      <AssetLibraryDialog
        open={!isMobile && isAssetLibraryOpen}
        activeAsset={activeAsset}
        assetUrl={activeAssetUrl}
        assets={project.library.assets}
        activeAssetId={activeAsset?.id ?? null}
        onLoadAsset={openFilePicker}
        onSelectAsset={handleAssetSelect}
        onRemoveAsset={handleAssetRemove}
        onClose={() => setIsAssetLibraryOpen(false)}
      />

      {isMobile && mobileChromeVisible ? (
        <MobileChrome
          activeAssetName={activeAsset?.name ?? 'No asset selected'}
          isPlaying={project.playback.transport.isPlaying}
          isTimelineOpen={isMobileTimelineOpen}
          uiMode={mobileUiMode === 'bar' ? 'bar' : 'full'}
          activePanel={mobilePanel}
          onOpenProjects={() => setIsProjectDialogOpen(true)}
          onOpenShare={handleOpenShareDialog}
          onLoadAsset={openFilePicker}
          onOpenSettings={() => setIsApiSettingsOpen(true)}
          onOpenTimeline={handleOpenMobileTimeline}
          onToggleMapping={handleMobileToggleMapping}
          onHide={handleMobileHide}
          onPlayToggle={handlePlayToggle}
          onPanelChange={handleMobilePanelChange}
          panels={{
            studio: mobileShaderPanel,
            mapping: mappingPanel,
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
        markers={timelineMarkers}
        tracks={timelineTracks}
        onSeek={handleTimelineSeek}
        onPlayToggle={handlePlayToggle}
        onStop={handleTimelineStop}
        onReset={handleTimelineReset}
        onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
        onToggleRandomChoice={handleTimelineRandomChoiceToggle}
        onSequenceModeChange={handleTimelineSequenceModeChange}
        onSequenceEditorViewChange={handleTimelineEditorViewChange}
        onSequenceStagePreviewModeChange={handleTimelineStagePreviewModeChange}
        onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
        onSequenceStepChange={handleTimelineStepChange}
        onSequencePinnedStepToggle={handleTimelinePinnedStepToggle}
        onAssignSequenceStepAsset={handleTimelineAssignStepAsset}
        onSequenceDurationChange={handleTimelineDurationChange}
        onAddSequenceStepsWithShaders={handleTimelineAddStepsWithShaders}
        onDuplicateSequenceStep={handleTimelineDuplicateStep}
        onRemoveSequenceStep={handleTimelineRemoveStep}
        onResizeSequenceBoundary={handleTimelineResizeBoundary}
        onEditSequenceStep={handleTimelineEditStep}
        onClose={() => setIsMobileTimelineOpen(false)}
      />

      <ApiSettingsDialog
        open={isApiSettingsOpen}
        settings={project.ai.settings}
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

      <PresetBrowserDialog
        open={isPresetBrowserOpen}
        presets={timelineSelectableShaders}
        activeShaderId={project.studio.activeShaderId}
        assetUrl={activeAssetUrl}
        onSelect={selectShader}
        onClose={() => setIsPresetBrowserOpen(false)}
      />
    </div>
  );
}
