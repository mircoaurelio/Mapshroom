import { desktopProxyHttp, isTauri, type CredentialProvider } from './desktop/index.ts';
import { stripSecretHeaders } from './desktopSecrets.ts';

export async function fetchJson(
  url: string,
  init: RequestInit & { provider?: CredentialProvider } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const { provider, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);

  if (isTauri()) {
    if (!provider) {
      throw new Error('Desktop network requests must use a credential provider.');
    }
    const headerObject: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObject[key] = value;
    });
    const response = await desktopProxyHttp({
      url,
      method: requestInit.method ?? 'GET',
      headers: stripSecretHeaders(headerObject),
      body: typeof requestInit.body === 'string' ? requestInit.body : undefined,
      provider,
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => JSON.parse(response.body || 'null'),
    };
  }

  const response = await fetch(url, requestInit);
  return {
    ok: response.ok,
    status: response.status,
    json: async () => response.json(),
  };
}
