import type { LightingOptions, SurfaceOutput } from './types';
export interface PreviewOptions { lighting: LightingOptions; output: SurfaceOutput; selected: number; original: boolean }
export interface PreviewRequest extends PreviewOptions { requestId: number }
export interface PreviewReply { requestId: number; pixels?: Uint8ClampedArray<ArrayBuffer>; width?: number; height?: number; error?: string }
export function createPreviewQueue(send: (request: PreviewRequest) => void, accept: (reply: PreviewReply) => void): {
  request(options: PreviewOptions): void;
  complete(reply: PreviewReply): void;
  dispose(): void;
};
