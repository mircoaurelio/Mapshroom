import type { AiSettings, ShaderChatTurn } from '../types';
import { requestAnthropicShaderMutation } from './anthropic';
import { requestGoogleShaderMutation } from './google';
import { requestLocalShaderMutation } from './localAi';
import { requestOpenAiShaderMutation } from './openai';
import { embedShaderPromptComment } from './shaderPromptMetadata';

interface ShaderMutationRequest {
  settings: AiSettings;
  prompt: string;
  recordedPrompt?: string;
  currentCode: string;
  chatHistory?: ShaderChatTurn[];
  stageImage?: string;
}

export async function requestShaderMutation({
  settings,
  prompt,
  recordedPrompt,
  currentCode,
  chatHistory,
  stageImage,
}: ShaderMutationRequest): Promise<string> {
  let generatedCode: string;
  if (settings.shaderRuntime === 'local') {
    if (!settings.localShaderModel) throw new Error('Choose and download a local shader model first.');
    generatedCode = await requestLocalShaderMutation({ modelId: settings.localShaderModel, prompt, currentCode, stageImage, visionEnabled: settings.visionEnabled });
  } else if (settings.shaderRuntime === 'chat') {
    throw new Error('Copy this request to your AI chat, then paste its shader reply into Mapshroom.');
  } else if (settings.shaderProvider === 'openai') {
    generatedCode = await requestOpenAiShaderMutation({
      apiKey: settings.openaiApiKey,
      model: settings.openaiShaderModel,
      prompt,
      currentCode,
      chatHistory,
      stageImage: settings.visionEnabled ? stageImage : undefined,
    });
  } else if (settings.shaderProvider === 'anthropic') {
    generatedCode = await requestAnthropicShaderMutation({
      apiKey: settings.anthropicApiKey,
      model: settings.anthropicShaderModel,
      prompt,
      currentCode,
      chatHistory,
      stageImage: settings.visionEnabled ? stageImage : undefined,
    });
  } else {
    generatedCode = await requestGoogleShaderMutation({
      apiKey: settings.googleApiKey,
      model: settings.googleShaderModel,
      prompt,
      currentCode,
      chatHistory,
      stageImage: settings.visionEnabled ? stageImage : undefined,
    });
  }

  return embedShaderPromptComment(generatedCode, recordedPrompt ?? prompt);
}
