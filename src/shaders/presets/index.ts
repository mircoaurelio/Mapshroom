import type { ShaderDefinition } from '../../types';
import { cyberGlitchShader } from './cyberGlitch';
import { psychedelicBlobShader } from './psychedelicBlob';

export const shaderPresets: Record<string, ShaderDefinition> = {
  [psychedelicBlobShader.id]: psychedelicBlobShader,
  [cyberGlitchShader.id]: cyberGlitchShader,
};
