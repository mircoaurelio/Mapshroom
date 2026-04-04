import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiPanel } from '../components/AiPanel';
import { ApiSettingsDialog } from '../components/ApiSettingsDialog';
import { AssetLibraryDialog } from '../components/AssetLibraryDialog';
import { type MobilePanelKey, MobileChrome } from '../components/MobileChrome';
import { MappingPad, type MappingAction } from '../components/MappingPad';
import { MappingPanel } from '../components/MappingPanel';
import { MobilePrecisionOverlay } from '../components/MobilePrecisionOverlay';
import { MobileUniformOverlay } from '../components/MobileUniformOverlay';
import { PresetBrowserDialog } from '../components/PresetBrowserDialog';
import {
  ShaderCodeSection,
  ShaderStudioControlsSection,
  ShaderVersionTrailSection,
  StudioPanel,
} from '../components/StudioPanel';
import { TimelineBar, TimelineDialog } from '../components/TimelineBar';
import { TimelineStageRenderer } from '../components/TimelineStageRenderer';
import { UniformPanel } from '../components/UniformPanel';
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
  clampTimelineStepDuration,
  clampTransitionDuration,
  createTimelineShaderStep,
  getShaderTimelineDuration,
} from '../lib/timeline';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { createSessionSync } from '../lib/sessionSync';
import {
  deleteAssetBlob,
  getOrCreateSessionId,
  loadProjectDocument,
  loadUiPreferences,
  persistActiveSessionId,
  putAssetBlob,
  saveProjectDocument,
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
  SavedShader,
  ShaderUniformValue,
  ShaderUniformValueMap,
  StageTransform,
  TimelineEditorViewMode,
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
  const shippedPresets = Object.values(DEFAULT_SHADERS).map((shader) => ({
    ...shader,
  }));
  const presetIds = new Set(shippedPresets.map((shader) => shader.id));
  const mergedSavedShaders = [
    ...shippedPresets,
    ...project.studio.savedShaders.filter((shader) => !presetIds.has(shader.id)),
  ];
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

  return {
    ...project,
    ai: {
      settings: normalizedAiSettings,
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
          focusedStepId:
            project.timeline?.stub?.shaderSequence?.focusedStepId ??
            defaultProject.timeline.stub.shaderSequence.focusedStepId,
          singleStepLoopEnabled:
            project.timeline?.stub?.shaderSequence?.singleStepLoopEnabled ??
            defaultProject.timeline.stub.shaderSequence.singleStepLoopEnabled,
          randomChoiceEnabled:
            project.timeline?.stub?.shaderSequence?.randomChoiceEnabled ??
            defaultProject.timeline.stub.shaderSequence.randomChoiceEnabled,
          sharedTransitionEffect:
            project.timeline?.stub?.shaderSequence?.sharedTransitionEffect ??
            defaultProject.timeline.stub.shaderSequence.sharedTransitionEffect,
          sharedTransitionDurationSeconds: clampTransitionDuration(
            600,
            project.timeline?.stub?.shaderSequence?.sharedTransitionDurationSeconds ??
              defaultProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
          ),
          steps: (
            project.timeline?.stub?.shaderSequence?.steps?.length
              ? project.timeline.stub.shaderSequence.steps
              : defaultProject.timeline.stub.shaderSequence.steps
          ).map((step) => {
            const durationSeconds = clampTimelineStepDuration(step.durationSeconds);
            return {
              ...step,
              durationSeconds,
              transitionDurationSeconds: clampTransitionDuration(
                durationSeconds,
                step.transitionDurationSeconds,
              ),
              transitionEffect: step.transitionEffect ?? 'mix',
            };
          }),
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

function createSavedShaderRecord(
  name: string,
  code: string,
  uniformValues: ShaderUniformValueMap = {},
  options: Partial<
    Pick<
      SavedShader,
      'description' | 'group' | 'isTemporary' | 'isDirty' | 'sourceShaderId' | 'ownerTimelineStepId'
    >
  > = {},
): SavedShader {
  const label = name.trim() || 'Mapshroom Shader';

  return {
    id: `${options.isTemporary ? 'timeline' : 'saved'}-${crypto.randomUUID()}`,
    name: label,
    code,
    description: options.description ?? 'Saved from the current workspace state.',
    group: options.group ?? 'Saved',
    uniformValues: getSyncedShaderUniformValues(code, uniformValues),
    isTemporary: options.isTemporary,
    isDirty: options.isDirty,
    sourceShaderId: options.sourceShaderId,
    ownerTimelineStepId: options.ownerTimelineStepId,
  };
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

export function WorkspaceRoute() {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const outputWindowRef = useRef<Window | null>(null);
  const sessionSyncRef = useRef<ReturnType<typeof createSessionSync> | null>(null);
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() =>
    loadUiPreferences(DEFAULT_UI_PREFERENCES),
  );
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [compilerError, setCompilerError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [aiFeedbackMessage, setAiFeedbackMessage] = useState('');
  const [aiFeedbackTone, setAiFeedbackTone] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [shaderCompileNonce, setShaderCompileNonce] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<MobilePanelKey>(null);
  const [newUniformName, setNewUniformName] = useState('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);
  const [editingTimelineStepId, setEditingTimelineStepId] = useState<string | null>(null);
  const [activeAssetDurationSeconds, setActiveAssetDurationSeconds] = useState<number | null>(null);
  const [desktopLayout, setDesktopLayout] = useState({
    leftSidebarWidth: 360,
    rightSidebarWidth: 360,
    timelineHeight: 300,
  });
  const generatedShaderRetryRef = useRef<{
    sourcePrompt: string;
    code: string;
    autoRepairUsed: boolean;
    versionId: string | null;
    retryInFlight: boolean;
  } | null>(null);
  const resizeStateRef = useRef<{
    target: DesktopResizeTarget;
    startX: number;
    startY: number;
    leftSidebarWidth: number;
    rightSidebarWidth: number;
    timelineHeight: number;
  } | null>(null);
  const activeSessionId = project?.sessionId ?? null;

  const updateProject = useCallback((updater: (currentProject: ProjectDocument) => ProjectDocument) => {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      return updater(currentProject);
    });
  }, []);

  const removeShaderVersion = useCallback((versionId: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        shaderVersions: currentProject.studio.shaderVersions.filter(
          (version) => version.id !== versionId,
        ),
      },
    }));
  }, [updateProject]);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    persistActiveSessionId(sessionId);
    const loadedProject = loadProjectDocument(sessionId) ?? createDefaultProject(sessionId);
    setProject(normalizeProject(loadedProject));
  }, []);

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
    persistActiveSessionId(project.sessionId);
    sessionSyncRef.current?.publish(project);
  }, [project]);

  useEffect(() => {
    saveUiPreferences(uiPreferences);
  }, [uiPreferences]);

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

  const editingTimelineStepIndex = useMemo(() => {
    if (!project || !editingTimelineStepId) {
      return null;
    }

    const stepIndex = project.timeline.stub.shaderSequence.steps.findIndex(
      (step) => step.id === editingTimelineStepId,
    );
    return stepIndex >= 0 ? stepIndex : null;
  }, [editingTimelineStepId, project]);

  const dirtyTimelineDraftCount = useMemo(
    () =>
      project?.studio.savedShaders.filter((shader) => shader.isTemporary && shader.isDirty).length ?? 0,
    [project],
  );

  useEffect(() => {
    if (!dirtyTimelineDraftCount) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyTimelineDraftCount]);

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

  const clearGeneratedShaderRetry = () => {
    generatedShaderRetryRef.current = null;
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

    updateProject((currentProject) => ({
      ...currentProject,
      library: {
        ...currentProject.library,
        activeAssetId:
          currentProject.library.activeAssetId === activeAsset.id
            ? null
            : currentProject.library.activeAssetId,
      },
      playback: {
        ...currentProject.playback,
        activeAssetId:
          currentProject.playback.activeAssetId === activeAsset.id
            ? null
            : currentProject.playback.activeAssetId,
        transport:
          currentProject.playback.activeAssetId === activeAsset.id
            ? pauseTransport(currentProject.playback.transport)
            : currentProject.playback.transport,
      },
    }));
    setStatusMessage(`Stored asset "${activeAsset.name}" could not be restored. Load it again.`);
  }, [activeAsset, activeAssetResolution.status, updateProject]);

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

  const handleTimelineLoopToggle = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: {
          ...currentProject.playback.transport,
          loop: !currentProject.playback.transport.loop,
        },
      },
    }));
  }, [updateProject]);

  const handleTimelineSequenceEnabledChange = useCallback((enabled: boolean) => {
    updateProject((currentProject) => ({
      ...currentProject,
      timeline: {
        stub: {
          ...currentProject.timeline.stub,
          shaderSequence: {
            ...currentProject.timeline.stub.shaderSequence,
            enabled,
          },
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

  const handleTimelineSharedTransitionChange = useCallback((
    patch: {
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
    if (patch.shaderId && editingTimelineStepId === stepId) {
      setEditingTimelineStepId(null);
    }

    updateProject((currentProject) =>
      pruneTemporaryTimelineShaders({
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              focusedStepId: stepId,
              steps: currentProject.timeline.stub.shaderSequence.steps.map((step) => {
                if (step.id !== stepId) {
                  return step;
                }

                const durationSeconds = clampTimelineStepDuration(
                  patch.durationSeconds ?? step.durationSeconds,
                );

                return {
                  ...step,
                  ...patch,
                  durationSeconds,
                  transitionDurationSeconds: clampTransitionDuration(
                    durationSeconds,
                    patch.transitionDurationSeconds ?? step.transitionDurationSeconds,
                  ),
                };
              }),
            },
          },
        },
      }),
    );
  }, [editingTimelineStepId, updateProject]);

  const resolveTimelineStepShader = useCallback((
    currentProject: ProjectDocument,
    requestedShaderId: string,
  ) => {
    const liveShaderId = currentProject.studio.activeShaderId;
    const liveShaderName = currentProject.studio.activeShaderName;
    const liveShaderCode = currentProject.studio.activeShaderCode;
    const savedShader = currentProject.studio.savedShaders.find((shader) => shader.id === requestedShaderId);

    if (savedShader) {
      return {
        shaderId: savedShader.id,
        shaderName: savedShader.name,
        nextSavedShaders: currentProject.studio.savedShaders,
        savedLiveSnapshot: false,
      };
    }

    if (requestedShaderId === liveShaderId) {
      const snapshot = createSavedShaderRecord(
        liveShaderName,
        liveShaderCode,
        currentProject.studio.uniformValues,
      );
      return {
        shaderId: snapshot.id,
        shaderName: snapshot.name,
        nextSavedShaders: [...currentProject.studio.savedShaders, snapshot],
        savedLiveSnapshot: true,
      };
    }

    return null;
  }, []);

  const handleTimelineAddStep = useCallback(() => {
    const fallbackShaderId = project?.studio.activeShaderId ?? project?.studio.savedShaders[0]?.id ?? '';
    if (!fallbackShaderId) {
      return;
    }

    let nextStatusMessage = '';
    updateProject((currentProject) => {
      const timelineShader = resolveTimelineStepShader(currentProject, fallbackShaderId);
      if (!timelineShader) {
        return currentProject;
      }
      const nextStep = createTimelineShaderStep(timelineShader.shaderId);

      nextStatusMessage = timelineShader.savedLiveSnapshot
        ? `Saved "${timelineShader.shaderName}" and added it to the timeline.`
        : `Added "${timelineShader.shaderName}" to the timeline.`;

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          savedShaders: timelineShader.nextSavedShaders,
        },
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              enabled: true,
              focusedStepId: nextStep.id,
              steps: [
                ...currentProject.timeline.stub.shaderSequence.steps,
                nextStep,
              ],
            },
          },
        },
      };
    });

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [project?.studio.activeShaderId, project?.studio.savedShaders, resolveTimelineStepShader, updateProject]);

  const handleTimelineAddStepWithShader = useCallback((shaderId: string) => {
    if (!shaderId) {
      return;
    }

    let nextStatusMessage = '';
    updateProject((currentProject) => {
      const timelineShader = resolveTimelineStepShader(currentProject, shaderId);
      if (!timelineShader) {
        return currentProject;
      }
      const nextStep = createTimelineShaderStep(timelineShader.shaderId);

      nextStatusMessage = timelineShader.savedLiveSnapshot
        ? `Saved "${timelineShader.shaderName}" and added it to the timeline.`
        : `Added "${timelineShader.shaderName}" to the timeline.`;

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          savedShaders: timelineShader.nextSavedShaders,
        },
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              enabled: true,
              focusedStepId: nextStep.id,
              steps: [
                ...currentProject.timeline.stub.shaderSequence.steps,
                nextStep,
              ],
            },
          },
        },
      };
    });

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [resolveTimelineStepShader, updateProject]);

  const handleTimelineRemoveStep = useCallback((stepId: string) => {
    updateProject((currentProject) => {
      const nextSteps = currentProject.timeline.stub.shaderSequence.steps.filter(
        (step) => step.id !== stepId,
      );

      if (!nextSteps.length) {
        return currentProject;
      }

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
                  ? null
                  : currentProject.timeline.stub.shaderSequence.focusedStepId,
              ),
              steps: nextSteps,
            },
          },
        },
      });
    });
    if (editingTimelineStepId === stepId) {
      setEditingTimelineStepId(null);
    }
  }, [editingTimelineStepId, updateProject]);

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

      if (stepShader?.isTemporary) {
        const duplicateShader = createSavedShaderRecord(
          stepShader.name,
          stepShader.code,
          stepShader.uniformValues,
          {
            description: 'Temporary timeline shader draft.',
            group: 'Timeline Drafts',
            isTemporary: true,
            isDirty: stepShader.isDirty,
            sourceShaderId: stepShader.sourceShaderId ?? stepShader.id,
            ownerTimelineStepId: duplicateStepId,
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
      nextStatusMessage = `Duplicated "${shaderName}" in the timeline.`;

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

  const handleTimelineMoveStep = useCallback((stepId: string, direction: -1 | 1) => {
    updateProject((currentProject) => {
      const steps = [...currentProject.timeline.stub.shaderSequence.steps];
      const index = steps.findIndex((step) => step.id === stepId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) {
        return currentProject;
      }

      [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];

      return {
        ...currentProject,
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              focusedStepId: getPreferredTimelineStepId(
                steps,
                currentProject.timeline.stub.shaderSequence.focusedStepId,
              ),
              steps,
            },
          },
        },
      };
    });
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
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        uniformValues: {
          ...currentProject.studio.uniformValues,
          [name]: value,
        },
      },
    }));
  };

  const selectShader = (shaderId: string) => {
    if (!project) {
      return;
    }

    const shader = project.studio.savedShaders.find((item) => item.id === shaderId);
    if (!shader) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderId: shader.id,
        activeShaderName: shader.name,
        activeShaderCode: shader.code,
        shaderChatHistory: [],
        shaderVersions: [createShaderVersion('Base Node Source', shader.name, shader.code)],
        uniformValues: getSyncedShaderUniformValues(shader.code, shader.uniformValues),
      },
    }));
    setEditingTimelineStepId(shader.isTemporary ? shader.ownerTimelineStepId ?? null : null);
    clearGeneratedShaderRetry();
    setStatusMessage(
      shader.isTemporary
        ? `Editing timeline draft "${shader.name}".`
        : `Shader preset "${shader.name}" loaded.`,
    );
    closeMobileShaderDialog();
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
                    uniformValues: nextUniformValues,
                    description: 'Saved from the timeline editor.',
                    group: 'Saved',
                    isTemporary: false,
                    isDirty: false,
                    sourceShaderId: undefined,
                    ownerTimelineStepId: undefined,
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
      );

      return {
        ...currentProject,
        studio: {
          ...currentProject.studio,
          savedShaders: [...currentProject.studio.savedShaders, savedShader],
          activeShaderId: savedShader.id,
          activeShaderName: label,
        },
      };
    });
    if (activeTimelineDraft) {
      setEditingTimelineStepId(null);
    }
    setStatusMessage(
      activeTimelineDraft
        ? `Saved timeline shader "${label}" to the library.`
        : `Saved shader "${label}" to the library.`,
    );
  };

  const createNewShader = () => {
    const nextCode = blankShaderTemplate;
    const nextName = parseShaderName(nextCode);

    setCompilerError('');
    setAiPrompt('');
    clearGeneratedShaderRetry();
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderId: `new-${Date.now()}`,
        activeShaderName: nextName,
        activeShaderCode: nextCode,
        shaderChatHistory: [],
        shaderVersions: [createShaderVersion('New Shader', nextName, nextCode)],
      },
    }));
    setEditingTimelineStepId(null);
    setStatusMessage(`Started ${nextName}.`);
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
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderCode: version.code,
        activeShaderName: version.name,
      },
    }));
    setStatusMessage(`Restored "${version.name}".`);
  };

  const reloadShaderCode = () => {
    if (!project) {
      return;
    }

    clearGeneratedShaderRetry();
    setCompilerError('');
    setShaderCompileNonce((currentValue) => currentValue + 1);
    setStatusMessage('Recompiling current code...');
  };

  const handleShaderMutation = async (prompt: string) => {
    if (!project) {
      return;
    }

    if (!prompt.trim()) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage('Write a shader prompt first, then generate.');
      setStatusMessage('Add a prompt before generating.');
      return;
    }

    setAiLoading(true);
    setCompilerError('');
    clearGeneratedShaderRetry();
    setAiFeedbackTone('loading');
    setAiFeedbackMessage('');
    setStatusMessage('Generating shader...');

    const userMessage = buildShaderMutationPrompt(prompt, project.studio.activeShaderCode);

    try {
      const nextCode = await requestShaderMutation({
        settings: project.ai.settings,
        prompt,
        currentCode: project.studio.activeShaderCode,
        chatHistory: project.studio.shaderChatHistory,
      });
      const nextName = parseShaderName(nextCode);
      const versionId = crypto.randomUUID();
      generatedShaderRetryRef.current = {
        sourcePrompt: prompt,
        code: nextCode,
        autoRepairUsed: false,
        versionId,
        retryInFlight: false,
      };

      updateProject((currentProject) => ({
        ...currentProject,
        studio: {
          ...currentProject.studio,
          activeShaderId:
            currentProject.studio.savedShaders.find(
              (shader) =>
                shader.id === currentProject.studio.activeShaderId && shader.isTemporary,
            )?.id ?? `custom-${currentProject.ai.settings.shaderProvider}`,
          activeShaderName: nextName,
          activeShaderCode: nextCode,
          shaderChatHistory: [
            ...currentProject.studio.shaderChatHistory,
            { role: 'user' as const, text: userMessage },
            { role: 'model' as const, text: `\`\`\`glsl\n${nextCode}\n\`\`\`` },
          ],
          shaderVersions: [
            ...currentProject.studio.shaderVersions,
            createShaderVersion(prompt, nextName, nextCode, versionId),
          ],
        },
      }));
      setAiPrompt('');
      setAiFeedbackTone('success');
      setAiFeedbackMessage(`Shader applied to the stage: ${nextName}.`);
      setStatusMessage(`Shader updated: ${nextName}`);
      closeMobileShaderDialog();
    } catch (error) {
      const message = error instanceof Error ? sanitizeAiMessage(error.message) : 'Shader generation failed.';
      setCompilerError(message);
      setAiFeedbackTone('error');
      setAiFeedbackMessage(message);
      setStatusMessage('Shader generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!project || !compilerError.trim()) {
      return;
    }

    const generatedShaderState = generatedShaderRetryRef.current;
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

    if (generatedShaderState.versionId) {
      const failedVersionId = generatedShaderState.versionId;
      generatedShaderState.versionId = null;
      removeShaderVersion(failedVersionId);
    }

    if (generatedShaderState.autoRepairUsed) {
      setAiFeedbackTone('error');
      setAiFeedbackMessage(compilerError);
      setStatusMessage('Shader still has GLSL errors.');
      clearGeneratedShaderRetry();
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

    setAiLoading(true);
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
        const versionId = crypto.randomUUID();
        generatedShaderRetryRef.current = {
          sourcePrompt: originalPrompt,
          code: nextCode,
          autoRepairUsed: true,
          versionId,
          retryInFlight: false,
        };

        updateProject((currentProject) => ({
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderId:
              currentProject.studio.savedShaders.find(
                (shader) =>
                  shader.id === currentProject.studio.activeShaderId && shader.isTemporary,
              )?.id ?? `custom-${currentProject.ai.settings.shaderProvider}`,
            activeShaderName: nextName,
            activeShaderCode: nextCode,
            shaderVersions: [
              ...currentProject.studio.shaderVersions,
              createShaderVersion('Auto-fix after GLSL error', nextName, nextCode, versionId),
            ],
          },
        }));
        setAiFeedbackTone('success');
        setAiFeedbackMessage(`Shader auto-fixed and applied: ${nextName}.`);
        setStatusMessage(`Shader auto-fixed: ${nextName}`);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? sanitizeAiMessage(error.message) : 'Shader auto-fix failed.';
        setCompilerError(message);
        setAiFeedbackTone('error');
        setAiFeedbackMessage(message);
        setStatusMessage('Shader auto-fix failed.');
        clearGeneratedShaderRetry();
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [compilerError, project, removeShaderVersion, updateProject]);

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

  const handleTimelineEditStep = useCallback((stepId: string) => {
    let nextStatusMessage = '';

    updateProject((currentProject) => {
      const step = currentProject.timeline.stub.shaderSequence.steps.find((item) => item.id === stepId);
      if (!step) {
        return currentProject;
      }

      const sourceShader = currentProject.studio.savedShaders.find((shader) => shader.id === step.shaderId);
      if (!sourceShader) {
        return currentProject;
      }

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
              description: 'Temporary timeline shader draft.',
              group: 'Timeline Drafts',
              isTemporary: true,
              isDirty: false,
              sourceShaderId: sourceShader.sourceShaderId ?? sourceShader.id,
              ownerTimelineStepId: stepId,
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
        ? `Editing timeline step ${stepIndex + 1} draft.`
        : `Editing timeline step ${stepIndex + 1} as a temporary shader draft.`;

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
              : [createShaderVersion('Timeline Draft', editableShader.name, editableShader.code)],
            uniformValues: getSyncedShaderUniformValues(
              editableShader.code,
              editableShader.uniformValues,
            ),
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
        },
        [editableShader.id],
      );
    });

    clearGeneratedShaderRetry();
    setCompilerError('');
    setEditingTimelineStepId(stepId);

    if (isMobile) {
      updateMobileUiMode('full');
      setMobilePanel('studio');
      setIsMobileTimelineOpen(false);
    }

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [isMobile, updateProject]);

  const handleDiscardActiveTimelineDraft = useCallback(() => {
    if (!activeTimelineDraft) {
      return;
    }

    let nextStatusMessage = '';

    updateProject((currentProject) => {
      const draftShader = currentProject.studio.savedShaders.find(
        (shader) => shader.id === currentProject.studio.activeShaderId && shader.isTemporary,
      );
      if (!draftShader) {
        return currentProject;
      }

      const fallbackShader =
        currentProject.studio.savedShaders.find(
          (shader) => shader.id === draftShader.sourceShaderId && !shader.isTemporary,
        ) ?? currentProject.studio.savedShaders.find((shader) => !shader.isTemporary) ?? null;

      if (!fallbackShader) {
        return currentProject;
      }

      nextStatusMessage = `Discarded timeline draft "${draftShader.name}".`;

      return pruneTemporaryTimelineShaders({
        ...currentProject,
        studio: {
          ...currentProject.studio,
          activeShaderId: fallbackShader.id,
          activeShaderName: fallbackShader.name,
          activeShaderCode: fallbackShader.code,
          shaderChatHistory: [],
          shaderVersions: [createShaderVersion('Base Node Source', fallbackShader.name, fallbackShader.code)],
          uniformValues: getSyncedShaderUniformValues(
            fallbackShader.code,
            fallbackShader.uniformValues,
          ),
        },
        timeline: {
          stub: {
            ...currentProject.timeline.stub,
            shaderSequence: {
              ...currentProject.timeline.stub.shaderSequence,
              focusedStepId: getPreferredTimelineStepId(
                currentProject.timeline.stub.shaderSequence.steps.map((step) =>
                  step.shaderId === draftShader.id
                    ? {
                        ...step,
                        shaderId: draftShader.sourceShaderId ?? fallbackShader.id,
                      }
                    : step,
                ),
                draftShader.ownerTimelineStepId ?? currentProject.timeline.stub.shaderSequence.focusedStepId,
              ),
              steps: currentProject.timeline.stub.shaderSequence.steps.map((step) =>
                step.shaderId === draftShader.id
                  ? {
                      ...step,
                      shaderId: draftShader.sourceShaderId ?? fallbackShader.id,
                    }
                  : step,
              ),
            },
          },
        },
      });
    });

    clearGeneratedShaderRetry();
    setCompilerError('');
    setEditingTimelineStepId(null);

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [activeTimelineDraft, updateProject]);

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
  const timelineSelectableShaders = project.studio.savedShaders.some(
    (shader) => shader.id === project.studio.activeShaderId,
  )
    ? project.studio.savedShaders
    : [
        {
          id: project.studio.activeShaderId,
          name: project.studio.activeShaderName,
          code: project.studio.activeShaderCode,
          description: 'Current shader from the live editor.',
          group: 'Live',
          uniformValues: project.studio.uniformValues,
        },
        ...project.studio.savedShaders,
      ];
  const isActiveShaderSaved = project.studio.savedShaders.some(
    (shader) => shader.id === project.studio.activeShaderId,
  );
  const timelineSequenceEnabled =
    timelineStub.shaderSequence.enabled && timelineStub.shaderSequence.steps.length > 0;
  const timelineMarkers = timelineSequenceEnabled
    ? timelineStub.shaderSequence.mode === 'random'
      ? timelineStub.shaderSequence.steps.map((_, index) => `Pick ${index + 1}`)
      : timelineStub.shaderSequence.steps.map((step, index) => {
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
  const activeTimelineDraftSource =
    activeTimelineDraft?.sourceShaderId
      ? project.studio.savedShaders.find((shader) => shader.id === activeTimelineDraft.sourceShaderId) ?? null
      : null;
  const timelineDraftTargetLabel =
    activeTimelineDraft && editingTimelineStepIndex !== null
      ? `Timeline Step ${editingTimelineStepIndex + 1}`
      : activeTimelineDraft
        ? 'Timeline Draft'
        : null;
  const timelineDraftInfo =
    activeTimelineDraft
      ? {
          label: timelineDraftTargetLabel ?? 'Timeline Draft',
          sourceName: activeTimelineDraftSource?.name ?? null,
          isDirty: Boolean(activeTimelineDraft.isDirty),
        }
      : undefined;
  const handleActiveShaderCodeChange = (value: string) => {
    clearGeneratedShaderRetry();
    setCompilerError('');
    setShaderCompileNonce((currentValue) => currentValue + 1);
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderCode: value,
      },
    }));
  };

  const aiPanel = (
    <AiPanel
      prompt={aiPrompt}
      aiLoading={aiLoading}
      feedbackMessage={aiFeedbackMessage}
      feedbackTone={aiFeedbackTone}
      shaderError={compilerError}
      targetLabel={timelineDraftTargetLabel}
      targetStatus={activeTimelineDraft?.isDirty ? 'Unsaved Draft' : 'Temporary Draft'}
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
      onDiscardDraft={activeTimelineDraft ? handleDiscardActiveTimelineDraft : undefined}
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
      timelineDraft={timelineDraftInfo}
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
      onDiscardDraft={activeTimelineDraft ? handleDiscardActiveTimelineDraft : undefined}
      onBrowsePresets={() => setIsPresetBrowserOpen(true)}
      timelineDraft={timelineDraftInfo}
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
      assetName={activeAsset?.name ?? 'No asset selected'}
      assetKind={activeAsset?.kind ?? null}
      assetUrl={activeAssetUrl}
      activeShaderId={project.studio.activeShaderId}
      isActiveShaderSaved={isActiveShaderSaved}
      savedShaders={timelineSelectableShaders}
      editingStepId={editingTimelineStepId}
      sequence={timelineStub.shaderSequence}
      transport={project.playback.transport}
      durationSeconds={timelineDurationSeconds}
      markers={timelineMarkers}
      tracks={timelineTracks}
      onSeek={handleTimelineSeek}
      onPlayToggle={handlePlayToggle}
      onReset={handleTimelineReset}
      onToggleLoop={handleTimelineLoopToggle}
      onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
      onToggleRandomChoice={handleTimelineRandomChoiceToggle}
      onSequenceEnabledChange={handleTimelineSequenceEnabledChange}
      onSequenceModeChange={handleTimelineSequenceModeChange}
      onSequenceEditorViewChange={handleTimelineEditorViewChange}
      onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
      onSequenceStepChange={handleTimelineStepChange}
      onAddSequenceStep={handleTimelineAddStep}
      onAddSequenceStepWithShader={handleTimelineAddStepWithShader}
      onDuplicateSequenceStep={handleTimelineDuplicateStep}
      onRemoveSequenceStep={handleTimelineRemoveStep}
      onMoveSequenceStep={handleTimelineMoveStep}
      onResizeSequenceBoundary={handleTimelineResizeBoundary}
      onEditSequenceStep={handleTimelineEditStep}
      onSaveCurrentShader={saveCurrentShader}
    />
  );

  const useDesktopPaneLayout = !isMobile && uiPreferences.chromeVisible;
  const desktopGridTemplateColumns = `minmax(0, 1fr) 10px ${desktopLayout.rightSidebarWidth}px`;
  const desktopMainTopGridTemplateColumns = uiPreferences.sidebarVisible
    ? `${desktopLayout.leftSidebarWidth}px 10px minmax(0, 1fr)`
    : 'minmax(0, 1fr)';

  const stageViewport = (
    <section className="workspace-stage-column" onClick={handleStageReveal}>
      <TimelineStageRenderer
        asset={activeAsset}
        assetUrl={activeAssetUrl}
        assetUrlStatus={activeAssetResolution.status}
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
      savedShaders={project.studio.savedShaders}
      timeline={project.timeline.stub}
      shaderCompileNonce={shaderCompileNonce}
      stageTransform={workspacePreviewStageTransform}
      transport={project.playback.transport}
      forceActiveShaderPreview={editingTimelineStepId !== null}
      onCompilerError={setCompilerError}
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
                {desktopCodePanel}
                {desktopShaderToolsPanel}
                {desktopHistoryPanel}
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
        assetName={activeAsset?.name ?? 'No asset selected'}
        assetKind={activeAsset?.kind ?? null}
        assetUrl={activeAssetUrl}
        activeShaderId={project.studio.activeShaderId}
        isActiveShaderSaved={isActiveShaderSaved}
        savedShaders={timelineSelectableShaders}
        editingStepId={editingTimelineStepId}
        sequence={timelineStub.shaderSequence}
        transport={project.playback.transport}
        durationSeconds={timelineDurationSeconds}
        markers={timelineMarkers}
        tracks={timelineTracks}
        onSeek={handleTimelineSeek}
        onPlayToggle={handlePlayToggle}
        onReset={handleTimelineReset}
        onToggleLoop={handleTimelineLoopToggle}
        onToggleSingleStepLoop={handleTimelineSingleStepLoopToggle}
        onToggleRandomChoice={handleTimelineRandomChoiceToggle}
        onSequenceEnabledChange={handleTimelineSequenceEnabledChange}
        onSequenceModeChange={handleTimelineSequenceModeChange}
        onSequenceEditorViewChange={handleTimelineEditorViewChange}
        onSequenceSharedTransitionChange={handleTimelineSharedTransitionChange}
        onSequenceStepChange={handleTimelineStepChange}
        onAddSequenceStep={handleTimelineAddStep}
        onAddSequenceStepWithShader={handleTimelineAddStepWithShader}
        onDuplicateSequenceStep={handleTimelineDuplicateStep}
        onRemoveSequenceStep={handleTimelineRemoveStep}
        onMoveSequenceStep={handleTimelineMoveStep}
        onResizeSequenceBoundary={handleTimelineResizeBoundary}
        onEditSequenceStep={handleTimelineEditStep}
        onSaveCurrentShader={saveCurrentShader}
        onClose={() => setIsMobileTimelineOpen(false)}
      />

      <ApiSettingsDialog
        open={isApiSettingsOpen}
        settings={project.ai.settings}
        onClose={() => setIsApiSettingsOpen(false)}
        onChange={updateAiSetting}
      />

      <PresetBrowserDialog
        open={isPresetBrowserOpen}
        presets={project.studio.savedShaders}
        activeShaderId={project.studio.activeShaderId}
        assetUrl={activeAssetUrl}
        onSelect={selectShader}
        onClose={() => setIsPresetBrowserOpen(false)}
      />
    </div>
  );
}
