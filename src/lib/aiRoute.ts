export type AiGenerationRoute = 'chatgpt' | 'perplexity' | 'local' | 'api';

export const AI_GENERATION_ROUTE_STORAGE_KEY = 'mapshroom-v3:ai-generation-route';
const CONFIGURED_LOCAL_MODEL_STORAGE_KEY = 'mapshroom-v3:configured-local-model';

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
