import { shaderPresetList, shaderPresets } from '../shaders/presets';
import { projectionAtelierPresetList } from '../shaders/presets/atelier';
import type { ShaderPresetDefinition } from '../shaders/presets/types';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  BUNDLED_STATUE_ASSET_ID,
  BUNDLED_STAGE_1B_ASSET_ID,
  BUNDLED_STAGE_2A_ASSET_ID,
  BUNDLED_STAGE_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { createTimelineShaderStep, getShaderTimelineDuration } from './timeline';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';
export const BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID =
  'bundled-projection-atelier-showcase';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
const BUNDLED_PROJECTION_ATELIER_PROJECT_CREATED_AT = '2026-07-28T20:00:00.000Z';
export const STARTER_TIMELINE_SHADER_COUNT = 8;

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swapIndex]!;
    items[swapIndex] = current!;
  }
  return items;
}

/** Pick a random sample of shader presets for a fresh starter timeline. */
export function pickRandomShaderPresets(
  count = STARTER_TIMELINE_SHADER_COUNT,
  pool: ShaderPresetDefinition[] = shaderPresetList,
): ShaderPresetDefinition[] {
  const source = pool.length > 0 ? pool : shaderPresetList;
  if (source.length === 0) {
    throw new Error('Mapshroom requires at least one shader preset.');
  }

  const shuffled = shuffleInPlace([...source]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function createStarterTimelineSteps(
  presets: ShaderPresetDefinition[] = pickRandomShaderPresets(),
) {
  return presets.map((preset) => ({
    ...createTimelineShaderStep(preset.id),
    assetSettings: normalizeTimelineStepAssetSettings(),
  }));
}

function buildStarterShaderSequence(presets: ShaderPresetDefinition[]) {
  const steps = createStarterTimelineSteps(presets);
  return {
    enabled: true,
    mode: 'randomMix' as const,
    editorView: 'simple' as const,
    stagePreviewMode: 'timeline' as const,
    focusedStepId: steps[0]?.id ?? null,
    pinnedStepId: null,
    randomSeedToken: crypto.randomUUID(),
    singleStepLoopEnabled: false,
    randomChoiceEnabled: false,
    sharedTransitionEnabled: false,
    sharedTransitionEffect: 'mix' as const,
    sharedTransitionDurationSeconds: 0.75,
    sharedSectionDurationSeconds: 8,
    steps,
  };
}

export const BUNDLED_PROJECT_LIBRARY_ENTRIES: ProjectLibraryEntry[] = [
  {
    sessionId: BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID,
    name: 'Projection Atelier · Complete Collection',
    createdAt: BUNDLED_PROJECTION_ATELIER_PROJECT_CREATED_AT,
    updatedAt: BUNDLED_PROJECTION_ATELIER_PROJECT_CREATED_AT,
    bundled: true,
  },
  {
    sessionId: BUNDLED_STATUE_PROJECT_SESSION_ID,
    name: 'Statue Project',
    createdAt: BUNDLED_STATUE_PROJECT_CREATED_AT,
    updatedAt: BUNDLED_STATUE_PROJECT_CREATED_AT,
    bundled: true,
  },
];

export function isBundledProjectSessionId(sessionId: string): boolean {
  return (
    sessionId === BUNDLED_STATUE_PROJECT_SESSION_ID ||
    sessionId === BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID
  );
}

function getAtelierInputAssetId(preset: ShaderPresetDefinition, index: number): string {
  if (preset.template === 'drawing') {
    return index % 2 === 0 ? BUNDLED_STAGE_2A_ASSET_ID : BUNDLED_STAGE_1B_ASSET_ID;
  }

  return preset.template === 'stage' ? BUNDLED_STAGE_ASSET_ID : BUNDLED_STATUE_ASSET_ID;
}

function createProjectionAtelierProjectDocument(): ProjectDocument {
  const reviewedPresets = projectionAtelierPresetList;
  const activeShader = reviewedPresets.find(
    (preset) => preset.id === 'atelier_mercury_reliquary',
  ) ?? reviewedPresets[0];

  if (!activeShader || reviewedPresets.length < 20) {
    throw new Error('Projection Atelier requires 20 reviewed shader presets.');
  }

  const assignedAssetIds = new Map(
    reviewedPresets.map((preset, index) => [preset.id, getAtelierInputAssetId(preset, index)]),
  );
  const steps = reviewedPresets.map((preset) => ({
    ...createTimelineShaderStep(preset.id),
    durationSeconds: 10,
    transitionDurationSeconds: 1.25,
    transitionEffect: 'random' as const,
    assetSettings: normalizeTimelineStepAssetSettings({
      fitMode: 'contain',
      opacity: 1,
      quality: 'high',
      useStepAssetAsShaderBase: true,
    }),
  }));
  const shaderVersions = reviewedPresets.map((preset) => ({
    id: `projection-atelier-version-${preset.id}`,
    prompt: 'Projection Atelier reviewed preset',
    name: preset.name,
    code: preset.code,
    createdAt: BUNDLED_PROJECTION_ATELIER_PROJECT_CREATED_AT,
  }));
  const activeShaderVersion =
    shaderVersions.find((version) => version.name === activeShader.name) ?? shaderVersions[0]!;

  return {
    version: 3,
    sessionId: BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID,
    name: 'Projection Atelier · Complete Collection',
    library: {
      assets: DEFAULT_BUNDLED_ASSETS,
      activeAssetId: assignedAssetIds.get(activeShader.id) ?? BUNDLED_STAGE_ASSET_ID,
    },
    studio: {
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: [activeShaderVersion],
      savedShaders: reviewedPresets.map((preset) => ({
        ...preset,
        inputAssetId: assignedAssetIds.get(preset.id) ?? null,
        versions: [
          shaderVersions.find((version) => version.name === preset.name) ?? activeShaderVersion,
        ],
        lastValidCode: preset.code,
        lastValidUniformValues: preset.uniformValues ?? {},
      })),
      shaderChatHistory: [],
      uniformValues: activeShader.uniformValues ?? {},
    },
    mapping: {
      stageTransform: {
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
      },
    },
    playback: {
      activeAssetId: assignedAssetIds.get(activeShader.id) ?? BUNDLED_STAGE_ASSET_ID,
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
        openaiShaderModel: 'gpt-5.6-terra',
        anthropicShaderModel: 'claude-sonnet-5',
        googleShaderModel: 'gemini-3.5-flash',
        shaderRuntime: '',
        localShaderModel: '',
        visionEnabled: false,
        videoGenProvider: 'runway',
      },
    },
    timeline: {
      stub: {
        enabled: true,
        durationSeconds: getShaderTimelineDuration(steps),
        markers: ['sculpture', 'architecture', 'drawing'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Projection surfaces', type: 'media' },
          { id: 'timeline-track-effects', label: 'Reviewed shaders', type: 'automation' },
        ],
        shaderSequence: {
          enabled: true,
          mode: 'sequence',
          editorView: 'simple',
          stagePreviewMode: 'timeline',
          focusedStepId: steps[0]?.id ?? null,
          pinnedStepId: null,
          randomSeedToken: 'projection-atelier-reviewed-sequence',
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: true,
          sharedTransitionEffect: 'random',
          sharedTransitionDurationSeconds: 1.25,
          sharedSectionDurationSeconds: 10,
          steps,
        },
      },
    },
    export: {
      stub: {
        enabled: true,
        deterministicRenderReady: true,
        lastRequestedAt: null,
      },
    },
  };
}

function createStatueProjectDocument(): ProjectDocument {
  const sculpturePool = shaderPresetList.filter((preset) =>
    (preset.templates ?? [preset.template]).includes('sculpture'),
  );
  const starterPresets = pickRandomShaderPresets(
    STARTER_TIMELINE_SHADER_COUNT,
    sculpturePool.length >= STARTER_TIMELINE_SHADER_COUNT ? sculpturePool : shaderPresetList,
  );
  const activeShader = starterPresets[0] ?? Object.values(shaderPresets)[0];

  if (!activeShader) {
    throw new Error('Statue Project requires at least one shader preset.');
  }

  const shaderSequence = buildStarterShaderSequence(starterPresets);
  const shaderVersion = {
    id: 'bundled-statue-project-version',
    prompt: 'Bundled Statue Project preset',
    name: activeShader.name,
    code: activeShader.code,
    createdAt: BUNDLED_STATUE_PROJECT_CREATED_AT,
  };

  return {
    version: 3,
    sessionId: BUNDLED_STATUE_PROJECT_SESSION_ID,
    name: 'Statue Project',
    library: {
      assets: DEFAULT_BUNDLED_ASSETS,
      activeAssetId: BUNDLED_STATUE_ASSET_ID,
    },
    studio: {
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: [shaderVersion],
      savedShaders: [],
      shaderChatHistory: [],
      uniformValues: activeShader.uniformValues ?? {},
    },
    mapping: {
      stageTransform: {
        offsetX: 0,
        offsetY: 0,
        widthAdjust: 0,
        heightAdjust: 0,
        precision: 12,
        rotationDegrees: 0,
        moveMode: false,
        rotationLocked: false,
      },
    },
    playback: {
      activeAssetId: BUNDLED_STATUE_ASSET_ID,
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
        openaiShaderModel: 'gpt-5.6-terra',
        anthropicShaderModel: 'claude-sonnet-5',
        googleShaderModel: 'gemini-3.5-flash',
        shaderRuntime: '',
        localShaderModel: '',
        visionEnabled: false,
        videoGenProvider: 'runway',
      },
    },
    timeline: {
      stub: {
        enabled: false,
        durationSeconds: getShaderTimelineDuration(shaderSequence.steps),
        markers: ['intro', 'verse', 'drop'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Assets', type: 'media' },
          { id: 'timeline-track-effects', label: 'Effects', type: 'automation' },
        ],
        shaderSequence,
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

export function createBundledProjectDocument(sessionId: string): ProjectDocument | null {
  if (sessionId === BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID) {
    return createProjectionAtelierProjectDocument();
  }

  if (sessionId === BUNDLED_STATUE_PROJECT_SESSION_ID) {
    return createStatueProjectDocument();
  }

  return null;
}
