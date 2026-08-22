import { invokeDesktop, isTauri } from './runtime.ts';

export type CredentialProvider = 'openai' | 'anthropic' | 'google';

export async function getDesktopCredentialStatus(
  provider: CredentialProvider,
): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  const status = await invokeDesktop<{ provider: string; present: boolean }>(
    'credential_status',
    { provider },
  );
  return Boolean(status.present);
}

export async function saveDesktopCredential(
  provider: CredentialProvider,
  secret: string,
): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invokeDesktop('save_credential', { provider, secret });
}

export async function deleteDesktopCredential(
  provider: CredentialProvider,
): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invokeDesktop('delete_credential', { provider });
}

export interface DesktopHttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  provider?: CredentialProvider;
}

export interface DesktopHttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export async function desktopProxyHttp(
  request: DesktopHttpRequest,
): Promise<DesktopHttpResponse> {
  if (!isTauri()) {
    throw new Error('Desktop HTTP proxy is only available in the Tauri app.');
  }
  return invokeDesktop<DesktopHttpResponse>('proxy_http_request', { request });
}
