import { blankShaderTemplate } from './templates/blankShader';

export const SHADER_REQUEST_CONTRACT = `Return one complete replacement fragment shader.
The first non-empty line must be: // NAME: <Short Name>
All visual logic must live inside: vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution)
Use only supported custom uniforms: float, int, vec3, bool
Use WebGL 1.0 GLSL syntax and texture2D()
Do not declare void main()
Do not write to gl_FragColor in the generated body
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

export function buildExternalChatShaderPrompt(
  prompt: string,
  currentCode: string,
): string {
  return `You are a strict GLSL WebGL 1.0 shader generator.
Generate a complete replacement shader that the user can copy and paste back into Mapshroom.
Follow every shader rule and final-response rule below.

CURRENT GLSL TO REPLACE:
\`\`\`glsl
${currentCode.trim()}
\`\`\`

REQUIRED SHADER STRUCTURE:
\`\`\`glsl
${blankShaderTemplate}
\`\`\`

SHADER CONTRACT:
${SHADER_REQUEST_CONTRACT}

Return ONLY the complete replacement shader inside one fenced \`\`\`glsl code block.
The code block must begin with // NAME: and contain the complete processColor() implementation.
Do not create a link, URL, encoded payload, data URI, or attachment.
Do not add an explanation, title, warning, or any text before or after the GLSL code block.

USER REQUEST:
${prompt.trim()}`;
}
