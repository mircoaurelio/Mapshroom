import type { ProjectDocument, StageTransform, UiPreferences } from './types';
import { shaderPresets } from './shaders/presets';

export const APP_VERSION = 3;
export const PROJECT_STORAGE_PREFIX = 'mapshroom-v3:project:';
export const UI_STORAGE_KEY = 'mapshroom-v3:ui';
export const ACTIVE_SESSION_KEY = 'mapshroom-v3:active-session';
export const ASSET_DB_NAME = 'mapshroom-v3';
export const ASSET_DB_VERSION = 1;
export const ASSET_STORE_NAME = 'asset-blobs';
export const BROADCAST_PREFIX = 'mapshroom-v3:channel:';
export const DEFAULT_OPENAI_SHADER_MODEL = 'gpt-5.4-mini';
export const DEFAULT_OPENAI_RESPONSE_MODEL_OPTIONS = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-4.1-mini',
  'gpt-4.1',
];

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
};

export function createDefaultProject(sessionId: string): ProjectDocument {
  const defaultShader = DEFAULT_SHADERS.default_psych;

  return {
    version: APP_VERSION,
    sessionId,
    library: {
      assets: [],
      activeAssetId: null,
    },
    studio: {
      activeShaderId: defaultShader.id,
      activeShaderName: defaultShader.name,
      activeShaderCode: defaultShader.code,
      shaderVersions: [
        {
          id: crypto.randomUUID(),
          prompt: 'Base Node Source',
          name: defaultShader.name,
          code: defaultShader.code,
          createdAt: new Date().toISOString(),
        },
      ],
      savedShaders: Object.values(DEFAULT_SHADERS).map((shader) => ({
        id: shader.id,
        name: shader.name,
        code: shader.code,
      })),
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
        runwayApiKey: '',
        shaderProvider: 'openai',
        shaderModel: DEFAULT_OPENAI_SHADER_MODEL,
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
