import { shaderPresets } from '../shaders/presets';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  DEFAULT_BUNDLED_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
const STATUE_PROJECT_ACTIVE_SHADER_ID = "timeline-725906ce-9eb8-4b8c-94ce-da06fa3829e5";
const STATUE_PROJECT_TIMELINE = {
  "enabled": false,
  "durationSeconds": 95.03,
  "markers": [
    "intro",
    "verse",
    "drop"
  ],
  "tracks": [
    {
      "id": "timeline-track-assets",
      "label": "Assets",
      "type": "media"
    },
    {
      "id": "timeline-track-effects",
      "label": "Effects",
      "type": "automation"
    }
  ],
  "shaderSequence": {
    "enabled": true,
    "mode": "sequence",
    "editorView": "simple",
    "stagePreviewMode": "timeline",
    "focusedStepId": "554cb3a5-bd9b-4fa9-ae32-d01438223ada",
    "pinnedStepId": null,
    "singleStepLoopEnabled": false,
    "randomChoiceEnabled": false,
    "sharedTransitionEnabled": false,
    "sharedTransitionEffect": "mix",
    "sharedTransitionDurationSeconds": 1.82,
    "steps": [
      {
        "id": "554cb3a5-bd9b-4fa9-ae32-d01438223ada",
        "shaderId": "timeline-725906ce-9eb8-4b8c-94ce-da06fa3829e5",
        "durationSeconds": 7.78,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "83232b47-c2ee-41eb-af9b-82bb410e3f50",
        "shaderId": "timeline-e730368a-ddf7-4790-b836-11b4e1575b8a",
        "durationSeconds": 7.72,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "948d825f-8545-4569-bd7b-edce72bcb72f",
        "shaderId": "timeline-2089eb8c-735f-46c5-a804-9abe352e4117",
        "durationSeconds": 12,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "06b41e2f-507d-4cc6-9834-4c8988dc0a0e",
        "shaderId": "timeline-b9147de6-2c0d-4ad7-82ab-97817a4df644",
        "durationSeconds": 7.51,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "68c51800-28b2-451e-ada6-ce4862a3b248",
        "shaderId": "timeline-c8271a58-9e49-44d4-ace8-f1f5fb9b78e9",
        "durationSeconds": 12,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "cb6a6b85-fa78-49da-8f4e-b05d227e04cd",
        "shaderId": "timeline-236df45c-96f7-4dbd-a963-efd94dc5d402",
        "durationSeconds": 12,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6cc9a4e7-f5c4-4d1e-befe-cce817a881a3",
        "shaderId": "timeline-922856b9-9d79-481e-99c3-c7134c1412ad",
        "durationSeconds": 6.54,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "18c699ee-131b-4612-80d7-6c6847fda3cc",
        "shaderId": "timeline-d0632531-abe6-4b26-b99e-7c4a0e8be1b9",
        "durationSeconds": 12,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e9fef775-f03a-442e-9f64-bfae2ff99f54",
        "shaderId": "timeline-7b32d234-c6eb-4e86-a661-75718a8e582d",
        "durationSeconds": 7.89,
        "transitionDurationSeconds": 2,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0f74e923-733f-44a3-a908-cf37b18ed001",
        "shaderId": "timeline-a8f085dd-8c2a-4cdd-842b-946c54770226",
        "durationSeconds": 9.59,
        "transitionDurationSeconds": 0.65,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "mix",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      }
    ]
  }
} as unknown as ProjectDocument['timeline']['stub'];

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

  const activeShader = shaderPresets[STATUE_PROJECT_ACTIVE_SHADER_ID] ?? Object.values(shaderPresets)[0];
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
        googleApiKey: '',
        runwayApiKey: '',
        shaderProvider: 'google',
        openaiShaderModel: '',
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
