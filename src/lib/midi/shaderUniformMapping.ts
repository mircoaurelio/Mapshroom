import type { ShaderUniformMap } from '../../types';

const MAX_FADERS = 8;

export function getShaderSliderUniforms(definitions: ShaderUniformMap): string[] {
  return Object.entries(definitions)
    .filter(([, definition]) => definition.type === 'float' || definition.type === 'int')
    .map(([name]) => name)
    .slice(0, MAX_FADERS);
}

export function scaleMidiValueToUniform(
  midiValue: number,
  min: number,
  max: number,
  type: 'float' | 'int',
): number {
  const normalized = Math.max(0, Math.min(127, midiValue)) / 127;
  const scaled = min + normalized * (max - min);

  if (type === 'int') {
    return Math.round(scaled);
  }

  return scaled;
}

export function resolveUniformForFader(
  faderIndex: number,
  definitions: ShaderUniformMap,
): { name: string; min: number; max: number; type: 'float' | 'int' } | null {
  const sliderUniforms = getShaderSliderUniforms(definitions);
  const uniformName = sliderUniforms[faderIndex];

  if (!uniformName) {
    return null;
  }

  const definition = definitions[uniformName];
  if (!definition || (definition.type !== 'float' && definition.type !== 'int')) {
    return null;
  }

  return {
    name: uniformName,
    min: definition.min,
    max: definition.max,
    type: definition.type,
  };
}
