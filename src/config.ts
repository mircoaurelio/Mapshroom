import type { ProjectDocument, StageTransform, UiPreferences } from './types';
import { shaderPresetList, shaderPresets } from './shaders/presets';
import {
  pickRandomShaderPresets,
  createStarterTimelineSteps,
  STARTER_TIMELINE_SHADER_COUNT,
} from './lib/bundledProjects';
import { createTimelineShaderStep, getShaderTimelineDuration } from './lib/timeline';
import {
  BUNDLED_EMPTY_CANVAS_ASSET,
  BUNDLED_EMPTY_CANVAS_ASSET_ID,
  BUNDLED_STATUE_ASSET_ID,
  BUNDLED_VERTICAL_STAGE_ASSET_ID,
  BUNDLED_WHITE_CANVAS_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
  isInternalCanvasAssetId,
  pickStarterBundledAssetId,
} from './lib/bundledAssets';
import { normalizeTimelineStepAssetSettings } from './lib/timelineAssetSettings';
import { DEFAULT_STAGE_DISTORTION } from './lib/distortion';
import { blankShaderTemplate } from './shaders/templates/blankShader';
import {
  fullCanvasShaderTemplate,
  fullCanvasShaderUniformValues,
} from './shaders/templates/fullCanvasShader';

export const APP_VERSION = 3;
export const PROJECT_STORAGE_PREFIX = 'mapshroom-v3:project:';
export const PROJECT_LIBRARY_STORAGE_KEY = 'mapshroom-v3:projects';
export const UI_STORAGE_KEY = 'mapshroom-v3:ui';
export const ACTIVE_SESSION_KEY = 'mapshroom-v3:active-session';
export const OPENAI_API_KEY_STORAGE_KEY = 'mapshroom-v3:openai-api-key';
export const ANTHROPIC_API_KEY_STORAGE_KEY = 'mapshroom-v3:anthropic-api-key';
export const GOOGLE_API_KEY_STORAGE_KEY = 'mapshroom-v3:google-api-key';
export const ASSET_DB_NAME = 'mapshroom-v3';
export const ASSET_DB_VERSION = 1;
export const ASSET_STORE_NAME = 'asset-blobs';
export const BROADCAST_PREFIX = 'mapshroom-v3:channel:';
export const DEFAULT_GOOGLE_API_VERSION = 'v1beta';
export const DEFAULT_GOOGLE_SHADER_MODEL = 'gemini-3.5-flash';
export const DEFAULT_GOOGLE_MODEL_OPTIONS = [
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
];
export const DEFAULT_OPENAI_SHADER_MODEL = 'gpt-5.6-terra';
export const DEFAULT_OPENAI_MODEL_OPTIONS = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
];
export const DEFAULT_ANTHROPIC_SHADER_MODEL = 'claude-sonnet-5';
export const DEFAULT_ANTHROPIC_MODEL_OPTIONS = [
  'claude-fable-5',
  'claude-opus-4-8',
  'claude-sonnet-5',
  'claude-haiku-4-5-20251001',
];
export const SHADER_GENERATION_TEMPERATURE = 0.1;
export const DEFAULT_LOCAL_SHADER_MODEL = '';

export { STARTER_TIMELINE_SHADER_COUNT };

export const DEFAULT_SHADERS = shaderPresets;

export const DEFAULT_STAGE_TRANSFORM: StageTransform = {
  offsetX: 0,
  offsetY: 0,
  widthAdjust: 0,
  heightAdjust: 0,
  precision: 12,
  rotationDegrees: 0,
  moveMode: false,
  rotationLocked: false,
  showGrid: false,
  distortMode: false,
  distortion: DEFAULT_STAGE_DISTORTION,
};

/** Nudge the portrait starter so the subject reads centered on a phone viewport. */
export const MOBILE_VERTICAL_STAGE_OFFSET_Y = -36;

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  workspaceMode: 'split',
  chromeVisible: true,
  sidebarVisible: true,
  mobileUiMode: 'bar',
  desktopSlidersWindowEnabled: true,
  colorTheme: 'green',
};

if (shaderPresetList.length === 0) {
  throw new Error('Mapshroom requires at least one shader preset.');
}

