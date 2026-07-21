import fs from 'node:fs';

const share = JSON.parse(fs.readFileSync('.tmp-shader-import/share-payload.json', 'utf8'));
const timeline = JSON.parse(fs.readFileSync('.tmp-shader-import/share-timeline.json', 'utf8'));

const BLEND = ['mix', 'screen', 'add', 'multiply', 'maskedReveal'];
const FIT = ['cover', 'contain', 'stretch', 'fitWidth', 'fitHeight'];
const QUALITY = ['draft', 'balanced', 'high'];

function stepToBundled(step) {
  return {
    id: step.i,
    shaderId: step.s,
    durationSeconds: step.d,
    transitionDurationSeconds: step.x,
    transitionEffect: step.e ?? 'mix',
    disabled: Boolean(step.o),
    assetSettings: {
      scaleX: step.asx ?? 1,
      scaleY: step.asy ?? 1,
      offsetX: step.ax ?? 0,
      offsetY: step.ay ?? 0,
      opacity: step.ao ?? 0.85,
      blendMode: BLEND[step.ab ?? 0] ?? 'mix',
      fitMode: FIT[step.af ?? 0] ?? 'cover',
      quality: QUALITY[step.aq ?? 1] ?? 'balanced',
      clipStartSeconds: step.acs ?? 0,
      clipDurationSeconds: step.acd ?? null,
      ...(step.aub ? { useStepAssetAsShaderBase: true } : {}),
      ...(step.apc ? { pinnedCompositeMode: 'stackOnTop' } : {}),
      ...(step.psm ? { pinnedStackMaskMode: 'nonBlack' } : {}),
      ...(step.pst != null ? { pinnedStackMaskThreshold: step.pst } : {}),
    },
  };
}

const steps = (timeline.steps ?? []).map(stepToBundled);
const activeShaderId = timeline.activeShaderId ?? steps.find((s) => !s.disabled)?.shaderId ?? steps[0]?.shaderId;

const statueTimeline = {
  enabled: false,
  durationSeconds: timeline.durationSeconds ?? steps.reduce((sum, s) => sum + s.durationSeconds, 0),
  markers: ['intro', 'verse', 'drop'],
  tracks: [
    { id: 'timeline-track-assets', label: 'Assets', type: 'media' },
    { id: 'timeline-track-effects', label: 'Effects', type: 'automation' },
  ],
  shaderSequence: {
    enabled: true,
    mode: timeline.mode ?? 'sequence',
    editorView: timeline.editorView ?? 'simple',
    stagePreviewMode: timeline.stagePreviewMode ?? 'timeline',
    focusedStepId: timeline.focusedStepId ?? steps[0]?.id ?? null,
    pinnedStepId: timeline.pinnedStepId ?? null,
    randomSeedToken: 'bundled-statue-share-seed',
    singleStepLoopEnabled: Boolean(timeline.singleStepLoopEnabled),
    randomChoiceEnabled: Boolean(timeline.randomChoiceEnabled),
    sharedTransitionEnabled: Boolean(timeline.sharedTransitionEnabled),
    sharedTransitionEffect: timeline.sharedTransitionEffect ?? 'mix',
    sharedTransitionDurationSeconds: timeline.sharedTransitionDurationSeconds ?? 1.82,
    sharedSectionDurationSeconds: timeline.sharedSectionDurationSeconds ?? 8,
    steps,
  },
};

const outTs = `import { shaderPresets } from '../shaders/presets';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  DEFAULT_BUNDLED_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
const STATUE_PROJECT_ACTIVE_SHADER_ID = ${JSON.stringify(activeShaderId)};
const STATUE_PROJECT_TIMELINE = ${JSON.stringify(statueTimeline, null, 2)} as unknown as ProjectDocument['timeline']['stub'];

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

  const activeShader =
    shaderPresets[STATUE_PROJECT_ACTIVE_SHADER_ID] ??
    Object.values(shaderPresets)[0];

  if (!activeShader) {
    throw new Error('Statue Project requires at least one shader preset.');
  }

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
      activeAssetId: DEFAULT_BUNDLED_ASSET_ID,
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
      activeAssetId: DEFAULT_BUNDLED_ASSET_ID,
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
        ...STATUE_PROJECT_TIMELINE,
        shaderSequence: {
          ...STATUE_PROJECT_TIMELINE.shaderSequence,
          steps: STATUE_PROJECT_TIMELINE.shaderSequence.steps.map((step) => ({
            ...step,
            assetSettings: normalizeTimelineStepAssetSettings(step.assetSettings),
          })),
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
`;

fs.writeFileSync('src/lib/bundledProjects.ts', outTs);
console.log('wrote bundledProjects.ts');
console.log('active', activeShaderId);
console.log('steps', steps.length);
console.log('share shaders', share.h.length);

// Verify all share shader ids will resolve via presets after import
const imported = fs.readFileSync('src/shaders/presets/sculpture/importedFromProjects.ts', 'utf8');
const stage = fs.readFileSync('src/shaders/presets/stage/onlineRecovered.ts', 'utf8');
const stageIndex = fs.readFileSync('src/shaders/presets/stage/index.ts', 'utf8');
const sculpture = fs.readFileSync('src/shaders/presets/sculpture/index.ts', 'utf8');
const drawing = fs.readFileSync('src/shaders/presets/drawing/index.ts', 'utf8');
const catalog = imported + stage + stageIndex + sculpture + drawing;
const missing = share.h.filter((h) => !catalog.includes(`"${h.i}"`) && !catalog.includes(`'${h.i}'`));
console.log('share shaders still missing from catalog text', missing.length);
if (missing.length) {
  console.log(missing.slice(0, 10).map((h) => h.i));
}
