import { shaderPresetList, shaderPresets } from '../shaders/presets';
import type { ShaderPresetDefinition } from '../shaders/presets/types';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  BUNDLED_STATUE_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { createTimelineShaderStep, getShaderTimelineDuration } from './timeline';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
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
    sessionId: BUNDLED_STATUE_PROJECT_SESSION_ID,
    name: 'Statue Project',
    createdAt: BUNDLED_STATUE_PROJECT_CREATED_AT,
    updatedAt: BUNDLED_STATUE_PROJECT_CREATED_AT,
    bundled: true,
  },
];

export function isBundledProjectSessionId(sessionId: string): boolean {
  return sessionId === BUNDLED_STATUE_PROJECT_SESSION_ID;
}

export function createBundledProjectDocument(sessionId: string): ProjectDocument | null {
  if (!isBundledProjectSessionId(sessionId)) {
    return null;
  }

  const sculpturePool = shaderPresetList.filter((preset) => preset.template === 'sculpture');
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
        moveMode: false,
        rotationLocked: false,
      },
    },
    playback: {
      activeAssetId: BUNDLED_STATUE_ASSET_ID,
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
