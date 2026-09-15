import type { StageTransform } from '../types';

export interface ProjectionSize { width: number; height: number }

export function fittedProjectionSize(viewport: ProjectionSize, aspectRatio: number): ProjectionSize {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : viewport.width / viewport.height;
  const width = Math.min(viewport.width, viewport.height * ratio);
  return { width, height: width / ratio };
}

export function projectionImageSize(transform: StageTransform, viewport: ProjectionSize, aspectRatio: number): ProjectionSize {
  const base = fittedProjectionSize(viewport, aspectRatio);
  return {
    width: base.width * Math.max(0, 1 + transform.widthAdjust / viewport.width),
    height: base.height * Math.max(0, 1 + transform.heightAdjust / viewport.height),
  };
}

/** Convert a movement in output pixels into the image's local corner coordinates. */
export function projectionDistortionDelta(transform: StageTransform, viewport: ProjectionSize, aspectRatio: number,
  delta: { x: number; y: number }): { x: number; y: number } {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return { x: 0, y: 0 };
  const size = projectionImageSize(transform, viewport, aspectRatio);
  const angle = (Number.isFinite(transform.rotationDegrees) ? transform.rotationDegrees : 0) * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: size.width > 0 ? (delta.x * cosine + delta.y * sine) / size.width : 0,
    y: size.height > 0 ? (delta.y * cosine - delta.x * sine) / size.height : 0,
  };
}

/** Mapping stores scale as a pixel delta of the output viewport, not of the fitted image. */
export function resizeProjectionImage(transform: StageTransform, viewport: ProjectionSize, aspectRatio: number,
  axis: 'width' | 'height', value: number, linked: boolean): Partial<StageTransform> {
  if (!Number.isFinite(value)) return {};
  const base = fittedProjectionSize(viewport, aspectRatio);
  const current = projectionImageSize(transform, viewport, aspectRatio);
  const next = { ...current, [axis]: Math.max(base[axis] * 0.05, value) };
  if (linked) {
    const other = axis === 'width' ? 'height' : 'width';
    const ratio = current[axis] > 0 && current[other] > 0 ? current[other] / current[axis] : base[other] / base[axis];
    next[other] = Math.max(base[other] * 0.05, next[axis] * ratio);
  }
  return {
    widthAdjust: (next.width / base.width - 1) * viewport.width,
    heightAdjust: (next.height / base.height - 1) * viewport.height,
  };
}
