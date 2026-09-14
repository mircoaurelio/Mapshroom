import type { ProjectDocument, StageTransform } from '../types';

export function validStageAspectRatio(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function preserveStageFrame(transform: StageTransform, aspectRatio?: number | null): StageTransform {
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
