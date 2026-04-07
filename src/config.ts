import type { ProjectDocument, StageTransform, UiPreferences } from './types';
import { shaderPresets } from './shaders/presets';

export const APP_VERSION = 3;
export const PROJECT_STORAGE_PREFIX = 'mapshroom-v3:project:';
export const PROJECT_LIBRARY_STORAGE_KEY = 'mapshroom-v3:projects';
export const UI_STORAGE_KEY = 'mapshroom-v3:ui';
export const ACTIVE_SESSION_KEY = 'mapshroom-v3:active-session';
export const ASSET_DB_NAME = 'mapshroom-v3';
export const ASSET_DB_VERSION = 1;
export const ASSET_STORE_NAME = 'asset-blobs';
export const BROADCAST_PREFIX = 'mapshroom-v3:channel:';
export const DEFAULT_GOOGLE_API_VERSION = 'v1beta';
export const DEFAULT_GOOGLE_SHADER_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_GOOGLE_MODEL_OPTIONS = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
];
export const SHADER_GENERATION_TEMPERATURE = 0.1;

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

export function createDefaultProject(sessionId: string): ProjectDocument {
  const defaultShader = DEFAULT_SHADERS.default_psych;
  const firstTimelineStepId = crypto.randomUUID();
  const defaultShaderVersions = [
    {
      id: crypto.randomUUID(),
      prompt: 'Base Node Source',
      name: defaultShader.name,
      code: defaultShader.code,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    version: APP_VERSION,
    sessionId,
    name: 'Untitled Project',
    library: {
      assets: [],
      activeAssetId: null,
    },
    studio: {
      activeShaderId: defaultShader.id,
      activeShaderName: defaultShader.name,
      activeShaderCode: defaultShader.code,
      shaderVersions: defaultShaderVersions,
      savedShaders: Object.values(DEFAULT_SHADERS).map((shader) => ({
        ...shader,
        versions:
          shader.id === defaultShader.id
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
      uniformValues: {},
    },
    mapping: {
      stageTransform: { ...DEFAULT_STAGE_TRANSFORM },
    },
    playback: {
      activeAssetId: null,
      transport: {
        isPlaying: false,
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
        googleApiKey: '',
        runwayApiKey: '',
        shaderProvider: 'google',
        openaiShaderModel: '',
        googleShaderModel: DEFAULT_GOOGLE_SHADER_MODEL,
        videoGenProvider: 'runway',
      },
    },
    timeline: {
      stub: {
        enabled: false,
        durationSeconds: 180,
        markers: ['intro', 'verse', 'drop'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Assets', type: 'media' },
          { id: 'timeline-track-effects', label: 'Effects', type: 'automation' },
        ],
        shaderSequence: {
          enabled: false,
          mode: 'sequence',
          editorView: 'simple',
          stagePreviewMode: 'timeline',
          focusedStepId: firstTimelineStepId,
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: false,
          sharedTransitionEffect: 'mix',
          sharedTransitionDurationSeconds: 0.75,
          steps: [
            {
              id: firstTimelineStepId,
              shaderId: defaultShader.id,
              disabled: false,
              durationSeconds: 8,
              transitionDurationSeconds: 0.75,
              transitionEffect: 'mix',
            },
          ],
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
