import type { AiSettings } from '../types.ts';
import { hasStoredCloudApiKey } from './desktopSecrets.ts';

export type AiGenerationRoute = 'chatgpt' | 'perplexity' | 'local' | 'api';

export function getCloudAiConfiguration(settings: AiSettings) {
  const fields =
    settings.shaderProvider === 'openai'
      ? (['openaiApiKey', 'openaiShaderModel'] as const)
      : settings.shaderProvider === 'anthropic'
        ? (['anthropicApiKey', 'anthropicShaderModel'] as const)
        : (['googleApiKey', 'googleShaderModel'] as const);
  return {
    key: settings[fields[0]],
    model: settings[fields[1]],
    keyField: fields[0],
    modelField: fields[1],
  };
}

export function hasConfiguredCloudAi(settings: AiSettings): boolean {
  const { key, model } = getCloudAiConfiguration(settings);
  return hasStoredCloudApiKey(key) && Boolean(model.trim());
}

/** A saved chat handoff preference must never bypass an available API. */
export function resolveAiGenerationRoute(
  settings: AiSettings,
  preferred: AiGenerationRoute | null,
): AiGenerationRoute {
  if (preferred === 'local') return 'local';
  if (hasConfiguredCloudAi(settings)) return 'api';
  if (preferred) return preferred;
  if (settings.shaderRuntime === 'api') return 'api';
  if (settings.shaderRuntime === 'local' && settings.localShaderModel)
    return 'local';
  return 'chatgpt';
}

/** New credentials are still a draft on desktop, before the keyring returns its marker. */
export function routeAfterAiSettingsEdit(
  settings: AiSettings,
  field: keyof AiSettings,
  currentRoute: AiGenerationRoute,
): AiGenerationRoute {
  const { key, model, keyField, modelField } =
    getCloudAiConfiguration(settings);
  const editsActiveProvider =
    field === 'shaderProvider' || field === keyField || field === modelField;
  return editsActiveProvider && key.trim() && model.trim()
    ? 'api'
    : currentRoute;
}

export const AI_GENERATION_ROUTE_STORAGE_KEY =
  'mapshroom-v3:ai-generation-route';
const CONFIGURED_LOCAL_MODEL_STORAGE_KEY =
  'mapshroom-v3:configured-local-model';

export function readStoredAiGenerationRoute(): AiGenerationRoute | null {
  try {
    const value = localStorage.getItem(AI_GENERATION_ROUTE_STORAGE_KEY);
    return value === 'chatgpt' ||
      value === 'perplexity' ||
      value === 'local' ||
      value === 'api'
      ? value
      : null;
  } catch {
    return null;
  }
}

export function storeAiGenerationRoute(route: AiGenerationRoute): void {
  try {
    localStorage.setItem(AI_GENERATION_ROUTE_STORAGE_KEY, route);
  } catch {
    // A private or locked-down browser may block local preferences.
  }
}

export function readConfiguredLocalModel(): string {
  try {
    return localStorage.getItem(CONFIGURED_LOCAL_MODEL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeConfiguredLocalModel(modelId: string): void {
  try {
    localStorage.setItem(CONFIGURED_LOCAL_MODEL_STORAGE_KEY, modelId);
  } catch {
    // The model can still run for the current session if preferences are blocked.
  }
}
