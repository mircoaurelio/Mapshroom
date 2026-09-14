import type { ShaderChatTurn, ShaderVersion } from '../types';

export function getShaderChatResults(versions: ShaderVersion[], history: ShaderChatTurn[]): ShaderVersion[] {
  const returnedCodes = new Set<string>();
  let hasRequest = false;
  for (const turn of history) {
    if (turn.role === 'user') {
      hasRequest = true;
    } else if (hasRequest) {
      const text = turn.text.replace(/\r\n?/g, '\n').trim();
      const fenced = text.match(/^```(?:glsl)?\s*\n([\s\S]*?)\n```$/i);
      returnedCodes.add((fenced?.[1] ?? text).trim());
    }
  }
  return versions.filter(version =>
    returnedCodes.has(version.code.replace(/\r\n?/g, '\n').trim()) &&
    !/^(base node source|initial shader|bundled .+ preset|before restore)$/i.test(version.prompt.trim()),
  );
}
