import type { ShaderDefinition } from '../../types';
import { neonGlowShader } from './neonGlow';
import { pulsingSoftHaloShader } from './pulsingSoftHalo';
import { pixelSortShader } from './pixelSort';
import { psychedelicBlobShader } from './psychedelicBlob';
import { psychedelicHaloShader } from './psychedelicHalo';
import { psychedelicHaloOnlyShader } from './psychedelicHaloOnly';
import { softPsychedelicHaloShader } from './softPsychedelicHalo';
import { thermalVisionShader } from './thermalVision';
import { watercolorShader } from './watercolor';

export const shaderPresets: Record<string, ShaderDefinition> = {
  [psychedelicBlobShader.id]: psychedelicBlobShader,
  [psychedelicHaloShader.id]: psychedelicHaloShader,
  [psychedelicHaloOnlyShader.id]: psychedelicHaloOnlyShader,
  [softPsychedelicHaloShader.id]: softPsychedelicHaloShader,
  [pulsingSoftHaloShader.id]: pulsingSoftHaloShader,
  [neonGlowShader.id]: neonGlowShader,
  [pixelSortShader.id]: pixelSortShader,
  [thermalVisionShader.id]: thermalVisionShader,
  [watercolorShader.id]: watercolorShader,
};
