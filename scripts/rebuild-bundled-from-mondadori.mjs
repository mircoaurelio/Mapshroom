import fs from 'node:fs';

const projectPath =
  process.argv[2] ??
  '.tmp-mondadori-ls/project-68c20029-6c51-4a60-9e29-63e981a65ab9.json';

const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const seq = project.timeline?.stub?.shaderSequence;
if (!seq?.steps?.length) {
  throw new Error(`No shader sequence steps in ${projectPath}`);
}

const steps = seq.steps.map((step) => ({
  id: step.id,
  shaderId: step.shaderId,
  durationSeconds: step.durationSeconds,
  transitionDurationSeconds: step.transitionDurationSeconds,
  transitionEffect: step.transitionEffect ?? 'mix',
  // Make every Mondadori timeline step playable / visible.
  disabled: false,
  assetSettings: step.assetSettings ?? {
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.85,
    blendMode: 'mix',
    fitMode: 'cover',
    quality: 'balanced',
    clipStartSeconds: 0,
    clipDurationSeconds: null,
  },
}));

const activeShaderId =
  project.studio?.activeShaderId ??
  steps[0]?.shaderId;

const statueTimeline = {
  enabled: false,
  durationSeconds:
    project.timeline?.stub?.durationSeconds ??
    steps.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0),
  markers: project.timeline?.stub?.markers ?? ['intro', 'verse', 'drop'],
  tracks: project.timeline?.stub?.tracks ?? [
    { id: 'timeline-track-assets', label: 'Assets', type: 'media' },
    { id: 'timeline-track-effects', label: 'Effects', type: 'automation' },
  ],
  shaderSequence: {
    enabled: true,
    mode: seq.mode ?? 'randomMix',
    editorView: seq.editorView ?? 'simple',
    stagePreviewMode: seq.stagePreviewMode ?? 'focused',
    focusedStepId: seq.focusedStepId ?? steps[0]?.id ?? null,
    pinnedStepId: seq.pinnedStepId ?? null,
    randomSeedToken: seq.randomSeedToken ?? 'bundled-statue-share-seed',
    singleStepLoopEnabled: Boolean(seq.singleStepLoopEnabled),
    randomChoiceEnabled: Boolean(seq.randomChoiceEnabled),
    sharedTransitionEnabled: Boolean(seq.sharedTransitionEnabled),
    sharedTransitionEffect: seq.sharedTransitionEffect ?? 'mix',
    sharedTransitionDurationSeconds: seq.sharedTransitionDurationSeconds ?? 1.82,
    sharedSectionDurationSeconds: seq.sharedSectionDurationSeconds ?? 8,
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

const catalog = [
  'src/shaders/presets/sculpture/importedFromProjects.ts',
  'src/shaders/presets/sculpture/index.ts',
  'src/shaders/presets/stage/onlineRecovered.ts',
  'src/shaders/presets/stage/index.ts',
  'src/shaders/presets/drawing/index.ts',
]
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const uniqueIds = [...new Set(steps.map((s) => s.shaderId))];
const missing = uniqueIds.filter(
  (id) => !catalog.includes(JSON.stringify(id)) && !catalog.includes(`'${id}'`),
);

console.log('wrote src/lib/bundledProjects.ts');
console.log('source', projectPath);
console.log('active', activeShaderId);
console.log('steps', steps.length, '(all enabled)');
console.log('unique shader ids', uniqueIds.length);
console.log('missing from preset catalog', missing.length);
if (missing.length) {
  console.log(missing.slice(0, 30));
}
