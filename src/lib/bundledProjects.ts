import { shaderPresets } from '../shaders/presets';
import type { ProjectDocument, ProjectLibraryEntry } from '../types';
import {
  DEFAULT_BUNDLED_ASSET_ID,
  DEFAULT_BUNDLED_ASSETS,
} from './bundledAssets';
import { normalizeTimelineStepAssetSettings } from './timelineAssetSettings';

export const BUNDLED_STATUE_PROJECT_SESSION_ID = 'bundled-statue-project';

const BUNDLED_STATUE_PROJECT_CREATED_AT = '2026-05-24T15:15:00.000Z';
const STATUE_PROJECT_ACTIVE_SHADER_ID = "timeline-af542a9f-1712-481a-8145-ad13158cd53b";
const STATUE_PROJECT_TIMELINE = {
  "enabled": false,
  "durationSeconds": 1259.93,
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
    "mode": "randomMix",
    "editorView": "simple",
    "stagePreviewMode": "focused",
    "focusedStepId": "0e1f1ed3-6af7-46c8-a7a7-152f218da989",
    "pinnedStepId": null,
    "randomSeedToken": "bundled-statue-share-seed",
    "singleStepLoopEnabled": false,
    "randomChoiceEnabled": false,
    "sharedTransitionEnabled": false,
    "sharedTransitionEffect": "mix",
    "sharedTransitionDurationSeconds": 1.82,
    "sharedSectionDurationSeconds": 8,
    "steps": [
      {
        "id": "2cdb0875-ae0d-4ba4-9cd2-63567fba33c8",
        "shaderId": "timeline-917aa747-27d9-49cf-89ea-e568e876309f",
        "durationSeconds": 2.02,
        "transitionDurationSeconds": 2.02,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "554cb3a5-bd9b-4fa9-ae32-d01438223ada",
        "shaderId": "timeline-725906ce-9eb8-4b8c-94ce-da06fa3829e5",
        "durationSeconds": 7.78,
        "transitionDurationSeconds": 7.78,
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
        "id": "5db3fea3-19fc-40d4-b93f-ce6fb6ae003b",
        "shaderId": "timeline-4065d5af-ea65-4cb2-90c4-a03179d25503",
        "durationSeconds": 2.04,
        "transitionDurationSeconds": 2.04,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "4444ada2-1645-45d2-aa03-c309e2735bec",
        "shaderId": "timeline-1973822b-1f45-4bc8-806c-dc0262ccd222",
        "durationSeconds": 7.79,
        "transitionDurationSeconds": 7.79,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "ff83e207-e4d3-4e50-8782-232a1cd11fc1",
        "shaderId": "timeline-6cfef9db-f262-457b-beed-de39ea418987",
        "durationSeconds": 2.01,
        "transitionDurationSeconds": 2.01,
        "transitionEffect": "mix",
        "disabled": true,
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
        "transitionDurationSeconds": 6.11,
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
        "id": "6b23f58b-6b41-4949-9199-6c9d187e2167",
        "shaderId": "timeline-23441f58-808d-4ab0-8511-362f77c9321b",
        "durationSeconds": 7.74,
        "transitionDurationSeconds": 6.12,
        "transitionEffect": "mix",
        "disabled": true,
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
        "durationSeconds": 23.67,
        "transitionDurationSeconds": 15.63,
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
        "transitionDurationSeconds": 7.51,
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
        "durationSeconds": 17.57,
        "transitionDurationSeconds": 8.92,
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
        "id": "2fad297b-2415-4003-8df1-a5f69a87e1c9",
        "shaderId": "timeline-0aa3d150-0f06-48dc-99a4-4ea4c7da8067",
        "durationSeconds": 17.57,
        "transitionDurationSeconds": 8.92,
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
        "id": "dacb09ff-c019-4674-bc46-c145ef38b1a2",
        "shaderId": "timeline-fb0c2385-3eb6-43a6-a270-393a0287e7ec",
        "durationSeconds": 17.61,
        "transitionDurationSeconds": 8.94,
        "transitionEffect": "mix",
        "disabled": true,
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
        "durationSeconds": 13.29,
        "transitionDurationSeconds": 6.25,
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
        "id": "9eed71cf-050c-4ea5-b17b-dc78ad1771e3",
        "shaderId": "timeline-8c43cd0a-f0ae-4552-a894-03538bed98ab",
        "durationSeconds": 13.29,
        "transitionDurationSeconds": 6.25,
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
        "transitionDurationSeconds": 3.08,
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
        "id": "0c62848a-eec1-4593-9826-c43bf8cf648d",
        "shaderId": "timeline-633e9496-efb2-48e9-bed6-e2e1832a4018",
        "durationSeconds": 2.18,
        "transitionDurationSeconds": 1.13,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "3f9647c1-7388-4af0-b3de-442b4be0f804",
        "shaderId": "timeline-0c40c349-9ff2-4f93-b52f-09ba2b6cf9f3",
        "durationSeconds": 2.18,
        "transitionDurationSeconds": 1.13,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "bf056d87-1d09-40da-bb97-8c99cd22148b",
        "shaderId": "timeline-b0b6b1db-4a2f-4fc8-a6e9-659406d58bf7",
        "durationSeconds": 2.18,
        "transitionDurationSeconds": 1.13,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "1c4dffa8-abfa-4e38-b4ee-461b743bb732",
        "shaderId": "timeline-f7706a66-a878-4ea7-9142-1568e8892ebb",
        "durationSeconds": 2.31,
        "transitionDurationSeconds": 0.96,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "fc676bc5-694b-4762-a7b1-787eb33aff0c",
        "shaderId": "timeline-58b9be84-3020-40c6-ac08-a0955bcb09ec",
        "durationSeconds": 2.31,
        "transitionDurationSeconds": 0.96,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "22eddd38-89f3-4f15-94ad-adcb786623df",
        "shaderId": "timeline-84a19e91-546f-413e-a36c-db6555304ebc",
        "durationSeconds": 2.31,
        "transitionDurationSeconds": 0.96,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "519ee18a-38a3-4467-a128-0bf9bd6526ef",
        "shaderId": "timeline-09c2541b-0024-48df-a028-06c69e5a20c7",
        "durationSeconds": 3.79,
        "transitionDurationSeconds": 1.67,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "e824f061-8841-4721-85bc-80881dae58e1",
        "shaderId": "timeline-0ffafeec-be83-44dd-ae96-fa29a9591ca6",
        "durationSeconds": 3.79,
        "transitionDurationSeconds": 1.67,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "e626e244-765f-4bcb-bf0d-5de931191b29",
        "shaderId": "timeline-5f69bb27-3a59-433e-877f-754ddfb362c1",
        "durationSeconds": 3.79,
        "transitionDurationSeconds": 1.67,
        "transitionEffect": "mix",
        "disabled": true,
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
        "durationSeconds": 21.71,
        "transitionDurationSeconds": 7.83,
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
        "id": "98ab7dee-8155-44d9-bf3e-e0e4c04e8b98",
        "shaderId": "timeline-43e55825-075d-4d13-9ab7-2a69a573d204",
        "durationSeconds": 21.71,
        "transitionDurationSeconds": 7.84,
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
        "transitionDurationSeconds": 5.16,
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
        "id": "13de9031-752e-4cae-8a7d-2aaa171a5c13",
        "shaderId": "timeline-49dd647c-7725-42f2-9c19-ac56bc12924f",
        "durationSeconds": 30.42,
        "transitionDurationSeconds": 19.86,
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
        "id": "ebab190d-bcda-4a06-9a5b-933628182857",
        "shaderId": "timeline-6b03e9bc-4f4c-4e4b-9754-f5b6d5696dd7",
        "durationSeconds": 30.42,
        "transitionDurationSeconds": 19.86,
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
        "id": "eb6d4e93-c87c-4160-a90e-d92376f7764c",
        "shaderId": "timeline-777e4745-4552-45b6-8ecf-83f33311fbb1",
        "durationSeconds": 28.24,
        "transitionDurationSeconds": 12.83,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "c2532c77-6424-47fb-987a-e25810c48a2c",
        "shaderId": "timeline-870d7e61-146c-4a0c-8fdd-7f27dfbd047c",
        "durationSeconds": 28.24,
        "transitionDurationSeconds": 12.83,
        "transitionEffect": "mix",
        "disabled": true,
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
      },
      {
        "id": "4e9a7cb3-0b63-486c-a92b-5b127f585aec",
        "shaderId": "timeline-5baef16e-4655-4eb4-b20d-35435497ab14",
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
      },
      {
        "id": "de325418-040e-492a-9ffc-e1fee37b9ad9",
        "shaderId": "timeline-da6d6953-ed6a-4d1f-9f12-4f911f131f1e",
        "durationSeconds": 28.16,
        "transitionDurationSeconds": 2.53,
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
        "id": "106bf782-908d-42d1-8148-be083da197c6",
        "shaderId": "timeline-f21913b3-4831-4324-926a-76d3cc56aa77",
        "durationSeconds": 28.16,
        "transitionDurationSeconds": 2.53,
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
        "id": "564f7f51-5812-442d-81b3-64b6c8c8acb3",
        "shaderId": "timeline-9f5c563a-82c0-4e68-9964-08e154a6fb6e",
        "durationSeconds": 28.16,
        "transitionDurationSeconds": 2.53,
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
        "id": "0c1e7c81-bf26-448b-845d-dac67d58239c",
        "shaderId": "timeline-b64db472-5476-4824-80c6-8a6aaf12b775",
        "durationSeconds": 28.16,
        "transitionDurationSeconds": 2.53,
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
        "id": "6a04710d-7d6e-48c5-a235-f052d3deefee",
        "shaderId": "timeline-961ff105-c875-460f-b5c1-4e408fa3789f",
        "durationSeconds": 15.28,
        "transitionDurationSeconds": 1.23,
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
        "id": "64c48364-fa8b-4ce7-9a08-b10930927d69",
        "shaderId": "timeline-254705eb-4fb7-44d0-b4e3-19ea69d33fe5",
        "durationSeconds": 3.46,
        "transitionDurationSeconds": 0.32,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "f869dd8d-f46d-427d-8d2d-079642f1c080",
        "shaderId": "timeline-554160d1-7164-485a-94f6-2c97fafff911",
        "durationSeconds": 27.07,
        "transitionDurationSeconds": 2.53,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "contain",
          "quality": "draft",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "1f845c84-7c0e-4af5-8d2f-943ea5d7296a",
        "shaderId": "timeline-3775f31c-e235-4108-8ea0-c9809c9e6949",
        "durationSeconds": 27.07,
        "transitionDurationSeconds": 2.53,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "contain",
          "quality": "draft",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "892e8a23-1c3d-4394-ba32-fb43eba646d9",
        "shaderId": "timeline-7c94a35d-752b-44d3-8047-f2db7a304c66",
        "durationSeconds": 3.46,
        "transitionDurationSeconds": 0.32,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "b1dbbe9d-f758-4a35-b1bd-70b1ed311152",
        "shaderId": "timeline-a02921ed-4667-4334-abff-71ce36027679",
        "durationSeconds": 24.76,
        "transitionDurationSeconds": 15.81,
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
        "id": "e48947a6-17fd-48c5-82a3-e54b9b23d5de",
        "shaderId": "timeline-4742f4ce-1a77-4add-812c-759484511985",
        "durationSeconds": 24.76,
        "transitionDurationSeconds": 15.81,
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
        "id": "8995482b-7ae1-4f9c-ba19-83330f0f2fb4",
        "shaderId": "timeline-1067a459-168f-4b1b-8b52-6fd73a440d9a",
        "durationSeconds": 24.76,
        "transitionDurationSeconds": 15.81,
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
        "id": "b1aa9b73-0b66-4627-af4b-80381d0e4ca4",
        "shaderId": "timeline-f8a9f14f-b323-43e4-ba64-adc5945df6d3",
        "durationSeconds": 24.76,
        "transitionDurationSeconds": 15.81,
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
        "id": "792682ac-3fdf-4999-88c3-c2a45fa3649b",
        "shaderId": "timeline-31fca10c-9c6b-448d-8047-39be703dbe6a",
        "durationSeconds": 24.76,
        "transitionDurationSeconds": 15.81,
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
        "id": "0dfeb5ce-3ffe-4103-a619-74838314651e",
        "shaderId": "timeline-aa50480f-e0a3-4b89-822f-22d6b9e8ab0f",
        "durationSeconds": 65.94,
        "transitionDurationSeconds": 1.64,
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
        "id": "afdddc08-a33f-47e4-9ebd-94844b207ddc",
        "shaderId": "timeline-ef3d8260-b816-45d9-a448-0ae7fe0d8f70",
        "durationSeconds": 65.94,
        "transitionDurationSeconds": 1.64,
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
        "id": "6fdd08d1-bb2f-4516-b36b-fda8f0014f0f",
        "shaderId": "timeline-a0270bcb-4361-49e5-8bcb-810872282a36",
        "durationSeconds": 28.9,
        "transitionDurationSeconds": 1.65,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "c13b972d-87ba-4983-ace3-3cd5a07b1980",
        "shaderId": "timeline-84d79e70-d838-435c-85ed-2928ed034b6b",
        "durationSeconds": 9.15,
        "transitionDurationSeconds": 9.03,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "b0a61960-92cd-42b7-ad00-a84284ed2ae7",
        "shaderId": "timeline-c362b988-cf7a-496c-8708-a72d39c15d4a",
        "durationSeconds": 21.7,
        "transitionDurationSeconds": 21.7,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "de500d8c-344d-4db1-b7ff-b5ea439e4a42",
        "shaderId": "timeline-9a7773ce-3de6-43a9-9a04-e2bd71a0c018",
        "durationSeconds": 21.7,
        "transitionDurationSeconds": 21.7,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "b101fdef-9bbb-4cdb-b2f0-547105b87918",
        "shaderId": "timeline-c32abfe7-b6f0-4a21-9e97-ab74c4b24982",
        "durationSeconds": 69.25,
        "transitionDurationSeconds": 41.19,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "487d44ad-b9ac-4b92-a867-d13d29d9afa4",
        "shaderId": "timeline-10b868ff-908a-4b91-b679-7763f851eecd",
        "durationSeconds": 9.31,
        "transitionDurationSeconds": 6.16,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "7e50dbde-04f7-44a5-bf3a-62f85b59dddf",
        "shaderId": "timeline-81783f1e-7c39-4459-bedb-091e6b6e4309",
        "durationSeconds": 11.36,
        "transitionDurationSeconds": 9.45,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "a4f4b37a-6822-483a-8b97-e25da98a56b8",
        "shaderId": "timeline-480590bd-7280-4261-9f84-ab75162e3d6a",
        "durationSeconds": 150.08,
        "transitionDurationSeconds": 13.96,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "016507a3-74c2-438f-980b-9f67d4ca7091",
        "shaderId": "timeline-028ae0af-527c-47b0-a05b-09f05b35e9d9",
        "durationSeconds": 1.82,
        "transitionDurationSeconds": 0.16,
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
        "id": "86b089a4-bcfd-4b87-b76f-b0e3b13e050b",
        "shaderId": "timeline-5e36b310-7cf4-44a8-9cce-64af2b398f32",
        "durationSeconds": 7.75,
        "transitionDurationSeconds": 0.72,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "1c844abd-79bd-4745-83b1-0901010645ea",
        "shaderId": "timeline-323c5cf4-499c-40b6-a885-dd7e0e7df5d7",
        "durationSeconds": 7.75,
        "transitionDurationSeconds": 0.72,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "9f71ffce-08ac-43cf-9aa8-2cdbd34770a4",
        "shaderId": "timeline-1232f80d-bbb7-40cb-bb19-0447ad7f5628",
        "durationSeconds": 7.75,
        "transitionDurationSeconds": 0.72,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "e6c112a5-4799-4baa-81a3-a1d1fe6ce6eb",
        "shaderId": "timeline-b1862460-0e75-4025-937c-c9ba29717c2b",
        "durationSeconds": 6.63,
        "transitionDurationSeconds": 0.63,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "dc0ea08c-f99e-4ec3-ba64-7b0bba387fb2",
        "shaderId": "timeline-a384ce44-4229-4f2c-82c6-878a73da5f91",
        "durationSeconds": 25.49,
        "transitionDurationSeconds": 2.43,
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
        "id": "130c9256-d67e-467d-b6a8-ac8e4f644a48",
        "shaderId": "timeline-c4b30a0c-5b34-4ede-9bbd-5a0e9fc1a9c7",
        "durationSeconds": 25.49,
        "transitionDurationSeconds": 2.43,
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
        "id": "20d8af39-29da-4d3e-877e-33c83640107e",
        "shaderId": "timeline-32d298fe-8cbb-4bb2-a9b2-57d67e97a715",
        "durationSeconds": 25.49,
        "transitionDurationSeconds": 2.43,
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
        "id": "682145e7-a6de-4a9b-9e9f-b5f48820f764",
        "shaderId": "timeline-3b431b13-c948-4a1e-9271-51c4665722b5",
        "durationSeconds": 25.55,
        "transitionDurationSeconds": 2.43,
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
        "id": "cec6cfa9-76b3-49c5-aa93-8b323a8a440f",
        "shaderId": "timeline-6cc5875d-0802-46b0-b848-710c6e77e5bd",
        "durationSeconds": 25.55,
        "transitionDurationSeconds": 2.43,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "ada7f674-1a59-4098-b3c1-8f686f7b279e",
        "shaderId": "timeline-82e68405-40e3-4aec-8fd4-915fce5f7be7",
        "durationSeconds": 25.55,
        "transitionDurationSeconds": 2.43,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "54743e79-5f69-42fd-bcad-0542045b9a8d",
        "shaderId": "timeline-dc8cdc32-72c2-4e8d-944c-fb85951d4253",
        "durationSeconds": 25.55,
        "transitionDurationSeconds": 2.43,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "8788e033-436e-4e27-ae97-5f0e36bd3342",
        "shaderId": "timeline-5d75d00a-f196-42a4-ba8c-12499efa25e4",
        "durationSeconds": 6.63,
        "transitionDurationSeconds": 0.63,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "330e13fa-aa07-48fa-b5df-a7432eb997d2",
        "shaderId": "timeline-274e18f9-c35e-4cc4-a4f6-ff06054779b0",
        "durationSeconds": 4.92,
        "transitionDurationSeconds": 0.46,
        "transitionEffect": "mix",
        "disabled": true,
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
        "id": "346c4616-d8ab-433c-938a-2726d771d707",
        "shaderId": "timeline-ddee6be5-aeb1-430c-95f2-e2d026163562",
        "durationSeconds": 38.35,
        "transitionDurationSeconds": 3.56,
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
        "id": "70e2b910-0921-4166-9020-8126491c1063",
        "shaderId": "timeline-8e55de83-7749-42a4-a7f6-ae9687f75bea",
        "durationSeconds": 38.35,
        "transitionDurationSeconds": 3.56,
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
        "id": "70b44c3f-817e-428b-8a01-53b9beace648",
        "shaderId": "timeline-c4abbedd-0e5c-44e1-8ac8-428e1cf7a1ff",
        "durationSeconds": 38.35,
        "transitionDurationSeconds": 3.56,
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
        "id": "a6c0a0ee-6ad5-4a2d-afb5-782eb430dd81",
        "shaderId": "timeline-4ccd847c-e6d0-468a-a3d2-84c5175be081",
        "durationSeconds": 1.88,
        "transitionDurationSeconds": 0.18,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 4,
          "scaleY": 2,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "contain",
          "quality": "draft",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "55a7fd5c-8a00-4584-9e13-c66352b21af3",
        "shaderId": "timeline-92f688a0-053c-4e88-a86b-5e418864078c",
        "durationSeconds": 3.56,
        "transitionDurationSeconds": 0.34,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "301332cf-c7af-4720-9eaa-0bc53e22a635",
        "shaderId": "timeline-a54ef00e-ba50-4b61-a4a4-24c6696671a5",
        "durationSeconds": 7.25,
        "transitionDurationSeconds": 0.7,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "7d4e52a8-3f1e-49de-911f-838a72195c08",
        "shaderId": "timeline-dde8823e-5cc2-46a2-ba26-1e55c3b88e08",
        "durationSeconds": 7.25,
        "transitionDurationSeconds": 0.7,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6c2f12ae-165e-4b4a-8df6-fa26221a78cc",
        "shaderId": "timeline-746936f3-a43c-4b21-95d9-5e5b2a2f4eef",
        "durationSeconds": 1.88,
        "transitionDurationSeconds": 0.18,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "a9a93e7b-2cf5-4f37-bc68-13721df60976",
        "shaderId": "timeline-cca437fe-26e1-4b6f-bf80-0a7d44e7ebeb",
        "durationSeconds": 1.88,
        "transitionDurationSeconds": 0.18,
        "transitionEffect": "mix",
        "disabled": true,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "multiply",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "8dfea06e-6d28-497d-883d-09ee714f8a61",
        "shaderId": "timeline-ee9698b3-8529-4dea-8f2d-2f62fd7730e9",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0855d106-b60a-4ae8-8575-8d89adfcfdfd",
        "shaderId": "timeline-1cab9f8c-921c-47ca-afea-98cbebcb984d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d4910876-1d04-4e97-a993-2fe32e36a4b7",
        "shaderId": "timeline-f40cd631-6806-43db-b7f5-9ff0273cbefd",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "3323f1e2-d814-4690-ba8d-84dbcde83d19",
        "shaderId": "timeline-bc907b8e-f19c-47c5-89d1-03cd415c9868",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "a2b52396-9c43-45db-9442-241387f71a94",
        "shaderId": "timeline-2fa29048-9151-432e-92bc-9a2e7700228f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "7e742e77-0199-4fb9-b9a5-d80a78c2c8b0",
        "shaderId": "timeline-4265ae1b-795d-48d9-a18f-266b1925bc32",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "b37ca933-69f8-4cad-a6f5-cc0be9ad1ce4",
        "shaderId": "timeline-de42593d-1a19-48c5-86f2-dff5e77d44f2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "aed30381-52d2-4aa5-992e-611f8224b162",
        "shaderId": "timeline-94797026-2480-45fb-b342-2ac958345afd",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "a3ce06cf-e3fa-4af5-b606-3029e75f6de5",
        "shaderId": "timeline-a2b37be4-859c-457d-918c-abeeb94bb7bc",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e0388f45-2c5c-4f57-8762-58533d217097",
        "shaderId": "timeline-0f77abc0-5637-4f71-955a-94408586ece5",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "a2f82913-8dbf-47c9-a1b4-330ece569ad0",
        "shaderId": "timeline-fe5514ca-071f-40c1-854b-dcf365b3d367",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "8d0bc01a-a11f-4b1d-bd92-3a6c78f48206",
        "shaderId": "timeline-74dc73b9-e19d-4434-b259-0f5c9531b3d1",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6ec59253-f9ca-4e19-917a-bafb91c14c22",
        "shaderId": "timeline-0acf1595-225d-4aee-8fa7-b3b357a9c7ea",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6b5aabdf-8b24-4b76-bd6f-ddb8bda04233",
        "shaderId": "timeline-ba116dd2-6d26-4f67-a314-f615410053b4",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "59b4ec67-2c9d-4451-8970-e39e45b15284",
        "shaderId": "timeline-86a55801-270a-4b66-be23-482d895ae43c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "80295a55-36b0-4791-9b42-29bdc05590ff",
        "shaderId": "timeline-a324ce5d-f56c-4587-9a08-8d2b85db68fd",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e2c901bc-5742-46d2-8c11-d7c3dbc43a94",
        "shaderId": "timeline-3a1338dd-7a28-42de-91e0-c4f504c193d1",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f82bd9b5-1d9a-47d8-b36b-7c2601903a18",
        "shaderId": "timeline-df7a88bf-385a-4175-9264-f3259a78d7fe",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "42b8854c-31ef-4a7b-8460-03eea563846d",
        "shaderId": "timeline-a3740bd1-563b-4407-a63e-04c40f5dde72",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e6f8b865-9ec0-4a40-97c0-3e894605b8e7",
        "shaderId": "timeline-e2d8bdac-7061-4dd9-a4fe-741cab075e47",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d9502d48-7241-4c1f-b5f9-9e3ef6123e04",
        "shaderId": "timeline-829d4574-7fc9-4004-9618-f5dce950596f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "211b00f8-4ced-404b-89d4-f1cac05436f7",
        "shaderId": "timeline-814b7d19-5ffe-4da5-971c-555da77ec977",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "95445c72-67bf-4648-9205-c21ce466659e",
        "shaderId": "timeline-1713064c-159d-439d-bb82-688383284719",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f3e32928-6637-4271-968e-e3cc337e28f6",
        "shaderId": "timeline-19b303a0-cd36-4556-9fa7-c46b38c34a14",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "4044e917-ca87-409a-a40d-e82b696e6859",
        "shaderId": "timeline-71a1df62-599c-46a6-b27a-87397d162cdf",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f951fa8c-b47c-4b25-815c-a0bae31a7c55",
        "shaderId": "timeline-ac43730a-ce14-4ba4-9d8e-6152cae6eb36",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "22386f75-84ff-42d7-9eb5-f0c322747bf4",
        "shaderId": "timeline-1308b45d-6ac1-4d1a-928e-d2c932f7101f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "101edc68-881a-4b43-bec8-97edaaaee464",
        "shaderId": "timeline-61ec0631-02ec-4ddc-9ea5-7125b7507b9d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "affcaa70-5f3e-4333-bc9d-7639a8f920b3",
        "shaderId": "timeline-703f4cb1-b1bc-4111-8f9e-8c06b958d9d5",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6b66e8d4-4671-45e7-80b0-a4ab5d75196f",
        "shaderId": "timeline-4576ac76-bc57-40fb-a7a0-ef31989a214f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "32fbfa15-eb7a-4aa4-b8a9-ed64dfc4ce1c",
        "shaderId": "timeline-17f48c94-4678-40a5-b950-c22993b24dc2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0e1f1ed3-6af7-46c8-a7a7-152f218da989",
        "shaderId": "timeline-af542a9f-1712-481a-8145-ad13158cd53b",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "8b0f0e51-caf7-43a8-95a5-32497e918c43",
        "shaderId": "timeline-f9fe6bcb-51a5-402a-ba95-db03ce029201",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "9858243c-177f-49aa-96f1-1c5deb033546",
        "shaderId": "timeline-96067366-b7cc-494f-8d83-ffbec38729d1",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "a80e4827-35b3-4bc3-a6d5-5ebc16c22e93",
        "shaderId": "timeline-5aa3c029-a19e-4cbb-a95a-bf9bb43fa8b5",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e19ad0f6-53a8-472b-898e-69acd20ccec6",
        "shaderId": "timeline-09f0f894-d2d5-4426-9b59-0d34f0d57c5f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0d70c486-95a9-4c6e-b152-a5fdb95c57a5",
        "shaderId": "timeline-8f3ff811-3b4d-47f7-bdf2-7ccd9b497f9f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "fd56312f-9ef6-4601-995f-67838f6ad891",
        "shaderId": "timeline-3ee01e09-580e-446b-bb3e-1f832e9d26e3",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "403330a4-181f-45ff-9a2b-2740175151b1",
        "shaderId": "timeline-d86c2b79-874c-47cd-921a-a67394781b18",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "14408aa1-24c8-46fc-aed2-80dd1dd2c99c",
        "shaderId": "timeline-a442302e-be1e-4f95-8c59-58e6e08c5c95",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "3254ddf4-4939-420d-9378-5ba4c49edaea",
        "shaderId": "timeline-bc2dbad2-a444-404d-8ae0-05659f25141e",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f601eb54-c0d5-4db6-b22d-8fc6b2407a7b",
        "shaderId": "timeline-d35d9984-16b5-4e70-adf3-2f0da56bfd9f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "c45a41a9-385d-4b5a-a263-49121a0d37b1",
        "shaderId": "timeline-8de56499-5d2f-4f83-8025-ce57a1146166",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0b8cf854-feb6-4cf4-bf20-cc8f5d0c3436",
        "shaderId": "timeline-8cd13d99-c0a0-4c78-af53-a0ad97e4a283",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "4f6f621f-58c2-4006-ac69-9f6ce236feb8",
        "shaderId": "timeline-89887183-5939-4ac9-882b-e0157117766f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "165f0a3e-26ed-4116-8fc3-345c6e66c229",
        "shaderId": "timeline-69c4bbcb-2f7e-412f-8445-16b4eb13aa7c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "1f2e02ee-e834-43d4-a3df-502756ae0cf6",
        "shaderId": "timeline-41edc862-febf-4231-bd9d-dfa0f2b49000",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "21044825-68ba-4b74-b164-f887d2c55af6",
        "shaderId": "timeline-0066d2f6-a6bd-40ae-8435-d8a5abb63839",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "bcbe9bce-2edd-4a27-bd93-ec38753f35b1",
        "shaderId": "timeline-a49fa85b-9600-48bf-88e6-18bfdcea46d2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0556a40b-ae7f-4c3d-9852-d27c505ec073",
        "shaderId": "timeline-6fd2b35c-8ffe-4548-b7d0-9e608dda317c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "781f3302-9115-488a-bfd6-bf1ee763c16f",
        "shaderId": "timeline-9cfdae90-6a09-4e2a-9a0c-3c52ffdee7fe",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "16f5ff2b-fb83-447e-baff-49c316fcfead",
        "shaderId": "timeline-40c6e4e9-b0e3-48e2-a06e-5784f113ed4a",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "87801b0e-2c00-40fb-978e-0d6c48bf294d",
        "shaderId": "timeline-ceefaa6f-a2dd-4ad8-b42a-0f1c36fe031f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "7e464ed0-facb-4a76-a0a0-98ac4e43d1ac",
        "shaderId": "timeline-69fe5e13-61dd-4e4f-b168-673cdb2e02dd",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f005e7f8-5897-4988-8dc3-3702439a0128",
        "shaderId": "timeline-42a47a9a-f4e3-4a97-b974-93b24bb920cd",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "4ee3464e-016d-4b27-9f21-401796e7cf73",
        "shaderId": "timeline-40ed00c5-94d9-4f43-8cb3-7eaf55bfe2aa",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d62b35f4-56ba-43c8-835c-5bfa26b526b8",
        "shaderId": "timeline-47c6bea9-0914-4f00-9fb5-afe23db49c4d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "c8ff9756-f7d0-44eb-8a9a-6819eb23dd74",
        "shaderId": "timeline-be0f64b2-e62d-4a9e-8564-b6b2dec63686",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "3964f5c1-714a-44b3-9cd9-b283f0f2385c",
        "shaderId": "timeline-a925ad8a-d4e0-41b2-8104-8a400305ab4e",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "daa8f13d-9734-459b-9b51-7fc02f9367c5",
        "shaderId": "timeline-5e93ac76-637f-4612-9fd8-db73b5701c3d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "242c06e9-b2bf-44e1-8e30-096b911bf3d1",
        "shaderId": "timeline-849de127-1c38-496c-bf40-8ec3d78b35d2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f7f30e7f-4c56-4c38-b7fd-af6fd5d64e58",
        "shaderId": "timeline-3c19df3f-b9af-42bd-bdbf-05ddfb8c0bdc",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "cbf8b1bf-d4bd-480f-a513-440337fe6c50",
        "shaderId": "timeline-9cd946ac-8937-4c4c-8bdd-82b85ecae9ce",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "be9f1720-2892-4967-9388-1bfebc141a28",
        "shaderId": "timeline-902506bd-be78-4068-9b44-bf3c0e976abb",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "dd2a930c-3955-4750-82f8-149c38caf15c",
        "shaderId": "timeline-582581f5-f5dc-427d-9111-6341e51a73fe",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "574e0ed0-329e-44d3-8eb1-fb277192812c",
        "shaderId": "timeline-784e3954-79aa-499f-b582-57387e44592d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e82c7ae5-9352-4170-b164-74ff7d3739fa",
        "shaderId": "timeline-c38dab8a-46cd-4a4a-ae65-f24adf97c99c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "c564a40a-2436-493b-9f5a-cde0374f84d9",
        "shaderId": "timeline-ae26c48a-100e-4de3-80d7-5fda335ee997",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "cf04ab57-8606-462e-abf0-f6d0a0b99461",
        "shaderId": "timeline-8b2d0a70-0eeb-4d40-a136-80262726d646",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "ce86a8f6-287a-4e5d-aaea-d569e0de1891",
        "shaderId": "timeline-1584ecb1-c347-4ba0-bfee-b5be88e326c7",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e2924e26-a73a-4a04-b185-0d31bcc3c27c",
        "shaderId": "timeline-a8c4c6c7-e951-4da2-b718-78f871a40dc5",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "2633965f-04b3-41ba-b3ac-64356b6ac2dc",
        "shaderId": "timeline-5fa1a59c-2e0a-4669-bdf7-298ec79365ad",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "dafd0f76-4b3d-4a74-9abb-b4fb8decfce2",
        "shaderId": "timeline-1fefae82-d782-4c0b-8136-71ba5a590554",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "ee109c4a-52c1-4d3d-9637-76f6d83b7917",
        "shaderId": "timeline-169bf921-3562-46c1-8210-b7f07bf727c0",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6705042c-f2e6-4a58-a47a-dae92365e5a4",
        "shaderId": "timeline-393fc5cd-1b95-4ce0-b587-39ab207fcdbc",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "16e8d6fa-80c6-436e-9272-befa73473925",
        "shaderId": "timeline-febc5b14-145a-43b8-a16e-2a09b25ead67",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "b738f8d8-8936-4547-b430-cc16859fd90d",
        "shaderId": "timeline-aecde05a-5cad-4e3c-bed9-e91fb727dd41",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "8882e3e7-8665-4996-a8bd-f966180b188d",
        "shaderId": "timeline-51edd1fa-eacf-4c0d-ba63-660ab202cf21",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "e022c7fa-ffab-4d2a-bd1d-685b059d39ae",
        "shaderId": "timeline-5f5dcfa8-8054-44d4-b2d1-43c035172743",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d9c7f8c6-2ef0-4b34-8d2d-935678c9bfda",
        "shaderId": "timeline-3bd1713a-4a65-4573-b692-049423ee5923",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "964f0b29-cbd4-4c99-8dd1-1eb5a5600c16",
        "shaderId": "timeline-a80f8f55-994d-4a20-8872-69d41a6342b2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "dbdbf045-bf49-439a-9ca2-af8b1fb9ca84",
        "shaderId": "timeline-91a5d9d8-cc19-4cb1-9753-2800de72f380",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6e27d414-c265-4e95-8e12-464644140636",
        "shaderId": "timeline-2c09491a-a584-41a1-af79-63f37c3d1918",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d27281eb-2dd1-449a-82aa-b4ef48bfd88d",
        "shaderId": "timeline-4e1cc927-2d8e-4110-bcaa-5af5e4e7e96d",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "21bbf714-cdfc-42cd-9d0d-66c8b997439d",
        "shaderId": "timeline-660c5838-9a06-4890-857a-eb53303e453f",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "eb52c81b-2368-4f72-8ef6-c2ec8415dec5",
        "shaderId": "timeline-3f118a43-a58b-403a-81c9-16fcef26ed98",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "6e7a91a0-c2b6-4662-b49a-b1d57216fc26",
        "shaderId": "timeline-324e3e70-3088-4eee-926f-39c55a6fbafe",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "3071386f-9379-4820-8016-3aad8c39f5b2",
        "shaderId": "timeline-c66e0916-d8f3-4355-8970-56ba50729b1c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "af609673-44b1-42b4-8d6d-fe916ad1e052",
        "shaderId": "timeline-a9cefb2d-7232-4542-a899-480aaeff89a3",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "5f3bca54-cf56-4a4a-9f1c-bc5193517171",
        "shaderId": "timeline-e704beaf-2f7f-499a-ae66-fb68d8f201af",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "1fb3df8a-a118-44f3-ba45-e3d0184201b8",
        "shaderId": "timeline-a5885cdc-8851-4407-9905-4c03ae8aa1d6",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "5e43aaed-2dc6-4934-8c2e-91c9c4ae2e36",
        "shaderId": "timeline-9e308c31-b4e9-44c2-9a3d-13d727bfea23",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "628a98d3-118e-4d4d-989f-1575014fc6fd",
        "shaderId": "timeline-1d7e1953-8d5f-4267-bddb-c21d3a4573c3",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "c36ac6b2-fc23-422d-bbc8-1ac164e089d5",
        "shaderId": "timeline-ca5bada9-08c4-4bc8-b345-49c5a25fa90c",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "df87f68a-88ea-4652-95f3-dbd313bf6246",
        "shaderId": "timeline-3dadcd1d-0015-4398-acec-77c550ea7de9",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "b59078de-6824-4c14-ab70-fde16b2bf002",
        "shaderId": "timeline-d78e5564-d7ba-436a-9bba-b1d41178be40",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "d12a1f6f-3d6b-4fe2-9f25-2176380ebc30",
        "shaderId": "timeline-24b4b70b-b8f8-4cad-9f91-9bd51b8da4f2",
        "durationSeconds": 4.46,
        "transitionDurationSeconds": 0.42,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "ef829eb0-7520-49b7-b758-3f3422c0390e",
        "shaderId": "timeline-0767f777-b318-4034-95de-e4f11c21702d",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "996de30c-4b03-4c1c-8145-f94e5165c235",
        "shaderId": "timeline-c7702eee-0b9b-48a8-8b58-95a92d5b29b0",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "0a037be6-f81f-41f6-a699-263e74f3fa36",
        "shaderId": "timeline-89ca6d14-53be-47ba-b486-31697c70d7fd",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "f6a495ca-a2ed-43b5-abad-64990d899c4d",
        "shaderId": "timeline-7b504049-02fd-49bb-8ac7-117d484a12a7",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "4e3dec09-479d-4125-b994-9739f7f80370",
        "shaderId": "timeline-76e605f9-8103-468f-9cfe-1012e1e9fae8",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "3aa4bc69-751e-4b17-b6d6-56236fdcea5c",
        "shaderId": "timeline-a0b3ee90-a0f9-480a-8092-eb79d0273de0",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "ef08abad-4a47-4321-93e3-1134a3178862",
        "shaderId": "timeline-4c303084-1609-4be2-bb1f-c286953e2133",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "075d7f16-3f69-4ba9-96c4-671c3b6c1cb0",
        "shaderId": "timeline-43e35479-e42c-4329-ba4f-af4e9c848932",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "7cad148a-feb7-4b64-b81a-2783be3711d4",
        "shaderId": "timeline-f9abab5a-10eb-45f1-9024-753401ce3fe8",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "dc7f904a-f6e4-45f3-acdd-c1c164e84046",
        "shaderId": "timeline-e162f45a-cb0e-492a-a56a-f9a98a372eb0",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "b9ff56e1-5201-4aa3-ab4d-fb45c6784ef8",
        "shaderId": "timeline-c5a7d912-d516-4fc9-a50a-d0c874d873f1",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
          "fitMode": "cover",
          "quality": "balanced",
          "clipStartSeconds": 0,
          "clipDurationSeconds": null
        }
      },
      {
        "id": "4f8afa5d-a25c-4767-885a-995c88e35874",
        "shaderId": "timeline-5dd65d0c-e711-4248-abdd-14ab8dec8b5e",
        "durationSeconds": 8,
        "transitionDurationSeconds": 0.75,
        "transitionEffect": "mix",
        "disabled": false,
        "assetSettings": {
          "scaleX": 1,
          "scaleY": 1,
          "offsetX": 0,
          "offsetY": 0,
          "opacity": 0.85,
          "blendMode": "maskedReveal",
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
