import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiPanel } from '../components/AiPanel';
import { ApiSettingsDialog } from '../components/ApiSettingsDialog';
import { type MobilePanelKey, MobileChrome } from '../components/MobileChrome';
import { MappingPad, type MappingAction } from '../components/MappingPad';
import { MappingPanel } from '../components/MappingPanel';
import { MobilePrecisionOverlay } from '../components/MobilePrecisionOverlay';
import { MobileUniformOverlay } from '../components/MobileUniformOverlay';
import { PresetBrowserDialog } from '../components/PresetBrowserDialog';
import { StageRenderer } from '../components/StageRenderer';
import { StudioPanel } from '../components/StudioPanel';
import { WorkspaceToolbar } from '../components/WorkspaceToolbar';
import {
  DEFAULT_GOOGLE_SHADER_MODEL,
  DEFAULT_SHADERS,
  DEFAULT_UI_PREFERENCES,
  createDefaultProject,
} from '../config';
import { pauseTransport, playTransport } from '../lib/clock';
import { parseShaderName, parseUniforms, syncUniformValues } from '../lib/shader';
import { requestShaderMutation } from '../lib/shaderGeneration';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { createSessionSync } from '../lib/sessionSync';
import {
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
  ShaderUniformValue,
  StageTransform,
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
  const [mobilePanel, setMobilePanel] = useState<MobilePanelKey>(null);
  const [newUniformName, setNewUniformName] = useState('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const generatedShaderRetryRef = useRef<{
    sourcePrompt: string;
    code: string;
    autoRepairUsed: boolean;
    versionId: string | null;
    retryInFlight: boolean;
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
        shaderVersions: [
          {
            id: crypto.randomUUID(),
            prompt: 'Base Node Source',
            name: shader.name,
            code: shader.code,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }));
    clearGeneratedShaderRetry();
    setStatusMessage(`Shader preset "${shader.name}" loaded.`);
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

    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        savedShaders: [
          ...currentProject.studio.savedShaders,
          {
            id: `saved-${Date.now()}`,
            name: label,
            code: currentProject.studio.activeShaderCode,
            description: 'Saved from the current workspace state.',
            group: 'Saved',
          },
        ],
        activeShaderName: label,
      },
    }));
    setStatusMessage(`Saved shader "${label}" to the library.`);
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
        shaderVersions: [
          {
            id: crypto.randomUUID(),
            prompt: 'New Shader',
            name: nextName,
            code: nextCode,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }));
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

    const latestVersion =
      project.studio.shaderVersions[project.studio.shaderVersions.length - 1] ?? null;
    const activePreset =
      project.studio.savedShaders.find((shader) => shader.id === project.studio.activeShaderId) ??
      null;
    const nextCode = latestVersion?.code ?? activePreset?.code;

    if (!nextCode) {
      return;
    }

    if (nextCode === project.studio.activeShaderCode) {
      setStatusMessage('Code already matches the latest shader version.');
      return;
    }

    clearGeneratedShaderRetry();
    setCompilerError('');
    updateProject((currentProject) => ({
      ...currentProject,
      studio: {
        ...currentProject.studio,
        activeShaderCode: nextCode,
        activeShaderName: latestVersion?.name ?? activePreset?.name ?? parseShaderName(nextCode),
      },
    }));
    setStatusMessage(
      latestVersion
        ? `Code reloaded from "${latestVersion.name}".`
        : `Code reloaded from "${activePreset?.name ?? 'current shader'}".`,
    );
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
          activeShaderId: `custom-${currentProject.ai.settings.shaderProvider}`,
          activeShaderName: nextName,
          activeShaderCode: nextCode,
          shaderChatHistory: [
            ...currentProject.studio.shaderChatHistory,
            { role: 'user' as const, text: userMessage },
            { role: 'model' as const, text: `\`\`\`glsl\n${nextCode}\n\`\`\`` },
          ],
          shaderVersions: [
            ...currentProject.studio.shaderVersions,
            {
              id: versionId,
              prompt,
              name: nextName,
              code: nextCode,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
      setAiPrompt('');
      setAiFeedbackTone('success');
      setAiFeedbackMessage(`Shader applied to the stage: ${nextName}.`);
      setStatusMessage(`Shader updated: ${nextName}`);
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
            activeShaderId: `custom-${currentProject.ai.settings.shaderProvider}`,
            activeShaderName: nextName,
            activeShaderCode: nextCode,
            shaderVersions: [
              ...currentProject.studio.shaderVersions,
              {
                id: versionId,
                prompt: 'Auto-fix after GLSL error',
                name: nextName,
                code: nextCode,
                createdAt: new Date().toISOString(),
              },
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

    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      sessionSyncRef.current?.publish(project);
      setStatusMessage('Projection window focused.');
      return;
    }

    const popup = window.open(nextUrl, 'mapshroom-output', 'popup,width=1440,height=900');
    if (!popup) {
      setStatusMessage('Popup blocked. Allow popups to open the output window.');
      return;
    }

    outputWindowRef.current = popup;
    sessionSyncRef.current?.publish(project);
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

  const handleMobileToggleMapping = () => {
    updateMobileUiMode('full');
    toggleMoveMode();
  };

  const handleStageReveal = useCallback(() => {
    if (!isMobile || uiPreferences.mobileUiMode !== 'hidden') return;
    updateMobileUiMode('bar');
  }, [isMobile, uiPreferences.mobileUiMode]);

  const handleMobileHide = () => {
    setMobilePanel(null);
    setMoveMode(false);
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
  const mobileUiMode = uiPreferences.mobileUiMode;
  const mobileChromeVisible = mobileUiMode !== 'hidden';
  const stageControlsVisible = isMobile
    ? mobileUiMode === 'full' && stageTransform.moveMode
    : uiPreferences.chromeVisible && stageTransform.moveMode;

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

  const latestShaderVersion =
    project.studio.shaderVersions[project.studio.shaderVersions.length - 1] ?? null;
  const latestShaderSource =
    latestShaderVersion?.code ??
    project.studio.savedShaders.find((shader) => shader.id === project.studio.activeShaderId)
      ?.code ??
    '';

  const studioPanel = (
    <StudioPanel
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      onNewShader={() => {
        createNewShader();
        setMobilePanel(null);
      }}
      onSelectShader={selectShader}
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
      onShaderCodeChange={(value) => {
        clearGeneratedShaderRetry();
        updateProject((currentProject) => ({
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderCode: value,
          },
        }));
      }}
      compilerError={compilerError}
      aiLoading={aiLoading}
      onFixError={handleFixError}
      onBrowsePresets={() => setIsPresetBrowserOpen(true)}
      onReloadShaderCode={reloadShaderCode}
      canReloadShaderCode={
        Boolean(latestShaderSource) && latestShaderSource !== project.studio.activeShaderCode
      }
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
    />
  );

  const mobileShaderPanel = (
    <>
      {aiPanel}
      {studioPanel}
    </>
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
          onLoadAsset={openFilePicker}
          onOpenSettings={() => setIsApiSettingsOpen(true)}
          onPlayToggle={handlePlayToggle}
          onOpenOutput={handleOutputWindowOpen}
          onToggleWorkspaceMode={() =>
            updateWorkspaceMode(uiPreferences.workspaceMode === 'immersive' ? 'split' : 'immersive')
          }
        />
      ) : null}

      <div className="workspace-body">
        <section className="workspace-stage-column" onClick={handleStageReveal}>
          <StageRenderer
            asset={activeAsset}
            assetUrl={activeAssetUrl}
            assetUrlStatus={activeAssetResolution.status}
            shaderCode={project.studio.activeShaderCode}
            uniformDefinitions={uniformDefinitions}
            uniformValues={project.studio.uniformValues}
            stageTransform={project.mapping.stageTransform}
            transport={project.playback.transport}
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
            <div
              className={`stage-mapping-overlay ${isMobile ? 'stage-mapping-overlay-mobile' : ''}`}
            >
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

          {!isMobile && uiPreferences.chromeVisible ? (
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

        {!isMobile && uiPreferences.chromeVisible && uiPreferences.sidebarVisible ? (
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-scroll">
              {aiPanel}
              {studioPanel}
              {mappingPanel}
            </div>
          </aside>
        ) : null}
      </div>

      {isMobile && mobileChromeVisible ? (
        <MobileChrome
          activeAssetName={activeAsset?.name ?? 'No asset selected'}
          isPlaying={project.playback.transport.isPlaying}
          uiMode={mobileUiMode === 'bar' ? 'bar' : 'full'}
          activePanel={mobilePanel}
          onLoadAsset={openFilePicker}
          onOpenSettings={() => setIsApiSettingsOpen(true)}
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
