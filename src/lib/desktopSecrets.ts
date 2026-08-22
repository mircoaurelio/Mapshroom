import {
  deleteDesktopCredential,
  getDesktopCredentialStatus,
  isTauri,
  saveDesktopCredential,
  type CredentialProvider,
} from './desktop/index.ts';

/** In-memory / UI marker that a cloud key exists in the OS keyring. Never a real secret. */
export const DESKTOP_KEYRING_SENTINEL = '__MAPSHROOM_DESKTOP_KEYRING__';

const SECRET_HEADER_NAMES = new Set([
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'api-key',
]);

export function isDesktopKeyringSentinel(value: string | null | undefined): boolean {
  return value === DESKTOP_KEYRING_SENTINEL;
}

export function hasStoredCloudApiKey(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return false;
  }
  return isTauri() ? isDesktopKeyringSentinel(trimmed) : !isDesktopKeyringSentinel(trimmed);
}

export function providerForAiKeyField(
  field: string,
): CredentialProvider | null {
  if (field === 'openaiApiKey') return 'openai';
  if (field === 'anthropicApiKey') return 'anthropic';
  if (field === 'googleApiKey') return 'google';
  return null;
}

export function scrubApiKeysFromSettings<T extends {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  runwayApiKey?: string;
}>(settings: T): T {
  return {
    ...settings,
    openaiApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    runwayApiKey: '',
  };
}

export function stripSecretHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SECRET_HEADER_NAMES.has(key.toLowerCase())) {
      continue;
    }
    next[key] = value;
  }
  return next;
}

export async function persistCloudApiKey(
  provider: CredentialProvider,
  secret: string,
): Promise<string> {
  const trimmed = secret.trim();
  if (isTauri()) {
    if (!trimmed || isDesktopKeyringSentinel(trimmed)) {
      await deleteDesktopCredential(provider);
      return '';
    }
    await saveDesktopCredential(provider, trimmed);
    return DESKTOP_KEYRING_SENTINEL;
  }
  return trimmed;
}

export async function loadDesktopKeyringMarkers(): Promise<{
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
}> {
  if (!isTauri()) {
    return { openaiApiKey: '', anthropicApiKey: '', googleApiKey: '' };
  }

  const [openai, anthropic, google] = await Promise.all([
    getDesktopCredentialStatus('openai'),
    getDesktopCredentialStatus('anthropic'),
    getDesktopCredentialStatus('google'),
  ]);

  return {
    openaiApiKey: openai ? DESKTOP_KEYRING_SENTINEL : '',
    anthropicApiKey: anthropic ? DESKTOP_KEYRING_SENTINEL : '',
    googleApiKey: google ? DESKTOP_KEYRING_SENTINEL : '',
  };
}

export async function migrateBrowserKeysToDesktopKeyring(keys: {
  openai?: string | null;
  anthropic?: string | null;
  google?: string | null;
}): Promise<{
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
}> {
  if (!isTauri()) {
    return {
      openaiApiKey: keys.openai?.trim() ?? '',
      anthropicApiKey: keys.anthropic?.trim() ?? '',
      googleApiKey: keys.google?.trim() ?? '',
    };
  }

  const migrate = async (
    provider: CredentialProvider,
    value: string | null | undefined,
  ): Promise<string> => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed || isDesktopKeyringSentinel(trimmed)) {
      const present = await getDesktopCredentialStatus(provider);
      return present ? DESKTOP_KEYRING_SENTINEL : '';
    }
    await saveDesktopCredential(provider, trimmed);
    return DESKTOP_KEYRING_SENTINEL;
  };

  return {
    openaiApiKey: await migrate('openai', keys.openai),
    anthropicApiKey: await migrate('anthropic', keys.anthropic),
    googleApiKey: await migrate('google', keys.google),
  };
}
