import { formatShaderPromptComment } from '../lib/shaderPromptMetadata';

function buildRequiredShaderStructure(promptComment: string): string {
  return `// NAME: Short Effect Name
${promptComment}
uniform float speed; // @min -2.0 @max 2.0 @default 0.25
uniform float amount; // @min 0.0 @max 2.0 @default 1.0
uniform float scale; // @min 0.25 @max 8.0 @default 2.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture(tex, uv);
    // Replace this example with the requested effect and use every declared control.
    float modulation = 1.0 + sin(time * speed + uv.x * scale) * 0.1 * amount;
    return vec4(source.rgb * modulation, source.a);
}`;
}

export const SHADER_REQUEST_CONTRACT = `Return one complete replacement fragment shader.
The first non-empty line must be: // NAME: <Short Name>
The second non-empty line must be: // MAPSHROOM PROMPT: "<the exact user request as a JSON string>"
All visual logic must live inside: vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution)
Expose 3 to 6 meaningful effect controls as custom uniforms so Mapshroom automatically creates controls. Convert adjustable concepts in the request into uniforms instead of hardcoded constants: numbers become float/int sliders, colors become vec3 color controls, and switches become bool controls
If the user does not name adjustable parameters, infer the 3 to 6 most useful creative controls for the requested effect
Use only supported custom uniform types: float, int, vec3, bool
Put every uniform on its own line and keep its UI metadata on that same line after //
Every float or int must include: @min <number> @max <number> @default <number>
Every vec3 must include: @default <r>,<g>,<b>; every bool must include: @default true|false
The shader is invalid if it has fewer than 3 correctly annotated custom uniforms. Before returning, count the declarations and verify their metadata
Preserve useful uniforms from the current shader unless the user explicitly asks to remove them
Use GLSL ES 3.00 syntax for WebGL 2 and sample textures with texture()
Do not include #version 300 es because Mapshroom injects the version and program wrapper
Do not declare void main()
Do not write to gl_FragColor in the generated body
Do not include explanations outside the GLSL response`;

export function buildShaderMutationPrompt(prompt: string, currentCode: string): string {
  const promptComment = formatShaderPromptComment(prompt);
  const requiredShaderStructure = buildRequiredShaderStructure(promptComment);
  return `User request:
${prompt.trim()}

Required prompt record line (copy it verbatim as the second non-empty line):
${promptComment}

Current GLSL:
\`\`\`glsl
${currentCode.trim()}
\`\`\`

Required shader structure:
\`\`\`glsl
${requiredShaderStructure}
\`\`\`

Shader contract:
${SHADER_REQUEST_CONTRACT}

Return a complete shader that follows the required structure exactly.`;
}

export function buildExternalChatShaderPrompt(
  prompt: string,
  currentCode: string,
): string {
  const promptComment = formatShaderPromptComment(prompt);
  const requiredShaderStructure = buildRequiredShaderStructure(promptComment);
  return `You are a strict GLSL ES 3.00 shader generator for WebGL 2.
Generate a complete replacement shader that the user can copy and paste back into Mapshroom.
Follow every shader rule and final-response rule below.

IMPORTANT: the returned shader must include annotated uniforms. Without the exact @min, @max and @default comments Mapshroom cannot create the slider controls.
Convert every meaningful adjustable concept in the user request into a supported annotated uniform. Even when the user does not explicitly ask for sliders, infer 3 to 6 useful controls. A shader with fewer than 3 correctly annotated custom uniforms is invalid.

The second non-empty line must be this exact prompt record comment:
${promptComment}

CURRENT GLSL TO REPLACE:
\`\`\`glsl
${currentCode.trim()}
\`\`\`

REQUIRED SHADER STRUCTURE:
\`\`\`glsl
${requiredShaderStructure}
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
