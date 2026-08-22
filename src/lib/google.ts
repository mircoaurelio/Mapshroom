import {
  DEFAULT_GOOGLE_API_VERSION,
  SHADER_GENERATION_TEMPERATURE,
} from '../config';
import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import type { ShaderRequestOptions } from './openai';
import {
  AI_MINIMUM_UI_UNIFORM_COUNT,
  extractGlslCode,
  validateGeneratedShader,
} from './shader';
import { isTauri } from './desktop/index.ts';
import { fetchJson } from './desktopHttp';
import { hasStoredCloudApiKey } from './desktopSecrets';

async function requestGoogleViaDesktopProxy({
  model,
  prompt,
  currentCode,
  chatHistory,
  stageImage,
}: Omit<ShaderRequestOptions, 'apiKey'>): Promise<string> {
  const userMessage = buildShaderMutationPrompt(prompt, currentCode);
  const imagePart = stageImage?.startsWith('data:image/')
    ? {
        inline_data: {
          mime_type: stageImage.slice(5, stageImage.indexOf(';')),
          data: stageImage.slice(stageImage.indexOf(',') + 1),
        },
      }
    : null;
  const contents = [
    ...(chatHistory ?? []).slice(-10).map((turn) => ({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    })),
    {
      role: 'user',
      parts: [
        ...(imagePart ? [imagePart] : []),
        {
          text: imagePart
            ? `${userMessage}\n\nUse the attached current stage frame as visual context.`
            : userMessage,
        },
      ],
    },
  ];

  // No API key in the URL — the desktop proxy appends it from Credential Manager.
  const url = `https://generativelanguage.googleapis.com/${DEFAULT_GOOGLE_API_VERSION}/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetchJson(url, {
    method: 'POST',
    provider: 'google',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SHADER_SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: SHADER_GENERATION_TEMPERATURE,
        maxOutputTokens: 4096,
        responseMimeType: 'text/plain',
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `Google AI request failed with status ${response.status}.`,
    );
  }

  const text =
    payload?.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim())
      .filter(Boolean)
      .join('\n')
      .trim() ?? '';

  if (!text) {
    throw new Error('Google AI returned no shader content.');
  }

  return validateGeneratedShader(extractGlslCode(text), {
    minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    prompt,
  });
}

export async function requestGoogleShaderMutation(
  options: ShaderRequestOptions,
): Promise<string> {
  if (!hasStoredCloudApiKey(options.apiKey)) {
    throw new Error('Add a Google AI API key before using Gemini shader generation.');
  }

  if (isTauri()) {
    return requestGoogleViaDesktopProxy({
      model: options.model,
      prompt: options.prompt,
      currentCode: options.currentCode,
      chatHistory: options.chatHistory,
      stageImage: options.stageImage,
    });
  }

  const trimmedKey = options.apiKey.trim();
  const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
  const client = new GoogleGenAI({
    apiKey: trimmedKey,
    apiVersion: DEFAULT_GOOGLE_API_VERSION,
  });
  const thinkingLevel = options.model.includes('flash-lite')
    ? ThinkingLevel.LOW
    : ThinkingLevel.MEDIUM;

  const history = options.chatHistory ?? [];
  const recentHistory = history.slice(-10);
  const historyContents = recentHistory.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const userMessage = buildShaderMutationPrompt(options.prompt, options.currentCode);
  const imagePart = options.stageImage?.startsWith('data:image/')
    ? {
        inlineData: {
          mimeType: options.stageImage.slice(5, options.stageImage.indexOf(';')),
          data: options.stageImage.slice(options.stageImage.indexOf(',') + 1),
        },
      }
    : null;
  const contents = [
    ...historyContents,
    {
      role: 'user' as const,
      parts: [
        ...(imagePart ? [imagePart] : []),
        {
          text: imagePart
            ? `${userMessage}\n\nUse the attached current stage frame as visual context.`
            : userMessage,
        },
      ],
    },
  ];

  const response = await client.models
    .generateContent({
      model: options.model,
      contents,
      config: {
        systemInstruction: SHADER_SYSTEM_PROMPT,
        responseMimeType: 'text/plain',
        temperature: SHADER_GENERATION_TEMPERATURE,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingLevel,
        },
      },
    })
    .catch((error: unknown) => {
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

  return validateGeneratedShader(extractGlslCode(text), {
    minimumUiUniformCount: AI_MINIMUM_UI_UNIFORM_COUNT,
    prompt: options.prompt,
  });
}
