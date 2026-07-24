export type ShaderApplyTrigger = 'generate' | 'fix' | 'quick_add';

export interface PendingShaderApplyRequest {
  version: 1;
  requestId: string;
  sessionId: string;
  targetShaderId: string;
  prompt: string;
  historyPrompt: string;
  currentCode: string;
  trigger: ShaderApplyTrigger;
  createdAt: string;
}

export interface ShaderApplyLinkPayload {
  sessionId: string;
  targetShaderId: string;
  requestId: string;
  code: string;
}

interface CreateShaderApplyLinkPrefixOptions {
  appUrl: string;
  sessionId: string;
  targetShaderId: string;
  requestId: string;
}

const PENDING_REQUEST_STORAGE_KEY = 'mapshroom-v3:pending-shader-apply-requests';
const PENDING_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING_REQUESTS = 20;
const MAX_SHADER_CODE_LENGTH = 120_000;
const LINK_PARAM_NAMES = ['applyShader', 'session', 'shader', 'request', 'code'] as const;

function getLinkParams(url: URL): URLSearchParams {
  if (url.searchParams.has('applyShader')) {
    return url.searchParams;
  }

  const queryIndex = url.hash.indexOf('?');
  return queryIndex >= 0
    ? new URLSearchParams(url.hash.slice(queryIndex + 1))
    : new URLSearchParams();
}

function validateLinkIdentifier(value: string | null, label: string): string {
  const trimmed = value?.trim() ?? '';
  const hasControlCharacter = Array.from(trimmed).some(
    (character) => character.charCodeAt(0) < 32,
  );
  if (!trimmed || trimmed.length > 200 || hasControlCharacter) {
    throw new Error(`The shader link has an invalid ${label}.`);
  }
  return trimmed;
}

function loadPendingRequests(): PendingShaderApplyRequest[] {
  try {
    const raw = localStorage.getItem(PENDING_REQUEST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PendingShaderApplyRequest[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    const oldestAllowedTimestamp = Date.now() - PENDING_REQUEST_TTL_MS;
    return parsed
      .filter(
        (request): request is PendingShaderApplyRequest =>
          request?.version === 1 &&
          typeof request.requestId === 'string' &&
          typeof request.sessionId === 'string' &&
          typeof request.targetShaderId === 'string' &&
          typeof request.prompt === 'string' &&
          typeof request.historyPrompt === 'string' &&
          typeof request.currentCode === 'string' &&
          (request.trigger === 'generate' ||
            request.trigger === 'fix' ||
            request.trigger === 'quick_add') &&
          typeof request.createdAt === 'string' &&
          Date.parse(request.createdAt) >= oldestAllowedTimestamp,
      )
      .slice(0, MAX_PENDING_REQUESTS);
  } catch {
    return [];
  }
}

function savePendingRequests(requests: PendingShaderApplyRequest[]): void {
  try {
    localStorage.setItem(
      PENDING_REQUEST_STORAGE_KEY,
      JSON.stringify(requests.slice(0, MAX_PENDING_REQUESTS)),
    );
  } catch {
    // The link still contains enough context to apply the shader. Request metadata
    // only improves history labels and analytics when storage is unavailable.
  }
}

export function savePendingShaderApplyRequest(request: PendingShaderApplyRequest): void {
  const requests = loadPendingRequests();
  savePendingRequests([
    request,
    ...requests.filter((item) => item.requestId !== request.requestId),
  ]);
}

export function loadPendingShaderApplyRequest(
  requestId: string,
): PendingShaderApplyRequest | null {
  return loadPendingRequests().find((request) => request.requestId === requestId) ?? null;
}

export function removePendingShaderApplyRequest(requestId: string): void {
  savePendingRequests(
    loadPendingRequests().filter((request) => request.requestId !== requestId),
  );
}

export function createShaderApplyLinkPrefix({
  appUrl,
  sessionId,
  targetShaderId,
  requestId,
}: CreateShaderApplyLinkPrefixOptions): string {
  const url = new URL(appUrl);
  url.search = '';
  const params = new URLSearchParams();
  params.set('applyShader', '1');
  params.set('session', sessionId);
  params.set('shader', targetShaderId);
  params.set('request', requestId);
  url.hash = `#/?${params.toString()}&code=`;
  return url.toString();
}

export function parseShaderApplyLink(urlValue: string | URL): ShaderApplyLinkPayload | null {
  const url = typeof urlValue === 'string' ? new URL(urlValue) : urlValue;
  const params = getLinkParams(url);
  if (params.get('applyShader') !== '1') {
    return null;
  }

  const sessionId = validateLinkIdentifier(params.get('session'), 'project session');
  const targetShaderId = validateLinkIdentifier(params.get('shader'), 'target shader');
  const requestId = validateLinkIdentifier(params.get('request'), 'request ID');
  const code = params.get('code')?.replace(/\r\n/g, '\n').trim() ?? '';

  if (!code) {
    throw new Error('The shader link does not contain shader code.');
  }
  if (code.length > MAX_SHADER_CODE_LENGTH) {
    throw new Error('The shader in this link is too large to apply.');
  }

  return {
    sessionId,
    targetShaderId,
    requestId,
    code,
  };
}

export function extractShaderApplyLinkFromText(text: string): ShaderApplyLinkPayload | null {
  const candidates = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.replace(/[),.;]+$/, '');
    try {
      const payload = parseShaderApplyLink(normalizedCandidate);
      if (payload) {
        return payload;
      }
    } catch {
      // Keep looking so explanatory text containing an incomplete URL does not
      // prevent a later valid Mapshroom link from being used.
    }
  }

  return null;
}

export function stripShaderApplyParamsFromUrl(): void {
  const url = new URL(window.location.href);

  for (const paramName of LINK_PARAM_NAMES) {
    url.searchParams.delete(paramName);
  }

  const queryIndex = url.hash.indexOf('?');
  if (queryIndex >= 0) {
    const hashPath = url.hash.slice(0, queryIndex) || '#/';
    const hashParams = new URLSearchParams(url.hash.slice(queryIndex + 1));
    for (const paramName of LINK_PARAM_NAMES) {
      hashParams.delete(paramName);
    }
    const remainingParams = hashParams.toString();
    url.hash = remainingParams ? `${hashPath}?${remainingParams}` : hashPath;
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash || '#/'}`);
}
