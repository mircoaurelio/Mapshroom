import type { ShaderDefinition, ShaderUniformValueMap } from '../../types';

export interface ShaderPresetDefinition extends ShaderDefinition {
  uniformValues?: ShaderUniformValueMap;
}
