import type { AiSettings, ShaderChatTurn } from '../types';
import { requestGoogleShaderMutation } from './google';

interface ShaderMutationRequest {
  settings: AiSettings;
  prompt: string;
  currentCode: string;
  chatHistory?: ShaderChatTurn[];
}

export async function requestShaderMutation({
  settings,
  prompt,
  currentCode,
  chatHistory,
}: ShaderMutationRequest): Promise<string> {
  return requestGoogleShaderMutation({
    apiKey: settings.googleApiKey,
    model: settings.googleShaderModel,
    prompt,
    currentCode,
    chatHistory,
  });
}
