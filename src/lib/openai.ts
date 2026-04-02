import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import { extractGlslCode } from './shader';

export interface ShaderRequestOptions {
  apiKey: string;
  model: string;
  prompt: string;
  currentCode: string;
}

interface ResponsesApiPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

function extractTextFromResponsesPayload(payload: ResponsesApiPayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textChunks =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text?.trim())
      .filter(Boolean) ?? [];

  return textChunks.join('\n').trim();
}

export async function requestOpenAiShaderMutation({
  apiKey,
  model,
  prompt,
  currentCode,
}: ShaderRequestOptions): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Add an OpenAI API key before using Shader AI.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trimmedKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1800,
      instructions: SHADER_SYSTEM_PROMPT,
      input: buildShaderMutationPrompt(prompt, currentCode),
    }),
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(
        'OpenAI could not be reached from this browser. Check the network connection or move the call behind a backend proxy.',
      );
    }
    throw error;
  });

  const payload = (await response.json().catch(() => null)) as ResponsesApiPayload | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error('OpenAI returned an empty response.');
  }

  const text = extractTextFromResponsesPayload(payload);
  if (!text) {
    throw new Error('OpenAI returned no shader content.');
  }

  return extractGlslCode(text);
}
