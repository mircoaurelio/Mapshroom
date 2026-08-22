export const OFFICIAL_ANALYTICS_HOSTS = ['mapshroom.dev', 'www.mapshroom.dev'] as const;

export const PUBLIC_CONTENT_PATHS = [
  '/tutorial',
  '/why',
  '/shader',
  '/creatorchallenge',
] as const;

export const ANALYTICS_CONSENT_LATER_KEY = 'mapshroom-v3:analytics-consent-later';

export type AnalyticsSurface = 'web' | 'pwa' | 'desktop';

export function normalizeAppPath(pathname: string, hash = ''): string {
  const fromPath = pathname.replace(/\/+$/, '') || '/';
  if (fromPath !== '/') {
    return fromPath;
  }

  const hashPath = hash.replace(/^#/, '').split('?')[0] || '/';
  return hashPath.replace(/\/+$/, '') || '/';
}

export function isPublicContentPath(pathname: string, hash = ''): boolean {
  const path = normalizeAppPath(pathname, hash);
  return PUBLIC_CONTENT_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isOfficialAnalyticsHost(
  hostname: string,
  surface: AnalyticsSurface = 'web',
): boolean {
  if (surface === 'desktop') {
    return true;
  }

  const host = hostname.replace(/\.$/, '').toLowerCase();
  return (OFFICIAL_ANALYTICS_HOSTS as readonly string[]).includes(host);
}

export function canCollectAnalytics(input: {
  hostname: string;
  pathname: string;
  hash?: string;
  surface?: AnalyticsSurface;
}): boolean {
  if (!isOfficialAnalyticsHost(input.hostname, input.surface ?? 'web')) {
    return false;
  }

  return !isPublicContentPath(input.pathname, input.hash ?? '');
}

export function shouldOfferAnalyticsConsent(input: {
  hostname: string;
  pathname: string;
  hash?: string;
  surface?: AnalyticsSurface;
}): boolean {
  if (!canCollectAnalytics(input)) {
    return false;
  }

  return normalizeAppPath(input.pathname, input.hash ?? '') === '/';
}
