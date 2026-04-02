import type { ShaderDefinition } from '../../types';
import { cyberGlitchShader } from './cyberGlitch';
import { kaleidoscopeShader } from './kaleidoscope';
import { neonGlowShader } from './neonGlow';
import { pixelSortShader } from './pixelSort';
import { psychedelicBlobShader } from './psychedelicBlob';
import { thermalVisionShader } from './thermalVision';
import { watercolorShader } from './watercolor';

export const shaderPresets: Record<string, ShaderDefinition> = {
  [psychedelicBlobShader.id]: psychedelicBlobShader,
  [cyberGlitchShader.id]: cyberGlitchShader,
  [kaleidoscopeShader.id]: kaleidoscopeShader,
  [neonGlowShader.id]: neonGlowShader,
  [pixelSortShader.id]: pixelSortShader,
  [thermalVisionShader.id]: thermalVisionShader,
  [watercolorShader.id]: watercolorShader,
};
