import type { AiSettings, ShaderChatTurn } from '../types';
import { requestAnthropicShaderMutation } from './anthropic';
import { requestGoogleShaderMutation } from './google';
import { requestLocalShaderMutation } from './localAi';
import { requestOpenAiShaderMutation } from './openai';

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
  if (settings.shaderRuntime === 'chat') {
    throw new Error('Copy this request to your AI chat, then paste its shader reply into Mapshroom.');
  }
  if (settings.shaderProvider === 'openai') {
    return requestOpenAiShaderMutation({
      apiKey: settings.openaiApiKey,
      model: settings.openaiShaderModel,
      prompt,
      currentCode,
      chatHistory,
      stageImage: settings.visionEnabled ? stageImage : undefined,
    });
  }
  if (settings.shaderProvider === 'anthropic') {
    return requestAnthropicShaderMutation({
      apiKey: settings.anthropicApiKey,
      model: settings.anthropicShaderModel,
      prompt,
      currentCode,
      chatHistory,
      stageImage: settings.visionEnabled ? stageImage : undefined,
    });
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
