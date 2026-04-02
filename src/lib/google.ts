import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import { extractGlslCode } from './shader';
import type { ShaderRequestOptions } from './openai';

interface GeminiPayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function extractTextFromGeminiPayload(payload: GeminiPayload): string {
  const textChunks =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim())
      .filter(Boolean) ?? [];

  return textChunks.join('\n').trim();
}

export async function requestGoogleShaderMutation({
  apiKey,
  model,
  prompt,
  currentCode,
}: ShaderRequestOptions): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Add a Google AI API key before using Gemini shader generation.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': trimmedKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SHADER_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Request: ${prompt}\n\nCurrent GLSL:\n\`\`\`glsl\n${currentCode}\n\`\`\``,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    },
  ).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(
        'Google AI could not be reached from this browser. Check the network connection or move the call behind a backend proxy.',
      );
    }
    throw error;
  });

  const payload = (await response.json().catch(() => null)) as GeminiPayload | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      `Google AI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error('Google AI returned an empty response.');
  }

  const text = extractTextFromGeminiPayload(payload);
  if (!text) {
    throw new Error('Google AI returned no shader content.');
  }

  return extractGlslCode(text);
}
