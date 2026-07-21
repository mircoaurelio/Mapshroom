import type { ProjectDocument, StageTransform, UiPreferences } from './types';
import { shaderPresetList, shaderPresets } from './shaders/presets';
import {
  pickRandomShaderPresets,
  createStarterTimelineSteps,
  STARTER_TIMELINE_SHADER_COUNT,
} from './lib/bundledProjects';
import { getShaderTimelineDuration } from './lib/timeline';
import {
  BUNDLED_STAGE_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
  pickStarterBundledAssetId,
} from './lib/bundledAssets';

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
  moveMode: false,
  rotationLocked: false,
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  workspaceMode: 'split',
  chromeVisible: true,
  sidebarVisible: true,
  mobileUiMode: 'bar',
  desktopSlidersWindowEnabled: true,
};

if (shaderPresetList.length === 0) {
  throw new Error('Mapshroom requires at least one shader preset.');
}

export function createDefaultProject(sessionId: string): ProjectDocument {
  const activeAssetId = pickStarterBundledAssetId();
  const preferredTemplate = activeAssetId === BUNDLED_STAGE_ASSET_ID ? 'stage' : 'sculpture';
  const preferredPool = shaderPresetList.filter((preset) => preset.template === preferredTemplate);
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
      stageTransform: { ...DEFAULT_STAGE_TRANSFORM },
    },
    playback: {
      activeAssetId,
      transport: {
        isPlaying: true,
        currentTimeSeconds: 0,
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
          stagePreviewMode: 'focused',
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
