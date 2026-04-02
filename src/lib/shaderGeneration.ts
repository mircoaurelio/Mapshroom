import type { AiSettings } from '../types';
import { requestGoogleShaderMutation } from './google';

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
  return requestGoogleShaderMutation({
    apiKey: settings.googleApiKey,
    model: settings.googleShaderModel,
    prompt,
    currentCode,
  });
}
