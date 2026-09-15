import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import {
  AI_MINIMUM_UI_UNIFORM_COUNT,
  extractGlslCode,
  validateGeneratedShader,
} from './shader';
import { fetchJson } from './desktopHttp';
import { hasStoredCloudApiKey } from './desktopSecrets';
import { isTauri } from './desktop/index.ts';

import type { ShaderRequestOptions } from './openai';
import { AiProviderError } from './aiRequestError';

interface AnthropicPayload {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

function imageSource(stageImage: string) {
  const match = stageImage.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) return null;
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: match[1],
      data: match[2],
    },
  };
}

export async function requestAnthropicShaderMutation({
  apiKey,
  model,
  prompt,
  currentCode,
  chatHistory,
  stageImage,
}: ShaderRequestOptions): Promise<string> {
  if (!hasStoredCloudApiKey(apiKey)) {
    throw new Error('Add an Anthropic API key before using Shader AI.');
  }

  const image = stageImage ? imageSource(stageImage) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (!isTauri()) {
    headers['x-api-key'] = apiKey.trim();
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const response = await fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    provider: 'anthropic',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SHADER_SYSTEM_PROMPT,
      messages: [
        ...(chatHistory ?? []).slice(-10).map((turn) => ({
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.text,
        })),
        {
          role: 'user',
          content: [
            ...(image ? [image] : []),
            { type: 'text', text: buildShaderMutationPrompt(prompt, currentCode) },
          ],
        },
      ],
    }),
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error('Anthropic could not be reached from this browser. Check the network connection or the browser privacy settings.');
    }
    throw error;
  });

  const payload = await response.json().catch(() => null) as AnthropicPayload | null;
  if (!response.ok) {
    throw new AiProviderError(response.status, payload);
  }
  const text = payload?.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text?.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!text) throw new Error('Anthropic returned no shader content.');
  return validateGeneratedShader(extractGlslCode(text), {
    minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    prompt,
  });
}
