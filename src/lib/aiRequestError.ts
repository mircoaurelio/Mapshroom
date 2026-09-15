/** Preserve provider status and error codes until the UI can explain the failure. */
export class AiProviderError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, details: unknown) {
    const body = details as { error?: { message?: unknown } } | null;
    super(typeof body?.error?.message === 'string' ? body.error.message : `AI request failed with status ${status}.`);
    this.name = 'AiProviderError';
    this.status = status;
    this.details = details;
  }
}

export type AiRequestErrorKind = 'key' | 'billing' | 'quota' | 'model' | 'permission' | 'rate_limit' | 'network' | 'timeout' | 'unavailable' | 'request' | 'unknown';

/** Never display raw provider payloads: they can contain JSON, URLs or credentials. */
export function explainAiRequestError(error: unknown, local = false): { kind: AiRequestErrorKind; message: string } {
  const messages: string[] = [];
  const statuses: number[] = [];
  const seen = new Set<object>();
  const collect = (value: unknown, depth = 0): void => {
    if (depth > 6 || value == null) return;
    if (typeof value === 'string') {
      messages.push(value.toLowerCase());
      try { collect(JSON.parse(value), depth + 1); } catch { /* Plain SDK messages are also supported. */ }
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { value.forEach(item => collect(item, depth + 1)); return; }
    const data = value as Record<string, unknown>;
    for (const field of ['status', 'statusCode', 'code']) {
      const status = Number(data[field]);
      if (status >= 400 && status <= 599) statuses.push(status);
    }
    for (const field of ['message', 'code', 'type', 'status', 'reason', 'name', 'error', 'details', 'cause']) {
      collect(data[field], depth + 1);
    }
  };
  collect(error);
  const text = messages.join(' ');
  const hasStatus = (status: number) => statuses.includes(status) || new RegExp(`\\bstatus\\s+${status}\\b`).test(text);

  if (hasStatus(401) || /invalid[_ -]?(api[_ -]?)?key|api[_ -]?key.*(?:not valid|expired|revoked|rejected)|incorrect api key|authentication_error|unauthenticated/.test(text)) {
    return { kind: 'key', message: 'API key not accepted. Check or replace the key for this provider in AI settings, then retry.' };
  }
  if (hasStatus(402) || /billing_error|billing_hard_limit|billing_not_active|credit balance|insufficient (?:credits|funds)|payment required|spend(?:ing)? limit/.test(text)) {
    return { kind: 'billing', message: 'API billing or credit limit reached. Check your provider’s credit balance and billing settings, then retry.' };
  }
  if (/insufficient_quota|exceeded your current quota|daily (?:quota|limit)|per[ _-]?day|quota.*(?:limit.?\s*0|exhausted)/.test(text)) {
    return { kind: 'quota', message: 'API quota exhausted. Check your provider’s usage limits and billing, or wait for the quota to reset, then retry.' };
  }
  if (hasStatus(404) || (!statuses.some(status => status >= 500) && /model_not_found|model.*(?:not found|not available|unavailable|does not exist|do not have access|not supported|unsupported)|unsupported.*model/.test(text))) {
    return { kind: 'model', message: 'Model unavailable for this API key. Check the model name or choose another model in AI settings, then retry.' };
  }
  if (hasStatus(403) || /permission_denied|permission_error|access denied|forbidden/.test(text)) {
    return { kind: 'permission', message: 'API access denied. Check the key’s permissions and model access with your provider, then retry.' };
  }
  if (hasStatus(429) || /rate_limit|rate limit|too many requests|resource_exhausted/.test(text)) {
    return { kind: 'rate_limit', message: 'API request limit reached. Wait a moment, then retry. If it continues, check your provider’s usage limits.' };
  }
  if (hasStatus(408) || hasStatus(504) || /timeout|timed out|deadline_exceeded/.test(text)) {
    return { kind: 'timeout', message: 'The model took too long to respond. Wait a moment, then retry.' };
  }
  if (/failed to fetch|fetch failed|network|could not be reached|load failed|connection|cors/.test(text)) {
    return { kind: 'network', message: 'Could not reach the AI service. Check your connection and browser privacy settings, then retry.' };
  }
  if (statuses.some(status => status >= 500) || /overloaded|temporarily unavailable|internal_server_error/.test(text)) {
    return { kind: 'unavailable', message: 'The AI service is temporarily unavailable. Wait a moment, then retry.' };
  }
  if (hasStatus(400) || hasStatus(413) || hasStatus(422) || /invalid_request|context_length|too many tokens/.test(text)) {
    return { kind: 'request', message: 'The model could not accept this request. Try a shorter prompt or choose another model in AI settings.' };
  }
  return { kind: 'unknown', message: local
    ? 'The local model could not complete this request. Retry or choose another local model in AI settings.'
    : 'The AI could not complete this request. Retry, or check the provider and model in AI settings if it continues.' };
}
