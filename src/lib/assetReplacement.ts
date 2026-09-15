import type { ProjectDocument, StageTransform } from '../types';
import { normalizeStageDistortion } from './distortion.ts';

export function validStageAspectRatio(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Position alone does not change the image's proportions. */
export function hasStageFrameCalibration(transform: StageTransform): boolean {
  return [transform.widthAdjust, transform.heightAdjust, transform.rotationDegrees]
    .some(value => Number.isFinite(value) && value !== 0) ||
    Object.values(normalizeStageDistortion(transform.distortion)).some(point => point.x !== 0 || point.y !== 0);
}

function hasStageCalibration(transform: StageTransform): boolean {
  // A positioned image still needs its saved frame when another asset replaces it.
  return hasStageFrameCalibration(transform) || [transform.offsetX, transform.offsetY]
    .some(value => Number.isFinite(value) && value !== 0);
}

export function getCalibratedStageAspectRatio(transform: StageTransform): number | undefined {
  // Older uploads captured the empty preview's landscape frame even when no
  // mapping had been applied. Ignore those stale ratios when reopening a project.
  return hasStageCalibration(transform) ? validStageAspectRatio(transform.referenceAspectRatio) : undefined;
}

export function preserveStageFrame(transform: StageTransform, aspectRatio?: number | null): StageTransform {
  // Opening Move, displaying its grid, or changing precision does not calibrate
  // the frame. Until geometry changes, every new photo determines its own shape.
  if (!hasStageCalibration(transform)) {
    if (transform.referenceAspectRatio === undefined) return transform;
    const next = { ...transform };
    delete next.referenceAspectRatio;
    return next;
  }
  if (validStageAspectRatio(transform.referenceAspectRatio)) return transform;
  const referenceAspectRatio = validStageAspectRatio(aspectRatio);
  return referenceAspectRatio ? { ...transform, referenceAspectRatio } : transform;
}

export function readStageFrameAspectRatio(canvas: HTMLCanvasElement | null): number | undefined {
  if (!canvas) return undefined;
  // CSS dimensions exclude the rotation and corner warp already applied to
  // the frame. Keep their precision instead of rounding to backing pixels.
  return validStageAspectRatio(Number.parseFloat(canvas.style.width) / Number.parseFloat(canvas.style.height));
}

export function replaceStageAsset(project: ProjectDocument, assetId: string | null, aspectRatio?: number | null): ProjectDocument {
  if (assetId !== null && !project.library.assets.some(asset => asset.id === assetId)) return project;
  return {
    ...project,
    library: { ...project.library, activeAssetId: assetId },
    playback: { ...project.playback, activeAssetId: assetId },
    mapping: { ...project.mapping, stageTransform: preserveStageFrame(project.mapping.stageTransform, aspectRatio) },
  };
}
