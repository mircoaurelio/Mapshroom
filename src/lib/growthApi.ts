export type SignupSource =
  | 'desktop_download'
  | 'newsletter'
  | 'pro_beta'
  | 'profile_register'
  | 'feedback';

export type PublicGrowthUser = {
  id: string;
  emailMasked: string;
  verified: boolean;
  marketingOptIn: boolean;
  marketingConfirmed: boolean;
  locale: string;
  source: string;
};

export type GrowthApiError = {
  code: string;
  message: string;
};

export type GrowthApiResult<T> = { ok: true; data: T } | { ok: false; error: GrowthApiError };

function apiBase(): string {
  return '';
}

async function parseResult<T>(response: Response): Promise<GrowthApiResult<T>> {
  let payload: {
    ok?: boolean;
    error?: GrowthApiError;
  } & Record<string, unknown>;
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return {
      ok: false,
      error: { code: 'invalid_response', message: 'Unexpected server response.' },
    };
  }

  if (!response.ok || payload.ok === false) {
    return {
      ok: false,
      error: payload.error || {
        code: 'request_failed',
        message: 'Request failed. Please try again.',
      },
    };
  }

  return { ok: true, data: payload as T };
}

export async function growthSignup(input: {
  email: string;
  marketingOptIn: boolean;
  source: SignupSource;
  locale: string;
  turnstileToken?: string;
  utm?: { utm_source?: string; utm_medium?: string; utm_campaign?: string };
}): Promise<GrowthApiResult<{ queued: boolean; message: string }>> {
  const response = await fetch(`${apiBase()}/api/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      marketingOptIn: input.marketingOptIn,
      source: input.source,
      locale: input.locale,
      turnstileToken: input.turnstileToken,
      ...input.utm,
    }),
  });
  return parseResult(response);
}

export async function growthPeekVerify(
  token: string,
): Promise<GrowthApiResult<{ status: 'ready' | 'invalid' | 'expired' | 'consumed' }>> {
  const response = await fetch(`${apiBase()}/api/verify?token=${encodeURIComponent(token)}`, {
    credentials: 'include',
  });
  return parseResult(response);
}

export async function growthConfirmVerify(
  token: string,
): Promise<
  GrowthApiResult<{
    user: PublicGrowthUser;
    downloadGrant: string | null;
    downloadReady: boolean;
  }>
> {
  const response = await fetch(`${apiBase()}/api/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return parseResult(response);
}

export async function growthResend(input: {
  email: string;
  locale: string;
  turnstileToken?: string;
}): Promise<GrowthApiResult<{ queued: boolean; message: string }>> {
  const response = await fetch(`${apiBase()}/api/resend`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResult(response);
}

export async function growthSession(): Promise<GrowthApiResult<{ user: PublicGrowthUser | null }>> {
  const response = await fetch(`${apiBase()}/api/session`, { credentials: 'include' });
  return parseResult(response);
}

export async function growthSetPreferences(input: {
  marketingOptIn: boolean;
}): Promise<GrowthApiResult<{ user: PublicGrowthUser | null }>> {
  const response = await fetch(`${apiBase()}/api/preferences`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResult(response);
}

export async function growthDeleteAccount(): Promise<GrowthApiResult<{ deleted: boolean }>> {
  const response = await fetch(`${apiBase()}/api/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  return parseResult(response);
}

export async function growthSubmitFeedback(input: {
  category: 'bug' | 'feature' | 'praise' | 'other';
  rating?: number;
  message: string;
  email?: string;
  appVersion?: string;
  surface?: string;
  route?: string;
  turnstileToken?: string;
}): Promise<GrowthApiResult<{ received: boolean }>> {
  const response = await fetch(`${apiBase()}/api/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResult(response);
}

export async function growthIssueDownloadGrant(): Promise<
  GrowthApiResult<{ grant: string; downloadUrl: string }>
> {
  const response = await fetch(`${apiBase()}/api/download-grant`, { credentials: 'include' });
  return parseResult(response);
}

export function readUtmFromLocation(search = window.location.search): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  const params = new URLSearchParams(search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

export function getTurnstileSiteKey(): string {
  const configured = (import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  if (configured) return configured;
  // This is a public widget identifier, not the server secret. Keep production
  // signup working when a GitHub/Cloudflare build has no local .env file.
  return typeof window !== 'undefined' && /(^|\.)mapshroom\.dev$/.test(window.location.hostname)
    ? '0x4AAAAAAEXkG-2KML7X6LiW' : '';
}
