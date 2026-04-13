import type {
  TimelineAssetBlendMode,
  TimelineAssetFitMode,
  TimelineAssetQuality,
  TimelineStepAssetSettings,
} from '../types';

export const TIMELINE_ASSET_BLEND_MODE_OPTIONS: Array<{
  value: TimelineAssetBlendMode;
  label: string;
}> = [
  { value: 'mix', label: 'Mix' },
  { value: 'screen', label: 'Screen' },
  { value: 'add', label: 'Add' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'maskedReveal', label: 'Masked Reveal' },
];

export const TIMELINE_ASSET_FIT_MODE_OPTIONS: Array<{
  value: TimelineAssetFitMode;
  label: string;
}> = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'fitWidth', label: 'Fit Width' },
  { value: 'fitHeight', label: 'Fit Height' },
];

export const TIMELINE_ASSET_QUALITY_OPTIONS: Array<{
  value: TimelineAssetQuality;
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' },
];

export const DEFAULT_TIMELINE_STEP_ASSET_SETTINGS: TimelineStepAssetSettings = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 0.85,
  blendMode: 'maskedReveal',
  fitMode: 'cover',
  quality: 'balanced',
  clipStartSeconds: 0,
  clipDurationSeconds: null,
};

function clampFinite(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}

export function clampTimelineAssetScale(value: number): number {
  return Math.round(clampFinite(value, 1, 0.1, 4) * 100) / 100;
}

export function clampTimelineAssetOffset(value: number): number {
  return Math.round(clampFinite(value, 0, -1.5, 1.5) * 100) / 100;
}

export function clampTimelineAssetOpacity(value: number): number {
  return Math.round(clampFinite(value, 0.85, 0, 1) * 100) / 100;
}

export function clampTimelineAssetClipStartSeconds(value: number): number {
  return Math.round(clampFinite(value, 0, 0, 36000) * 100) / 100;
}

export function clampTimelineAssetClipDurationSeconds(value: number | null | undefined): number | null {
  if (value === null || value === undefined || value <= 0 || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.max(0.1, Math.min(36000, value)) * 100) / 100;
}

export function normalizeTimelineStepAssetSettings(
  settings?: Partial<TimelineStepAssetSettings> | null,
): TimelineStepAssetSettings {
  const nextSettings = settings ?? {};
  const blendMode = TIMELINE_ASSET_BLEND_MODE_OPTIONS.some(
    (option) => option.value === nextSettings.blendMode,
  )
    ? (nextSettings.blendMode as TimelineAssetBlendMode)
    : DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.blendMode;
  const fitMode = TIMELINE_ASSET_FIT_MODE_OPTIONS.some((option) => option.value === nextSettings.fitMode)
    ? (nextSettings.fitMode as TimelineAssetFitMode)
    : DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.fitMode;
  const quality = TIMELINE_ASSET_QUALITY_OPTIONS.some((option) => option.value === nextSettings.quality)
    ? (nextSettings.quality as TimelineAssetQuality)
    : DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.quality;

  return {
    scaleX: clampTimelineAssetScale(nextSettings.scaleX ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.scaleX),
    scaleY: clampTimelineAssetScale(nextSettings.scaleY ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.scaleY),
    offsetX: clampTimelineAssetOffset(
      nextSettings.offsetX ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.offsetX,
    ),
    offsetY: clampTimelineAssetOffset(
      nextSettings.offsetY ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.offsetY,
    ),
    opacity: clampTimelineAssetOpacity(
      nextSettings.opacity ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.opacity,
    ),
    blendMode,
    fitMode,
    quality,
    clipStartSeconds: clampTimelineAssetClipStartSeconds(
      nextSettings.clipStartSeconds ?? DEFAULT_TIMELINE_STEP_ASSET_SETTINGS.clipStartSeconds,
    ),
    clipDurationSeconds: clampTimelineAssetClipDurationSeconds(nextSettings.clipDurationSeconds),
  };
}

export function getTimelineAssetBlendModeIndex(mode: TimelineAssetBlendMode): number {
  return Math.max(
    0,
    TIMELINE_ASSET_BLEND_MODE_OPTIONS.findIndex((option) => option.value === mode),
  );
}

export function getTimelineAssetFitModeIndex(mode: TimelineAssetFitMode): number {
  return Math.max(0, TIMELINE_ASSET_FIT_MODE_OPTIONS.findIndex((option) => option.value === mode));
}

export function getTimelineAssetQualityIndex(quality: TimelineAssetQuality): number {
  return Math.max(
    0,
    TIMELINE_ASSET_QUALITY_OPTIONS.findIndex((option) => option.value === quality),
  );
}

export function createTimelineAssetSourceKey(
  assetId: string,
  scope: string,
  settings: TimelineStepAssetSettings,
): string {
  return [
    scope,
    assetId,
    settings.quality,
    settings.clipStartSeconds.toFixed(2),
    settings.clipDurationSeconds === null ? 'auto' : settings.clipDurationSeconds.toFixed(2),
  ].join(':');
}
