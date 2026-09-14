import { extractGlslCode } from './shader.ts';
import { extractShaderApplyLinkFromText } from './shaderApplyLink.ts';

type ClipboardPasteResult = { applied: true } | { applied: false; code: string; error?: string };

export function containsShaderReply(text: string): boolean {
  // The outgoing prompt contains both the old shader and an example. Neither is a reply.
  if (/^You are a strict GLSL ES 3\.00 shader generator\b/i.test(text.trim()) ||
      (/CURRENT GLSL TO REPLACE:/.test(text) && /REQUIRED SHADER STRUCTURE:/.test(text))) return false;
  if (extractShaderApplyLinkFromText(text)) return true;
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const code = extractGlslCode(withoutComments);
  return /\b(?:vec4\s+processColor|void\s+(?:main|mainImage))\s*\([^)]*\)\s*\{/.test(code);
}

export async function pasteExternalShader(
  readClipboard: () => Promise<string>,
  applyCode: (code: string) => Promise<void>,
  signal?: AbortSignal,
): Promise<ClipboardPasteResult> {
  let text: string;
  try {
    text = (await readClipboard()).trim();
  } catch {
    return { applied: false, code: '' };
  }
  if (signal?.aborted || !text || !containsShaderReply(text)) return { applied: false, code: '' };
  try {
    // Preserve the whole response so existing extraction and project/link validation still run.
    await applyCode(text);
    return { applied: true };
  } catch (reason) {
    return {
      applied: false,
      code: text,
      error: reason instanceof Error ? reason.message : 'Impossibile applicare il codice. Controlla la risposta e riprova.',
    };
  }
}
