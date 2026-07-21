import type { AiSettings, ShaderChatTurn } from '../types';
import { requestGoogleShaderMutation } from './google';
import { requestLocalShaderMutation } from './localAi';

interface ShaderMutationRequest {
  settings: AiSettings;
  prompt: string;
  currentCode: string;
  chatHistory?: ShaderChatTurn[];
  stageImage?: string;
}

export async function requestShaderMutation({
  settings,
  prompt,
  currentCode,
  chatHistory,
  stageImage,
}: ShaderMutationRequest): Promise<string> {
  if (settings.shaderRuntime === 'local') {
    if (!settings.localShaderModel) throw new Error('Choose and download a local shader model first.');
    return requestLocalShaderMutation({ modelId: settings.localShaderModel, prompt, currentCode, stageImage, visionEnabled: settings.visionEnabled });
  }
  return requestGoogleShaderMutation({
    apiKey: settings.googleApiKey,
    model: settings.googleShaderModel,
    prompt,
    currentCode,
    chatHistory,
    stageImage: settings.visionEnabled ? stageImage : undefined,
  });
}
