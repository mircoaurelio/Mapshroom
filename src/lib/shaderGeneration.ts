import type { AiSettings, ShaderProvider } from '../types';
import { requestGoogleShaderMutation } from './google';
import { requestOpenAiShaderMutation } from './openai';

interface ShaderMutationRequest {
  settings: AiSettings;
  prompt: string;
  currentCode: string;
}

export function getShaderProviderLabel(provider: ShaderProvider): string {
  return provider === 'google' ? 'Google Gemini' : 'OpenAI';
}

export function getActiveShaderModel(settings: AiSettings): string {
  return settings.shaderProvider === 'google'
    ? settings.googleShaderModel
    : settings.openaiShaderModel;
}

export async function requestShaderMutation({
  settings,
  prompt,
  currentCode,
}: ShaderMutationRequest): Promise<string> {
  if (settings.shaderProvider === 'google') {
    return requestGoogleShaderMutation({
      apiKey: settings.googleApiKey,
      model: settings.googleShaderModel,
      prompt,
      currentCode,
    });
  }

  return requestOpenAiShaderMutation({
    apiKey: settings.openaiApiKey,
    model: settings.openaiShaderModel,
    prompt,
    currentCode,
  });
}
