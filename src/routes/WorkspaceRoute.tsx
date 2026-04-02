import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AiPanel } from '../components/AiPanel';
import { ApiSettingsDialog } from '../components/ApiSettingsDialog';
import { AssetLibraryPanel } from '../components/AssetLibraryPanel';
import { type MobilePanelKey, MobileChrome } from '../components/MobileChrome';
import { MappingPad, type MappingAction } from '../components/MappingPad';
import { MappingPanel } from '../components/MappingPanel';
import { RoadmapPanel } from '../components/RoadmapPanel';
import { StageRenderer } from '../components/StageRenderer';
import { StudioPanel } from '../components/StudioPanel';
import { WorkspaceToolbar } from '../components/WorkspaceToolbar';
import {
  DEFAULT_GOOGLE_SHADER_MODEL,
  DEFAULT_OPENAI_SHADER_MODEL,
  DEFAULT_UI_PREFERENCES,
  createDefaultProject,
} from '../config';
import { pauseTransport, playTransport, resetTransport } from '../lib/clock';
import { parseShaderName, parseUniforms, syncUniformValues } from '../lib/shader';
import {
  getActiveShaderModel,
  getShaderProviderLabel,
  requestShaderMutation,
} from '../lib/shaderGeneration';
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
import type {
  AiSettings,
  AssetKind,
  AssetRecord,
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
    shaderProvider: legacySettings.shaderProvider === 'google' ? 'google' : 'openai',
    openaiShaderModel:
      legacySettings.openaiShaderModel ??
      legacySettings.shaderModel ??
      DEFAULT_OPENAI_SHADER_MODEL,
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
      activeShaderName: parseShaderName(project.studio.activeShaderCode),
      uniformValues: syncUniformValues(project.studio.uniformValues, uniformDefinitions),
    },
  };
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
  const [statusMessage, setStatusMessage] = useState('V3 foundation active');
  const [mobilePanel, setMobilePanel] = useState<MobilePanelKey>(null);
  const [newUniformName, setNewUniformName] = useState('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const activeSessionId = project?.sessionId ?? null;

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

  const activeAssetUrl = useAssetObjectUrl(activeAsset);

  const updateProject = (updater: (currentProject: ProjectDocument) => ProjectDocument) => {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      return updater(currentProject);
    });
  };

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
    setStatusMessage('Active asset updated.');
  };

  const handleAssetDelete = async (assetId: string) => {
    await deleteAssetBlob(assetId);
    updateProject((currentProject) => {
      const nextAssets = currentProject.library.assets.filter((asset) => asset.id !== assetId);
      const nextActiveId =
        currentProject.library.activeAssetId === assetId
          ? nextAssets[0]?.id ?? null
          : currentProject.library.activeAssetId;

      return {
        ...currentProject,
        library: {
          ...currentProject.library,
          assets: nextAssets,
          activeAssetId: nextActiveId,
        },
        playback: {
          ...currentProject.playback,
          activeAssetId:
            currentProject.playback.activeAssetId === assetId
              ? nextActiveId
              : currentProject.playback.activeAssetId,
        },
      };
    });
    setStatusMessage('Asset removed from the library.');
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

  const handlePlaybackReset = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      playback: {
        ...currentProject.playback,
        transport: resetTransport(currentProject.playback.transport),
      },
    }));
    setStatusMessage('Playback clock reset.');
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

  const toggleMoveMode = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      mapping: {
        stageTransform: {
          ...currentProject.mapping.stageTransform,
          moveMode: !currentProject.mapping.stageTransform.moveMode,
        },
      },
    }));
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
          },
        ],
        activeShaderName: label,
      },
    }));
    setStatusMessage(`Saved shader "${label}" to the library.`);
  };

  const restoreShaderVersion = (versionId: string) => {
    if (!project) {
      return;
    }

    const version = project.studio.shaderVersions.find((item) => item.id === versionId);
    if (!version) {
      return;
    }

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

  const handleShaderMutation = async (prompt: string) => {
    if (!project || !prompt.trim()) {
      return;
    }

    setAiLoading(true);
    setCompilerError('');
    const providerLabel = getShaderProviderLabel(project.ai.settings.shaderProvider);
    setStatusMessage(`Requesting shader mutation from ${providerLabel}...`);

    try {
      const nextCode = await requestShaderMutation({
        settings: project.ai.settings,
        prompt,
        currentCode: project.studio.activeShaderCode,
      });
      const nextName = parseShaderName(nextCode);

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
              id: crypto.randomUUID(),
              prompt,
              name: nextName,
              code: nextCode,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
      setAiPrompt('');
      setStatusMessage(`${providerLabel} updated shader: ${nextName}`);
    } catch (error) {
      setCompilerError(error instanceof Error ? error.message : 'Shader mutation failed.');
      setStatusMessage(`${providerLabel} mutation failed.`);
    } finally {
      setAiLoading(false);
    }
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

  const toggleChromeVisibility = () => {
    setUiPreferences((currentValue) => ({
      ...currentValue,
      chromeVisible: !currentValue.chromeVisible,
    }));
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
  const stageControlsVisible = uiPreferences.chromeVisible && stageTransform.moveMode;

  const libraryPanel = (
    <AssetLibraryPanel
      assets={project.library.assets}
      activeAssetId={activeAsset?.id ?? null}
      onLoadAsset={openFilePicker}
      onSelectAsset={handleAssetSelect}
      onRemoveAsset={(assetId) => {
        void handleAssetDelete(assetId);
      }}
    />
  );

  const studioPanel = (
    <StudioPanel
      savedShaders={project.studio.savedShaders}
      activeShaderId={project.studio.activeShaderId}
      onSelectShader={selectShader}
      onSaveShader={saveCurrentShader}
      onResetClock={handlePlaybackReset}
      uniformDefinitions={uniformDefinitions}
      uniformValues={project.studio.uniformValues}
      onUniformChange={handleUniformChange}
      newUniformName={newUniformName}
      onNewUniformNameChange={setNewUniformName}
      onQuickAddUniform={() => {
        void handleUniformQuickAdd();
      }}
      shaderCode={project.studio.activeShaderCode}
      onShaderCodeChange={(value) =>
        updateProject((currentProject) => ({
          ...currentProject,
          studio: {
            ...currentProject.studio,
            activeShaderCode: value,
          },
        }))
      }
      compilerError={compilerError}
      versions={project.studio.shaderVersions}
      onRestoreVersion={restoreShaderVersion}
    />
  );

  const aiPanel = (
    <AiPanel
      shaderProvider={project.ai.settings.shaderProvider}
      activeModel={getActiveShaderModel(project.ai.settings)}
      prompt={aiPrompt}
      aiLoading={aiLoading}
      onShaderProviderChange={(value) => updateAiSetting('shaderProvider', value)}
      onPromptChange={setAiPrompt}
      onOpenSettings={() => setIsApiSettingsOpen(true)}
      onSubmit={() => {
        void handleShaderMutation(aiPrompt);
      }}
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
    />
  );

  const roadmapPanel = <RoadmapPanel />;

  return (
    <div
      className={`workspace-shell ${isMobile ? 'workspace-shell-mobile' : ''} ${
        uiPreferences.workspaceMode === 'immersive' ? 'workspace-shell-immersive' : ''
      } ${uiPreferences.chromeVisible ? 'workspace-shell-chrome' : 'workspace-shell-clean'}`}
    >
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
          onPlayToggle={handlePlayToggle}
          onOpenOutput={handleOutputWindowOpen}
          onToggleWorkspaceMode={() =>
            updateWorkspaceMode(uiPreferences.workspaceMode === 'immersive' ? 'split' : 'immersive')
          }
        />
      ) : null}

      <div className="workspace-body">
        <section className="workspace-stage-column">
          <StageRenderer
            asset={activeAsset}
            assetUrl={activeAssetUrl}
            shaderCode={project.studio.activeShaderCode}
            uniformDefinitions={uniformDefinitions}
            uniformValues={project.studio.uniformValues}
            stageTransform={project.mapping.stageTransform}
            transport={project.playback.transport}
            onCompilerError={setCompilerError}
            stageLabel={isMobile ? 'Projection View' : 'Stage'}
          />

          {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}

          {stageControlsVisible ? (
            <div className="stage-mapping-overlay">
              <MappingPad onAction={handleMappingAction} />
            </div>
          ) : null}

          {isMobile && !uiPreferences.chromeVisible ? (
            <button type="button" className="reveal-ui-button" onClick={toggleChromeVisibility}>
              Show Controls
            </button>
          ) : null}
        </section>

        {!isMobile && uiPreferences.chromeVisible ? (
          <aside className="workspace-sidebar">
            {libraryPanel}
            {studioPanel}
            {aiPanel}
            {mappingPanel}
            {roadmapPanel}
          </aside>
        ) : null}
      </div>

      {isMobile && uiPreferences.chromeVisible ? (
        <MobileChrome
          activeAssetName={activeAsset?.name ?? 'No asset selected'}
          isPlaying={project.playback.transport.isPlaying}
          activePanel={mobilePanel}
          onOpenOutput={handleOutputWindowOpen}
          onHideUi={toggleChromeVisibility}
          onPlayToggle={handlePlayToggle}
          onPanelChange={setMobilePanel}
          panels={{
            library: libraryPanel,
            studio: studioPanel,
            ai: aiPanel,
            mapping: (
              <>
                {mappingPanel}
                {roadmapPanel}
              </>
            ),
          }}
        />
      ) : null}

      <ApiSettingsDialog
        open={isApiSettingsOpen}
        settings={project.ai.settings}
        onClose={() => setIsApiSettingsOpen(false)}
        onChange={updateAiSetting}
      />
    </div>
  );
}
