import type { GrowthEnv } from '../types';
import { getClientIp } from '../http';

export async function verifyTurnstile(
  env: GrowthEnv,
  request: Request,
  token: string | null | undefined,
): Promise<boolean> {
  if (env.TURNSTILE_ENABLED === '0' || env.TURNSTILE_ENABLED === 'false') {
    return true;
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    // Misconfigured production: fail closed for mutating public endpoints.
    return false;
  }
  if (!token) {
    return false;
  }

  const body = new URLSearchParams();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  body.set('remoteip', getClientIp(request));

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    if (!response.ok) {
      return false;
    }
    const result = (await response.json()) as { success?: boolean };
    return Boolean(result.success);
  } catch {
    return false;
  }
}
