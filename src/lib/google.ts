import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { DEFAULT_GOOGLE_API_VERSION } from '../config';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import type { ShaderRequestOptions } from './openai';
import { extractGlslCode } from './shader';

function createGoogleClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    apiVersion: DEFAULT_GOOGLE_API_VERSION,
  });
}

function resolveThinkingLevel(model: string): ThinkingLevel {
  return model.includes('flash-lite') ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM;
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

  const client = createGoogleClient(trimmedKey);

  const response = await client.models.generateContent({
    model,
    contents: buildShaderMutationPrompt(prompt, currentCode),
    config: {
      systemInstruction: SHADER_SYSTEM_PROMPT,
      responseMimeType: 'text/plain',
      temperature: 1.0,
      maxOutputTokens: 1800,
      thinkingConfig: {
        thinkingLevel: resolveThinkingLevel(model),
      },
    },
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(
        'Google AI could not be reached from this browser. Check the network connection or move the call behind a backend proxy.',
      );
    }
    if (error instanceof Error && error.message.trim()) {
      throw new Error(error.message);
    }
    throw new Error('Google AI request failed.');
  });

  const text = response.text?.trim() ?? '';
  if (!text) {
    throw new Error('Google AI returned no shader content.');
  }

  return extractGlslCode(text);
}
