import { blankShaderTemplate } from './templates/blankShader';

export const SHADER_REQUEST_CONTRACT = `Return one complete replacement fragment shader.
The first non-empty line must be: // NAME: <Short Name>
All visual logic must live inside: vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution)
Use only supported custom uniforms: float, int, vec3, bool
Use WebGL 1.0 GLSL syntax and texture2D()
Do not include explanations outside the GLSL response`;

export function buildShaderMutationPrompt(prompt: string, currentCode: string): string {
  return `User request:
${prompt.trim()}

Current GLSL:
\`\`\`glsl
${currentCode.trim()}
\`\`\`

Required shader structure:
\`\`\`glsl
${blankShaderTemplate}
\`\`\`

Shader contract:
${SHADER_REQUEST_CONTRACT}

Return a complete shader that follows the required structure exactly.`;
}
