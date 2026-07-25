import type { StageDistortion, StageTransform } from '../types';
import {
  DEFAULT_STAGE_DISTORTION,
  normalizeStageDistortion,
} from './distortion';

export const MAPPING_POSITION_FORMAT = 'mapshroom-position';
export const MAPPING_POSITION_VERSION = 2;
export const MIN_MAPPING_PRECISION = 1;
export const MAX_MAPPING_PRECISION = 40;
export const MIN_MAPPING_ROTATION = -20;
export const MAX_MAPPING_ROTATION = 20;

export interface MappingPositionValues {
  offsetX: number;
  offsetY: number;
  widthAdjust: number;
  heightAdjust: number;
  precision: number;
  rotationDegrees: number;
  distortion: StageDistortion;
}

export interface MappingPositionFile {
  format: typeof MAPPING_POSITION_FORMAT;
  version: typeof MAPPING_POSITION_VERSION;
  exportedAt: string;
  position: MappingPositionValues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readFiniteNumber(
  source: Record<string, unknown>,
  key: Exclude<keyof MappingPositionValues, 'distortion'>,
): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Position file is missing a valid "${key}" value.`);
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRotation(value: number): number {
  const clamped = clamp(value, MIN_MAPPING_ROTATION, MAX_MAPPING_ROTATION);
  const rounded = Math.round(clamped * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeMappingPosition(
  value: Partial<MappingPositionValues> | null | undefined,
  fallback: Omit<MappingPositionValues, 'distortion'> & {
    distortion?: StageDistortion;
  },
): MappingPositionValues {
  const finiteOrFallback = (
    candidate: number | undefined,
    fallbackValue: number,
  ) => (typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallbackValue);

  return {
    offsetX: finiteOrFallback(value?.offsetX, fallback.offsetX),
    offsetY: finiteOrFallback(value?.offsetY, fallback.offsetY),
    widthAdjust: finiteOrFallback(value?.widthAdjust, fallback.widthAdjust),
    heightAdjust: finiteOrFallback(value?.heightAdjust, fallback.heightAdjust),
    precision: clamp(
      Math.round(finiteOrFallback(value?.precision, fallback.precision)),
      MIN_MAPPING_PRECISION,
      MAX_MAPPING_PRECISION,
    ),
    rotationDegrees: normalizeRotation(
      finiteOrFallback(value?.rotationDegrees, fallback.rotationDegrees),
    ),
    distortion: normalizeStageDistortion(
      value?.distortion,
      fallback.distortion ?? DEFAULT_STAGE_DISTORTION,
    ),
  };
}

export function createMappingPositionFile(
  stageTransform: StageTransform,
): MappingPositionFile {
  return {
    format: MAPPING_POSITION_FORMAT,
    version: MAPPING_POSITION_VERSION,
    exportedAt: new Date().toISOString(),
    position: {
      offsetX: stageTransform.offsetX,
      offsetY: stageTransform.offsetY,
      widthAdjust: stageTransform.widthAdjust,
      heightAdjust: stageTransform.heightAdjust,
      precision: stageTransform.precision,
      rotationDegrees: stageTransform.rotationDegrees,
      distortion: normalizeStageDistortion(stageTransform.distortion),
    },
  };
}

export function parseMappingPositionFile(source: string): MappingPositionValues {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('This is not a valid JSON position file.');
  }

  if (!isRecord(parsed)) {
    throw new Error('This position file has an invalid structure.');
  }

  const isPortableFile = parsed.format === MAPPING_POSITION_FORMAT;
  if (
    isPortableFile &&
    parsed.version !== 1 &&
    parsed.version !== MAPPING_POSITION_VERSION
  ) {
    throw new Error('This position file version is not supported.');
  }

  const position = isPortableFile ? parsed.position : parsed;
  if (!isRecord(position)) {
    throw new Error('This position file does not contain mapping coordinates.');
  }

  return normalizeMappingPosition(
    {
      offsetX: readFiniteNumber(position, 'offsetX'),
      offsetY: readFiniteNumber(position, 'offsetY'),
      widthAdjust: readFiniteNumber(position, 'widthAdjust'),
      heightAdjust: readFiniteNumber(position, 'heightAdjust'),
      precision: readFiniteNumber(position, 'precision'),
      rotationDegrees:
        typeof position.rotationDegrees === 'number' &&
        Number.isFinite(position.rotationDegrees)
          ? position.rotationDegrees
          : 0,
      distortion: normalizeStageDistortion(position.distortion),
    },
    {
      offsetX: 0,
      offsetY: 0,
      widthAdjust: 0,
      heightAdjust: 0,
      precision: 12,
      rotationDegrees: 0,
      distortion: DEFAULT_STAGE_DISTORTION,
    },
  );
}
