import { blankShaderTemplate } from './templates/blankShader';

export const SHADER_REQUEST_CONTRACT = `Return one complete replacement fragment shader.
The first non-empty line must be: // NAME: <Short Name>
All visual logic must live inside: vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution)
Expose 3 to 6 meaningful effect controls as custom uniforms so Mapshroom automatically creates sliders (for example speed, intensity, scale, threshold, color)
Use only supported custom uniform types: float, int, vec3, bool
Put every uniform on its own line and keep its UI metadata on that same line after //
Every float or int must include: @min <number> @max <number> @default <number>
Every vec3 must include: @default <r>,<g>,<b>; every bool must include: @default true|false
Preserve useful uniforms from the current shader unless the user explicitly asks to remove them
Use GLSL ES 3.00 syntax for WebGL 2 and sample textures with texture()
Do not include #version 300 es because Mapshroom injects the version and program wrapper
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
  return `You are a strict GLSL ES 3.00 shader generator for WebGL 2.
Generate a complete replacement shader that the user can copy and paste back into Mapshroom.
Follow every shader rule and final-response rule below.

IMPORTANT: the returned shader must include annotated uniforms. Without the exact @min, @max and @default comments Mapshroom cannot create the slider controls.

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