export function createDefaultProject(
  sessionId: string,
  options: { isMobile?: boolean } = {},
): ProjectDocument {
  const activeAssetId = pickStarterBundledAssetId(options.isMobile);
  const preferredTemplate = activeAssetId === BUNDLED_STATUE_ASSET_ID ? 'sculpture' : 'stage';
  const preferredPool = shaderPresetList.filter((preset) =>
    (preset.templates ?? [preset.template]).includes(preferredTemplate),
  );
  const starterPresets = pickRandomShaderPresets(
    STARTER_TIMELINE_SHADER_COUNT,
    preferredPool.length >= STARTER_TIMELINE_SHADER_COUNT ? preferredPool : shaderPresetList,
  );
  const activeShader = starterPresets[0]!;
  const steps = createStarterTimelineSteps(starterPresets);
  const defaultShaderVersions = [
    {
      id: crypto.randomUUID(),
      prompt: 'Base Node Source',
      name: activeShader.name,
      code: activeShader.code,
      createdAt: new Date().toISOString(),
    },
  ];
  const stageTransform: StageTransform =
    activeAssetId === BUNDLED_VERTICAL_STAGE_ASSET_ID
      ? { ...DEFAULT_STAGE_TRANSFORM, offsetY: MOBILE_VERTICAL_STAGE_OFFSET_Y }
      : { ...DEFAULT_STAGE_TRANSFORM };

  return {
    version: APP_VERSION,
    sessionId,
    name: 'Untitled Project',
    library: {
      assets: DEFAULT_BUNDLED_ASSETS,
      activeAssetId,
    },
    studio: {
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: defaultShaderVersions,
      savedShaders: Object.values(DEFAULT_SHADERS).map((shader) => ({
        ...shader,
        versions:
          shader.id === activeShader.id
            ? defaultShaderVersions
            : [
                {
                  id: crypto.randomUUID(),
                  prompt: 'Base Node Source',
                  name: shader.name,
                  code: shader.code,
                  createdAt: new Date().toISOString(),
                },
              ],
      })),
      shaderChatHistory: [],
      uniformValues: activeShader.uniformValues ?? {},
    },
    mapping: {
      stageTransform,
    },
    playback: {
      activeAssetId,
      transport: {
        isPlaying: true,
        currentTimeSeconds: 0,
        renderTimeOffsetSeconds: 0,
        anchorTimestampMs: null,
        playbackRate: 1,
        loop: true,
        externalClockEnabled: false,
      },
    },
    ai: {
      settings: {
        openaiApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
        runwayApiKey: '',
        shaderProvider: 'google',
        openaiShaderModel: DEFAULT_OPENAI_SHADER_MODEL,
        anthropicShaderModel: DEFAULT_ANTHROPIC_SHADER_MODEL,
        googleShaderModel: DEFAULT_GOOGLE_SHADER_MODEL,
        shaderRuntime: '',
        localShaderModel: DEFAULT_LOCAL_SHADER_MODEL,
        visionEnabled: false,
        videoGenProvider: 'runway',
      },
    },
    timeline: {
      stub: {
        enabled: false,
        durationSeconds: getShaderTimelineDuration(steps),
        markers: ['intro', 'verse', 'drop'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Assets', type: 'media' },
          { id: 'timeline-track-effects', label: 'Effects', type: 'automation' },
        ],
        shaderSequence: {
          enabled: true,
          mode: 'randomMix',
          editorView: 'simple',
          stagePreviewMode: 'timeline',
          focusedStepId: steps[0]?.id ?? null,
          pinnedStepId: null,
          randomSeedToken: crypto.randomUUID(),
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: false,
          sharedTransitionEffect: 'mix',
          sharedTransitionDurationSeconds: 0.75,
          sharedSectionDurationSeconds: 8,
          steps,
        },
      },
    },
    export: {
      stub: {
        enabled: false,
        deterministicRenderReady: true,
        lastRequestedAt: null,
      },
    },
  };
}

