import type {
  DistortionPoint,
  StageDistortion,
} from '../types';

export type StageDistortionCorner =
  | 'topLeft'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft';

export const STAGE_DISTORTION_CORNERS: readonly StageDistortionCorner[] = [
  'topLeft',
  'topRight',
  'bottomRight',
  'bottomLeft',
];

export const MAX_STAGE_DISTORTION_OFFSET = 0.3;

export const DEFAULT_STAGE_DISTORTION: StageDistortion = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 0, y: 0 },
  bottomRight: { x: 0, y: 0 },
  bottomLeft: { x: 0, y: 0 },
};

const CORNER_ORIGINS: Record<StageDistortionCorner, DistortionPoint> = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 1, y: 0 },
  bottomRight: { x: 1, y: 1 },
  bottomLeft: { x: 0, y: 1 },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeOffset(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, -MAX_STAGE_DISTORTION_OFFSET, MAX_STAGE_DISTORTION_OFFSET)
    : fallback;
}

function readPoint(value: unknown): Partial<DistortionPoint> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<DistortionPoint>
    : null;
}

export function cloneStageDistortion(
  distortion: StageDistortion = DEFAULT_STAGE_DISTORTION,
): StageDistortion {
  return {
    topLeft: { ...distortion.topLeft },
    topRight: { ...distortion.topRight },
    bottomRight: { ...distortion.bottomRight },
    bottomLeft: { ...distortion.bottomLeft },
  };
}

export function normalizeStageDistortion(
  value: unknown,
  fallback: StageDistortion = DEFAULT_STAGE_DISTORTION,
): StageDistortion {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Partial<Record<StageDistortionCorner, unknown>>
      : {};

  return STAGE_DISTORTION_CORNERS.reduce<StageDistortion>((result, corner) => {
    const point = readPoint(source[corner]);
    result[corner] = {
      x: normalizeOffset(point?.x, fallback[corner].x),
      y: normalizeOffset(point?.y, fallback[corner].y),
    };
    return result;
  }, cloneStageDistortion(fallback));
}

export function getStageDistortionPoint(
  distortion: StageDistortion,
  corner: StageDistortionCorner,
): DistortionPoint {
  const origin = CORNER_ORIGINS[corner];
  return {
    x: origin.x + distortion[corner].x,
    y: origin.y + distortion[corner].y,
  };
}

export function setStageDistortionPoint(
  distortion: StageDistortion,
  corner: StageDistortionCorner,
  point: DistortionPoint,
): StageDistortion {
  const origin = CORNER_ORIGINS[corner];
  return normalizeStageDistortion({
    ...distortion,
    [corner]: {
      x: point.x - origin.x,
      y: point.y - origin.y,
    },
  }, distortion);
}

export function nudgeStageDistortionPoint(
  distortion: StageDistortion,
  corner: StageDistortionCorner,
  deltaX: number,
  deltaY: number,
): StageDistortion {
  const point = getStageDistortionPoint(distortion, corner);
  return setStageDistortionPoint(distortion, corner, {
    x: point.x + deltaX,
    y: point.y + deltaY,
  });
}

export function isStageDistortionIdentity(distortion: StageDistortion): boolean {
  return STAGE_DISTORTION_CORNERS.every(
    (corner) =>
      Math.abs(distortion[corner].x) < 0.000001 &&
      Math.abs(distortion[corner].y) < 0.000001,
  );
}

/**
 * Creates a CSS projective transform from a rectangle to the saved four-corner
 * quadrilateral. The distortion coordinates are normalized, so the same data
 * renders consistently in the workspace and in a differently sized Output.
 */
export function createStageDistortionMatrix3d(
  distortion: StageDistortion,
  width: number,
  height: number,
): string | undefined {
  if (
    isStageDistortionIdentity(distortion) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }

  const topLeft = getStageDistortionPoint(distortion, 'topLeft');
  const topRight = getStageDistortionPoint(distortion, 'topRight');
  const bottomRight = getStageDistortionPoint(distortion, 'bottomRight');
  const bottomLeft = getStageDistortionPoint(distortion, 'bottomLeft');
  const dx1 = topRight.x - bottomRight.x;
  const dx2 = bottomLeft.x - bottomRight.x;
  const dx3 = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x;
  const dy1 = topRight.y - bottomRight.y;
  const dy2 = bottomLeft.y - bottomRight.y;
  const dy3 = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y;

  let perspectiveX = 0;
  let perspectiveY = 0;
  if (Math.abs(dx3) > 0.000001 || Math.abs(dy3) > 0.000001) {
    const determinant = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(determinant) < 0.000001) {
      return undefined;
    }
    perspectiveX = (dx3 * dy2 - dx2 * dy3) / determinant;
    perspectiveY = (dx1 * dy3 - dx3 * dy1) / determinant;
  }

  const scaleX = topRight.x - topLeft.x + perspectiveX * topRight.x;
  const skewX = bottomLeft.x - topLeft.x + perspectiveY * bottomLeft.x;
  const translateX = topLeft.x;
  const skewY = topRight.y - topLeft.y + perspectiveX * topRight.y;
  const scaleY = bottomLeft.y - topLeft.y + perspectiveY * bottomLeft.y;
  const translateY = topLeft.y;

  const values = [
    scaleX,
    (height / width) * skewY,
    0,
    perspectiveX / width,
    (width / height) * skewX,
    scaleY,
    0,
    perspectiveY / height,
    0,
    0,
    1,
    0,
    width * translateX,
    height * translateY,
    0,
    1,
  ].map((value) => Math.abs(value) < 0.0000001 ? 0 : Number(value.toFixed(10)));

  return `matrix3d(${values.join(', ')})`;
}
