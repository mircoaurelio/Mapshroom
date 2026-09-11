export interface SuggestedSurfaces { method: 'shape' | 'graph'; zones: number; smoothing: number; black: number; resolution: number; darkBackground: boolean; hasAlpha: boolean }
export interface ProcessingProfile { id: 'limited' | 'mobile' | 'desktop'; mobile: boolean; ai: boolean; canEnableAI: boolean; maxPixels: number; maxEdge: number; label: string }
export function suggestSurfaceSettings(rgba: Uint8ClampedArray, width: number, height: number, mobile?: boolean): SuggestedSurfaces;
export function processingProfile(input?: { mobile?: boolean; memory?: number; supported?: boolean }): ProcessingProfile;
export function fitProcessingSize(width: number, height: number, profile: ProcessingProfile): { width: number; height: number };
export function connectedDarkAlpha(rgba: Uint8ClampedArray, width: number, height: number, threshold?: number): Uint8ClampedArray;
