import type { LightingOptions, SurfaceResult } from './types';
export function renderLighting(result: SurfaceResult, rgba: Uint8ClampedArray, options: LightingOptions, overlay?: boolean, selected?: number, fieldOnly?: boolean): Uint8ClampedArray<ArrayBuffer>;
export function exportLighting(result: SurfaceResult, rgba: Uint8ClampedArray, width: number, height: number, nativeRgba: Uint8ClampedArray, options: LightingOptions, fieldOnly?: boolean, refined?: SurfaceResult): Uint8ClampedArray<ArrayBuffer>;
