const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
]);

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254 || !EMAIL_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function emailDomain(email: string): string {
  return email.split('@')[1] ?? '';
}

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(emailDomain(email));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  if (local.length <= 2) {
    return `${local[0] ?? '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

export function addMs(ms: number, date = new Date()): string {
  return new Date(date.getTime() + ms).toISOString();
}

export function isExpired(iso: string, now = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime();
}

export function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, max);
}

export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function parseUtm(input: Record<string, unknown> | null | undefined): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  return {
    utm_source: clampText(input?.utm_source, 80) || null,
    utm_medium: clampText(input?.utm_medium, 80) || null,
    utm_campaign: clampText(input?.utm_campaign, 120) || null,
  };
}
