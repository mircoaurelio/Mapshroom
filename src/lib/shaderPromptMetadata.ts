export const SHADER_PROMPT_COMMENT_PREFIX = '// MAPSHROOM PROMPT:';

const SHADER_PROMPT_COMMENT_PATTERN = /^\s*\/\/\s*MAPSHROOM\s+PROMPT:\s*(.*)$/i;

/**
 * Stores the creative request as JSON on one GLSL comment line. JSON keeps
 * quotes and line breaks lossless while ensuring every character remains
 * inside a comment when the shader is compiled or exported.
 */
export function formatShaderPromptComment(prompt: string): string {
  const serializedPrompt = JSON.stringify(prompt.trim())
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `${SHADER_PROMPT_COMMENT_PREFIX} ${serializedPrompt}`;
}

export function isShaderPromptCommentLine(line: string): boolean {
  return SHADER_PROMPT_COMMENT_PATTERN.test(line);
}

export function readShaderPromptComment(code: string): string | null {
  for (const line of code.replace(/\r\n/g, '\n').split('\n')) {
    const match = line.match(SHADER_PROMPT_COMMENT_PATTERN);
    if (!match) {
      continue;
    }

    const payload = match[1]?.trim() ?? '';
    if (!payload) {
      return '';
    }

    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === 'string' ? parsed : payload;
    } catch {
      // Accept comments written manually or by older AI prompts, then rewrite
      // them to the canonical JSON form the next time this shader is mutated.
      return payload;
    }
  }

  return null;
}

export function embedShaderPromptComment(code: string, prompt: string): string {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return code.trim();
  }

  const lines = code
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .filter((line) => !isShaderPromptCommentLine(line));
  const nameLineIndex = lines.findIndex((line) => /^\s*\/\/\s*NAME:/i.test(line));
  const insertAt = nameLineIndex >= 0 ? nameLineIndex + 1 : 0;
  lines.splice(insertAt, 0, formatShaderPromptComment(trimmedPrompt));

  return lines.join('\n').trim();
}
