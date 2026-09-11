export type SurfaceMethod = 'shape' | 'graph' | 'pidi';
export type SurfaceOutput = 'gradient' | 'field' | 'regions' | 'edges' | 'mask';
export interface SurfaceSettings {
  zones: number;
  smoothing: number;
  black: number;
  resolution: number;
}
export interface SurfaceResult {
  labels: Uint32Array;
  edges: Uint8Array;
  width: number;
  height: number;
  count: number;
}
export interface LightingOptions {
  style: 'radial' | 'linear' | 'global';
  palette: 'thermal' | 'cool';
  angle: number;
  texture: number;
  feather: number;
  black?: number;
}
