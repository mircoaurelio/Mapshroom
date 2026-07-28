import {
  shaderPresetList,
  shaderPresets,
  stageReworkPresetList,
} from '../shaders/presets';
import { projectionAtelierPresetList } from '../shaders/presets/atelier';
import type { ShaderPresetDefinition } from '../shaders/presets/types';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  BUNDLED_STATUE_ASSET_ID,
  BUNDLED_STATUE_DEPTH_ASSET_ID,
  BUNDLED_STAGE_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { createTimelineShaderStep, getShaderTimelineDuration } from './timeline';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';
export const BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID =
  'bundled-projection-atelier-showcase';
export const BUNDLED_STAGE_REWORKS_PROJECT_SESSION_ID =
  'bundled-stage-reworks-complete-set';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
const BUNDLED_PROJECTION_ATELIER_PROJECT_CREATED_AT = '2026-07-28T20:00:00.000Z';
const BUNDLED_STAGE_REWORKS_PROJECT_CREATED_AT = '2026-07-28T21:45:00.000Z';
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
    sessionId: BUNDLED_STAGE_REWORKS_PROJECT_SESSION_ID,
    name: 'Stage Reworks · Selected Pair',
    createdAt: BUNDLED_STAGE_REWORKS_PROJECT_CREATED_AT,
    updatedAt: BUNDLED_STAGE_REWORKS_PROJECT_CREATED_AT,
    bundled: true,
  },
  {
    sessionId: BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID,
    name: 'Projection Atelier · Statue Depth Morphs',
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
    sessionId === BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID ||
    sessionId === BUNDLED_STAGE_REWORKS_PROJECT_SESSION_ID
  );
}

function createStageReworksProjectDocument(): ProjectDocument {
  const reworks = stageReworkPresetList;
  const activeShader = reworks[0];

  if (!activeShader || reworks.length !== 2) {
    throw new Error('Stage Reworks project requires both selected stage shaders.');
  }

  const steps = reworks.map((preset) => ({
    ...createTimelineShaderStep(preset.id),
    durationSeconds: 12,
    transitionDurationSeconds: 1.2,
    transitionEffect: 'mix' as const,
    assetSettings: normalizeTimelineStepAssetSettings({
      fitMode: 'contain',
      opacity: 1,
      quality: 'high',
      useStepAssetAsShaderBase: false,
    }),
  }));
  const shaderVersions = reworks.map((preset) => ({
    id: `stage-rework-version-${preset.id}`,
    prompt: 'Derived from a proven stage preset and refined for projection mapping.',
    name: preset.name,
    code: preset.code,
    createdAt: BUNDLED_STAGE_REWORKS_PROJECT_CREATED_AT,
  }));
  const activeShaderVersion = shaderVersions[0]!;

  return {
    version: 3,
    sessionId: BUNDLED_STAGE_REWORKS_PROJECT_SESSION_ID,
    name: 'Stage Reworks · Selected Pair',
    library: {
      assets: DEFAULT_BUNDLED_ASSETS,
      activeAssetId: BUNDLED_STAGE_ASSET_ID,
    },
    studio: {
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: [activeShaderVersion],
      savedShaders: reworks.map((preset, index) => ({
        ...preset,
        inputAssetId: null,
        versions: [shaderVersions[index] ?? activeShaderVersion],
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
      activeAssetId: BUNDLED_STAGE_ASSET_ID,
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
        markers: ['scanner', 'relight'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Stage surface', type: 'media' },
          { id: 'timeline-track-effects', label: 'Stage reworks', type: 'automation' },
        ],
        shaderSequence: {
          enabled: true,
          mode: 'sequence',
          editorView: 'simple',
          stagePreviewMode: 'timeline',
          focusedStepId: steps[0]?.id ?? null,
          pinnedStepId: null,
          randomSeedToken: 'stage-reworks-selected-pair-sequence',
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: true,
          sharedTransitionEffect: 'mix',
          sharedTransitionDurationSeconds: 1.2,
          sharedSectionDurationSeconds: 12,
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

function createProjectionAtelierProjectDocument(): ProjectDocument {
  const statueDepthShaderIds = new Set([
    'atelier_mercury_reliquary',
    'atelier_kintsugi_singularity',
  ]);
  const reviewedPresets = projectionAtelierPresetList.filter((preset) =>
    statueDepthShaderIds.has(preset.id),
  );
  const activeShader = reviewedPresets.find(
    (preset) => preset.id === 'atelier_mercury_reliquary',
  ) ?? reviewedPresets[0];

  if (!activeShader || reviewedPresets.length !== 2) {
    throw new Error('Projection Atelier statue project requires two reviewed shader presets.');
  }

  const steps = reviewedPresets.map((preset) => ({
    ...createTimelineShaderStep(preset.id),
    durationSeconds: 16,
    transitionDurationSeconds: 1.4,
    transitionEffect: 'mix' as const,
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
    name: 'Projection Atelier · Statue Depth Morphs',
    library: {
      assets: DEFAULT_BUNDLED_ASSETS.filter(
        (asset) =>
          asset.id === BUNDLED_STATUE_ASSET_ID ||
          asset.id === BUNDLED_STATUE_DEPTH_ASSET_ID,
      ),
      activeAssetId: BUNDLED_STATUE_ASSET_ID,
    },
    studio: {
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: [activeShaderVersion],
      savedShaders: reviewedPresets.map((preset) => ({
        ...preset,
        inputAssetId: BUNDLED_STATUE_DEPTH_ASSET_ID,
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
        enabled: true,
        durationSeconds: getShaderTimelineDuration(steps),
        markers: ['mercury', 'kintsugi'],
        tracks: [
          { id: 'timeline-track-assets', label: 'Statue depth map', type: 'media' },
          { id: 'timeline-track-effects', label: 'Depth morphs', type: 'automation' },
        ],
        shaderSequence: {
          enabled: true,
          mode: 'sequence',
          editorView: 'simple',
          stagePreviewMode: 'timeline',
          focusedStepId: steps[0]?.id ?? null,
          pinnedStepId: null,
          randomSeedToken: 'projection-atelier-statue-depth-sequence',
          singleStepLoopEnabled: false,
          randomChoiceEnabled: false,
          sharedTransitionEnabled: true,
          sharedTransitionEffect: 'mix',
          sharedTransitionDurationSeconds: 1.4,
          sharedSectionDurationSeconds: 16,
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
  if (sessionId === BUNDLED_STAGE_REWORKS_PROJECT_SESSION_ID) {
    return createStageReworksProjectDocument();
  }

  if (sessionId === BUNDLED_PROJECTION_ATELIER_PROJECT_SESSION_ID) {
    return createProjectionAtelierProjectDocument();
  }

  if (sessionId === BUNDLED_STATUE_PROJECT_SESSION_ID) {
    return createStatueProjectDocument();
  }

  return null;
}