export function createEmptyProject(
  sessionId: string,
  options: { isMobile?: boolean } = {},
): ProjectDocument {
  const project = createDefaultProject(sessionId, options);
  const shaderId = `empty-project-${crypto.randomUUID()}`;
  const shaderName = 'Full Canvas Flow';
  const shaderCode = fullCanvasShaderTemplate;
  const shaderVersion = {
    id: crypto.randomUUID(),
    prompt: 'Empty project base shader',
    name: shaderName,
    code: shaderCode,
    createdAt: new Date().toISOString(),
  };
  const emptyShader = {
    id: shaderId,
    name: shaderName,
    code: shaderCode,
    description:
      'A full-frame procedural shader for an empty project that renders across every pixel.',
    template: 'stage' as const,
    group: 'Project',
    versions: [shaderVersion],
    uniformValues: fullCanvasShaderUniformValues,
    lastValidCode: shaderCode,
    lastValidUniformValues: fullCanvasShaderUniformValues,
  };
  const timelineStep = {
    ...createTimelineShaderStep(shaderId),
    assetSettings: normalizeTimelineStepAssetSettings({
      fitMode: 'stretch',
      opacity: 1,
      quality: 'high',
      useStepAssetAsShaderBase: true,
    }),
  };

  return {
    ...project,
    name: 'Untitled Empty Project',
    library: {
      assets: [...DEFAULT_BUNDLED_ASSETS, BUNDLED_EMPTY_CANVAS_ASSET],
      activeAssetId: BUNDLED_EMPTY_CANVAS_ASSET_ID,
    },
    studio: {
      ...project.studio,
      activeShaderId: shaderId,
      activeShaderName: shaderName,
      activeShaderCode: shaderCode,
      shaderVersions: [shaderVersion],
      savedShaders: [...project.studio.savedShaders, emptyShader],
      shaderChatHistory: [],
      uniformValues: fullCanvasShaderUniformValues,
    },
    playback: {
      ...project.playback,
      activeAssetId: BUNDLED_EMPTY_CANVAS_ASSET_ID,
    },
    timeline: {
      stub: {
        ...project.timeline.stub,
        durationSeconds: timelineStep.durationSeconds,
        markers: [],
        tracks: [],
        shaderSequence: {
          ...project.timeline.stub.shaderSequence,
          mode: 'sequence',
          stagePreviewMode: 'timeline',
          focusedStepId: timelineStep.id,
          randomSeedToken: crypto.randomUUID(),
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: false,
          steps: [timelineStep],
        },
      },
    },
  };
}

/** Upgrade empty projects from the visible white source and untouched blank shader. */
export function upgradeLegacyEmptyProject(project: ProjectDocument): ProjectDocument {
  const legacyShaderCode = blankShaderTemplate.replace(
    '// NAME: New Shader',
    '// NAME: Blank Shader',
  );
  const usesLegacyWhiteCanvas =
    project.playback?.activeAssetId === BUNDLED_WHITE_CANVAS_ASSET_ID ||
    project.library?.activeAssetId === BUNDLED_WHITE_CANVAS_ASSET_ID;
  const usesInternalCanvas =
    usesLegacyWhiteCanvas ||
    project.playback?.activeAssetId === BUNDLED_EMPTY_CANVAS_ASSET_ID ||
    project.library?.activeAssetId === BUNDLED_EMPTY_CANVAS_ASSET_ID;
  const isUntouchedLegacyShader =
    project.studio.activeShaderName === 'Blank Shader' &&
    project.studio.activeShaderCode.trim() === legacyShaderCode.trim();

  if (!usesInternalCanvas) {
    return project;
  }

  const upgradedProject = usesLegacyWhiteCanvas
    ? {
        ...project,
        library: {
          ...project.library,
          assets: [
            ...project.library.assets.filter(
              (asset) => !isInternalCanvasAssetId(asset.id),
            ),
            BUNDLED_EMPTY_CANVAS_ASSET,
          ],
          activeAssetId:
            project.library.activeAssetId === BUNDLED_WHITE_CANVAS_ASSET_ID
              ? BUNDLED_EMPTY_CANVAS_ASSET_ID
              : project.library.activeAssetId,
        },
        playback: {
          ...project.playback,
          activeAssetId:
            project.playback.activeAssetId === BUNDLED_WHITE_CANVAS_ASSET_ID
              ? BUNDLED_EMPTY_CANVAS_ASSET_ID
              : project.playback.activeAssetId,
        },
      }
    : project;

  if (!isUntouchedLegacyShader) {
    return upgradedProject;
  }

  const replacement = createEmptyProject(project.sessionId);
  const replacementShader = replacement.studio.savedShaders.find(
    (shader) => shader.id === replacement.studio.activeShaderId,
  );
  if (!replacementShader) {
    return upgradedProject;
  }

  const legacyShaderId = project.studio.activeShaderId;
  return {
    ...upgradedProject,
    studio: {
      ...upgradedProject.studio,
      activeShaderId: replacement.studio.activeShaderId,
      activeShaderName: replacement.studio.activeShaderName,
      activeShaderCode: replacement.studio.activeShaderCode,
      shaderVersions: replacement.studio.shaderVersions,
      savedShaders: [
        ...upgradedProject.studio.savedShaders.filter(
          (shader) => shader.id !== legacyShaderId,
        ),
        replacementShader,
      ],
      shaderChatHistory: [],
      uniformValues: replacement.studio.uniformValues,
    },
    timeline: {
      stub: {
        ...upgradedProject.timeline.stub,
        shaderSequence: {
          ...upgradedProject.timeline.stub.shaderSequence,
          steps: upgradedProject.timeline.stub.shaderSequence.steps.map((step) =>
            step.shaderId === legacyShaderId
              ? { ...step, shaderId: replacement.studio.activeShaderId }
              : step,
          ),
        },
      },
    },
  };
}
