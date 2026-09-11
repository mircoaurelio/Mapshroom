import type { SurfaceResult } from './types';
export function renderResult(result: SurfaceResult, rgba: Uint8ClampedArray, mode: 'regions' | 'edges' | 'overlay', opacity?: number, selected?: number): Uint8ClampedArray<ArrayBuffer>;
export function exportRaster(result: SurfaceResult, width: number, height: number, type: 'ids' | 'edges' | 'mask' | 'palette', selected?: number): Uint8ClampedArray<ArrayBuffer>;
