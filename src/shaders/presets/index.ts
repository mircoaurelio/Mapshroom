import type { ShaderDefinition } from '../../types';
import { neonGlowShader } from './neonGlow';
import { pixelSortShader } from './pixelSort';
import { psychedelicBlobShader } from './psychedelicBlob';
import { psychedelicHaloShader } from './psychedelicHalo';
import { psychedelicHaloOnlyShader } from './psychedelicHaloOnly';
import { thermalVisionShader } from './thermalVision';
import { watercolorShader } from './watercolor';

export const shaderPresets: Record<string, ShaderDefinition> = {
  [psychedelicBlobShader.id]: psychedelicBlobShader,
  [psychedelicHaloShader.id]: psychedelicHaloShader,
  [psychedelicHaloOnlyShader.id]: psychedelicHaloOnlyShader,
  [neonGlowShader.id]: neonGlowShader,
  [pixelSortShader.id]: pixelSortShader,
  [thermalVisionShader.id]: thermalVisionShader,
  [watercolorShader.id]: watercolorShader,
};
