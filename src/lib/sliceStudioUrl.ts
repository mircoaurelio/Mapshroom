export function getSliceStudioUrl(): string {
  const baseUrl = import.meta.env.BASE_URL;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL('slider/', new URL(normalizedBase, window.location.origin)).href;
}
