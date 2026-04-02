import type { AiSettings } from '../types';
import { requestGoogleShaderMutation } from './google';
import { requestOpenAiShaderMutation } from './openai';

interface ShaderMutationRequest {
  settings: AiSettings;
  prompt: string;
  currentCode: string;
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
