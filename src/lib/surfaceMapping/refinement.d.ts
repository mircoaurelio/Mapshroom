import type { LightingOptions, SurfaceOutput, SurfaceResult } from './types';
export function refineSurfaces(result: SurfaceResult, rgba: Uint8ClampedArray, width: number, height: number, original: Uint8ClampedArray, black?: number): SurfaceResult;
export function renderRefined(result: SurfaceResult, rgba: Uint8ClampedArray, refined: SurfaceResult, original: Uint8ClampedArray, lighting: LightingOptions, output: SurfaceOutput, selected?: number): Uint8ClampedArray<ArrayBuffer>;
