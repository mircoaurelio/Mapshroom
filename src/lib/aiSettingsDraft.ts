import type { AiSettings } from '../types.ts';
import type { AiGenerationRoute } from './aiRoute.ts';

export type SaveAiSetting = (
  field: keyof AiSettings,
  value: string | boolean,
) => boolean | void | Promise<boolean | void>;

export function normalizeAiSettingsDraft(
  draft: AiSettings,
  route: AiGenerationRoute,
): AiSettings {
  return {
    ...draft,
    openaiApiKey: draft.openaiApiKey.trim(),
    anthropicApiKey: draft.anthropicApiKey.trim(),
    googleApiKey: draft.googleApiKey.trim(),
    openaiShaderModel: draft.openaiShaderModel.trim(),
    anthropicShaderModel: draft.anthropicShaderModel.trim(),
    googleShaderModel: draft.googleShaderModel.trim(),
    shaderRuntime:
      route === 'api' ? 'api' : route === 'local' ? 'local' : 'chat',
  };
}

// Save credentials first. A failed credential write must not activate an unconfigured provider.
export async function saveAiSettingsDraft(
  current: AiSettings,
  draft: AiSettings,
  save: SaveAiSetting,
) {
  const fields = [
    'openaiApiKey',
    'anthropicApiKey',
    'googleApiKey',
    'openaiShaderModel',
    'anthropicShaderModel',
    'googleShaderModel',
    'localShaderModel',
    'visionEnabled',
    'shaderProvider',
    'shaderRuntime',
  ] as const;
  for (const field of fields) {
    if (
      draft[field] !== current[field] &&
      (await save(field, draft[field])) === false
    ) {
      throw new Error(
        'Your changes could not be saved. Check storage access on this device and try again.',
      );
    }
  }
}
